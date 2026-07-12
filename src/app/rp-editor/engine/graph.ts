// ─────────────────────────────────────────────────────────────────────────────
// Resource-pack dependency graph
//
// Resolves EVERY internal link, not just top-level ones:
//   blockstates → models → parent chain → the textures actually consumed
//   item definitions (1.21.4+) + legacy overrides → models → textures
//   fonts → bitmap textures · particles → textures · equipment → textures
//   atlases (directory/single/permutations) → textures  [critical, see below]
//   *.png.mcmeta ↔ its texture · sounds.json → *.ogg
//
// The atlas `directory` source is the classic false-unused trap: it stitches an
// entire folder of textures into an atlas for runtime/GUI use with NO model
// reference. Any texture a directory/single source matches is USED. We resolve
// those here so they are never mis-flagged.
// ─────────────────────────────────────────────────────────────────────────────

import type { AssetKind, AssetNode, CmdCollision, RawFile } from './types';
import {
  classify, namespaceOf, parseLoc, textureLocToPath, modelLocToPath,
  particleTexturePath, equipmentTexturePath, modelPathToLoc,
  itemDefPathToLoc, texturePathToLoc,
} from './resloc';
import {
  isStrongOverridePath, isVanillaItem, isVanillaBlock, isKnownVanillaTexture,
  VANILLA_FONTS, VANILLA_PARTICLES, VANILLA_EQUIPMENT,
} from './vanilla';

// Vanilla atlas names extend the game's built-in atlases → certain roots.
const VANILLA_ATLASES = new Set(['blocks', 'particles', 'mob_effects', 'paintings',
  'gui', 'banner_patterns', 'beds', 'chests', 'shield_patterns', 'shulker_boxes',
  'signs', 'armor_trims', 'decorated_pot', 'map_decorations']);

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Where a "used" signal originates. */
export type RootKind = 'certain' | 'uncertain';

export interface GraphRoot {
  path: string;
  kind: RootKind;
  reason: string;
}

export interface RawIssue {
  severity: 'error' | 'warning';
  category: string;
  title: string;
  detail: string;
  path?: string;
  refs?: string[];
  fix?: import('./types').BrokenRef;
}

export interface Graph {
  nodes: Record<string, AssetNode>;
  byKind: Record<AssetKind, string[]>;
  roots: Map<string, GraphRoot>;
  models: Record<string, import('./types').ModelResolution>;
  cmd: CmdCollision[];
  issues: RawIssue[];
  /** Texture path → the reason(s) it counts as used-by-convention (leaf roots). */
  conventionTextures: Map<string, string>;
  /** True if any model carries a legacy `overrides` array (pre-1.21.4 system). */
  hasLegacyOverrides: boolean;
}

const ALL_KINDS: AssetKind[] = [
  'texture', 'texture_meta', 'model', 'blockstate', 'item_definition', 'font',
  'particle', 'atlas', 'equipment', 'sound', 'sounds_json', 'lang', 'shader',
  'pack_meta', 'pack_png', 'text', 'other',
];

export function buildGraph(files: RawFile[]): Graph {
  const nodes: Record<string, AssetNode> = {};
  const byKind: Record<AssetKind, string[]> = Object.fromEntries(
    ALL_KINDS.map((k) => [k, [] as string[]]),
  ) as Record<AssetKind, string[]>;
  const roots = new Map<string, GraphRoot>();
  const issues: RawIssue[] = [];
  const models: Record<string, import('./types').ModelResolution> = {};
  const cmd: CmdCollision[] = [];
  const conventionTextures = new Map<string, string>();

  // ── Index every file ────────────────────────────────────────────────────────
  const pathSet = new Set(files.map((f) => f.path));
  // Case-insensitive index for casing-mistake detection.
  const ciIndex = new Map<string, string>();
  for (const f of files) ciIndex.set(f.path.toLowerCase(), f.path);

  const textParsed = new Map<string, any>();       // path → parsed JSON (or undefined)
  const parseErrors = new Map<string, string>();

  for (const f of files) {
    const kind = f.kind ?? classify(f.path);
    const node: AssetNode = {
      path: f.path,
      kind,
      loc: undefined,
      namespace: namespaceOf(f.path) ?? undefined,
      bytes: f.bytes,
      refs: [],
      usedBy: [],
      datapackRefs: [],
      verdict: 'review',
      confidence: 'medium',
      evidence: [],
      image: f.image,
    };
    nodes[f.path] = node;
    byKind[kind].push(f.path);
    // Pre-parse JSON-bearing kinds.
    if (
      f.text != null &&
      (kind === 'model' || kind === 'blockstate' || kind === 'item_definition' ||
        kind === 'font' || kind === 'particle' || kind === 'atlas' ||
        kind === 'equipment' || kind === 'sounds_json' || kind === 'pack_meta' ||
        kind === 'texture_meta')
    ) {
      try {
        textParsed.set(f.path, JSON.parse(f.text));
      } catch (e: any) {
        parseErrors.set(f.path, e.message ?? 'parse error');
        node.parseError = e.message ?? 'parse error';
      }
    }
  }

  /** Exact then case-insensitive file lookup. Returns the real path or null. */
  function findFile(path: string): { path: string; casing: boolean } | null {
    if (pathSet.has(path)) return { path, casing: false };
    const ci = ciIndex.get(path.toLowerCase());
    if (ci) return { path: ci, casing: true };
    return null;
  }

  function addEdge(from: string, to: string) {
    const a = nodes[from], b = nodes[to];
    if (!a || !b) return;
    if (!a.refs.includes(to)) a.refs.push(to);
    if (!b.usedBy.includes(from)) b.usedBy.push(from);
  }

  function markConvention(texPath: string, reason: string) {
    if (!conventionTextures.has(texPath)) conventionTextures.set(texPath, reason);
  }

  const casingSeen = new Set<string>();
  /** A reference resolved only by ignoring case — breaks on case-sensitive (Linux) servers. */
  function casingIssue(referrer: string, ref: string, actual: string) {
    const k = referrer + '|' + ref;
    if (casingSeen.has(k)) return;
    casingSeen.add(k);
    issues.push({
      severity: 'warning', category: 'casing-mismatch',
      title: 'Reference casing does not match the file',
      detail: `"${ref}" only resolves to ${actual} when case is ignored. Minecraft is case-sensitive on Linux servers, so this will render as missing there even though it may work on Windows.`,
      path: referrer, refs: [actual],
    });
  }

  // ── Atlas-generated sprite names ────────────────────────────────────────────
  // A paletted_permutations source synthesizes "<texture>_<suffix>" sprites at
  // runtime with no file on disk (armor trims work this way). References to
  // those names are valid, not broken.
  const generatedSprites = new Set<string>();
  for (const ap of byKind.atlas) {
    const json = textParsed.get(ap);
    const sources = Array.isArray(json?.sources) ? json.sources : [];
    for (const src of sources) {
      if (!src || src.type !== 'paletted_permutations') continue;
      const texs = Array.isArray(src.textures) ? src.textures : [];
      const suffixes = src.permutations && typeof src.permutations === 'object' ? Object.keys(src.permutations) : [];
      for (const t of texs) {
        if (typeof t !== 'string') continue;
        const { namespace, path } = parseLoc(t);
        for (const suf of suffixes) generatedSprites.add(`${namespace}:${path}_${suf}`);
      }
    }
  }

  // ── Texture reference resolution ────────────────────────────────────────────
  type TexResult =
    | { status: 'found'; path: string; casing: boolean }
    | { status: 'vanilla' }
    | { status: 'broken' };

  function resolveTextureRef(value: string): TexResult {
    if (typeof value !== 'string' || value.startsWith('#')) return { status: 'vanilla' };
    const { namespace, path } = parseLoc(value);
    const target = textureLocToPath(value);
    const hit = findFile(target);
    if (hit) return { status: 'found', path: hit.path, casing: hit.casing };
    // Synthesized at runtime by a paletted_permutations atlas source — valid.
    if (generatedSprites.has(`${namespace}:${path.replace(/^textures\//, '')}`)) return { status: 'vanilla' };
    // Absent: minecraft namespace → vanilla default (inherited, not broken).
    if (namespace === 'minecraft') return { status: 'vanilla' };
    return { status: 'broken' };
  }

  type ModelRefResult =
    | { status: 'found'; path: string; casing: boolean }
    | { status: 'vanilla' }
    | { status: 'broken' };

  function resolveModelRef(value: string): ModelRefResult {
    if (typeof value !== 'string') return { status: 'broken' };
    const { namespace, path } = parseLoc(value);
    if (path.startsWith('builtin/')) return { status: 'vanilla' };
    const target = modelLocToPath(value);
    const hit = findFile(target);
    if (hit) return { status: 'found', path: hit.path, casing: hit.casing };
    if (namespace === 'minecraft') return { status: 'vanilla' };
    return { status: 'broken' };
  }

  // ── Model resolution: parent chain + effective textures ─────────────────────
  function resolveModel(modelPath: string): import('./types').ModelResolution {
    if (models[modelPath]) return models[modelPath];
    const res: import('./types').ModelResolution = {
      path: modelPath, parentChain: [], textures: [],
    };
    if (parseErrors.has(modelPath)) {
      res.parseError = parseErrors.get(modelPath);
      models[modelPath] = res;
      return res;
    }
    // Walk the parent chain, collecting in-pack models child→ancestor.
    const orderedJson: any[] = [];
    const seen = new Set<string>([modelPath]);
    let cur: string | null = modelPath;
    while (cur) {
      const json = textParsed.get(cur);
      orderedJson.push(json ?? {});
      const parent = json?.parent;
      if (typeof parent !== 'string' || !parent) break;
      res.parentChain.push(parent);
      const pr = resolveModelRef(parent);
      if (pr.status === 'found') {
        if (seen.has(pr.path)) break; // cycle guard
        seen.add(pr.path);
        addEdge(modelPath, pr.path); // depends on the in-pack parent
        if (pr.casing) casingIssue(modelPath, parent, pr.path);
        cur = pr.path;
        continue;
      }
      if (pr.status === 'vanilla') { res.vanillaParent = parent; break; }
      res.brokenParent = parent; break;
    }
    // Merge textures ancestor→child so child values win.
    const merged: Record<string, string> = {};
    for (let i = orderedJson.length - 1; i >= 0; i--) {
      const t = orderedJson[i]?.textures;
      if (t && typeof t === 'object') Object.assign(merged, t);
    }
    for (const [key, value] of Object.entries(merged)) {
      if (typeof value !== 'string') continue;
      if (value.startsWith('#')) {
        // An alias; resolves within `merged`. Not a file itself.
        const aliased = merged[value.slice(1)];
        if (aliased == null) {
          res.textures.push({ key, value, status: 'unresolved-var' });
        }
        continue;
      }
      const tr = resolveTextureRef(value);
      if (tr.status === 'found') {
        res.textures.push({ key, value, status: 'found', resolvedPath: tr.path });
        addEdge(modelPath, tr.path);
        if (tr.casing) casingIssue(modelPath, value, tr.path);
      } else if (tr.status === 'vanilla') {
        res.textures.push({ key, value, status: 'vanilla' });
      } else {
        res.textures.push({ key, value, status: 'broken' });
      }
    }
    models[modelPath] = res;
    return res;
  }

  // Resolve every model up front (fills edges + resolutions).
  for (const mp of byKind.model) resolveModel(mp);

  // ── Model validation issues (broken parents, missing textures) ──────────────
  for (const mp of byKind.model) {
    const res = models[mp];
    if (res.parseError) {
      issues.push({ severity: 'error', category: 'invalid-json', title: 'Malformed model JSON',
        detail: `${res.parseError}`, path: mp });
      continue;
    }
    if (res.brokenParent) {
      issues.push({ severity: 'error', category: 'broken-parent', title: 'Model parent not found',
        detail: `Parent "${res.brokenParent}" is a custom-namespace model that does not exist in the pack.`,
        path: mp, refs: [] });
    }
    for (const t of res.textures) {
      if (t.status === 'broken') {
        issues.push({ severity: 'error', category: 'broken-reference',
          title: 'Model references a missing texture',
          detail: `Texture variable "${t.key}" → "${t.value}" is a custom-namespace texture that does not exist in the pack.`,
          path: mp,
          fix: { file: mp, value: t.value, targetKind: 'texture', context: `texture "${t.key}"`, reason: 'custom-namespace texture missing from pack' } });
      } else if (t.status === 'unresolved-var') {
        issues.push({ severity: 'warning', category: 'unresolved-variable',
          title: 'Texture variable has no definition',
          detail: `"${t.key}" aliases "${t.value}" but that variable is never defined in this model or its parents.`,
          path: mp });
      }
    }
  }

  // ── Blockstates → models (blockstates are convention roots) ─────────────────
  for (const bp of byKind.blockstate) {
    const json = textParsed.get(bp);
    if (parseErrors.has(bp)) {
      issues.push({ severity: 'error', category: 'invalid-json', title: 'Malformed blockstate JSON',
        detail: parseErrors.get(bp)!, path: bp });
      continue;
    }
    const ns = namespaceOf(bp) ?? 'minecraft';
    roots.set(bp, {
      path: bp, kind: ns === 'minecraft' ? 'certain' : 'uncertain',
      reason: ns === 'minecraft'
        ? 'Blockstate overrides a vanilla block (loaded by the game for that block id).'
        : 'Custom-namespace blockstate — assumes a mod/plugin registers this block.',
    });
    const modelRefs: string[] = [];
    const collect = (v: any) => {
      if (!v) return;
      if (Array.isArray(v)) { v.forEach(collect); return; }
      if (typeof v === 'object' && typeof v.model === 'string') modelRefs.push(v.model);
    };
    if (json?.variants && typeof json.variants === 'object') {
      for (const v of Object.values(json.variants)) collect(v);
    }
    if (Array.isArray(json?.multipart)) {
      for (const part of json.multipart) collect(part?.apply);
    }
    for (const ref of modelRefs) {
      const mr = resolveModelRef(ref);
      if (mr.status === 'found') { addEdge(bp, mr.path); if (mr.casing) casingIssue(bp, ref, mr.path); }
      else if (mr.status === 'broken') {
        issues.push({ severity: 'error', category: 'broken-reference',
          title: 'Blockstate references a missing model',
          detail: `"${ref}" is a custom-namespace model not present in the pack.`, path: bp,
          fix: { file: bp, value: ref, targetKind: 'model', context: 'blockstate model', reason: 'custom-namespace model missing from pack' } });
      }
    }
  }

  // ── Item definitions (1.21.4+) → models ─────────────────────────────────────
  for (const ip of byKind.item_definition) {
    const json = textParsed.get(ip);
    if (parseErrors.has(ip)) {
      issues.push({ severity: 'error', category: 'invalid-json', title: 'Malformed item definition',
        detail: parseErrors.get(ip)!, path: ip });
      continue;
    }
    const loc = itemDefPathToLoc(ip);
    const name = loc?.path ?? '';
    const vanilla = loc?.namespace === 'minecraft' && isVanillaItem(name);
    roots.set(ip, {
      path: ip, kind: vanilla ? 'certain' : 'uncertain',
      reason: vanilla
        ? `Item definition overrides the vanilla item "${name}".`
        : `Custom item model "${loc?.namespace}:${name}" — used only if a datapack/plugin sets it via the item_model component.`,
    });
    const modelRefs: string[] = [];
    const cmdEntries: CmdEntry[] = [];
    walkItemModel(json?.model, modelRefs, cmdEntries);
    for (const ref of modelRefs) {
      const mr = resolveModelRef(ref);
      if (mr.status === 'found') { addEdge(ip, mr.path); if (mr.casing) casingIssue(ip, ref, mr.path); }
      else if (mr.status === 'broken') {
        issues.push({ severity: 'error', category: 'broken-reference',
          title: 'Item definition references a missing model',
          detail: `"${ref}" is a custom-namespace model not present in the pack.`, path: ip,
          fix: { file: ip, value: ref, targetKind: 'model', context: 'item-definition model', reason: 'custom-namespace model missing from pack' } });
      }
    }
    if (cmdEntries.length > 1) {
      const dupes = findThresholdDupes(cmdEntries);
      for (const d of dupes) {
        cmd.push({ baseItem: `${loc?.namespace}:${name}`, value: d.value, system: 'item-definition',
          entries: d.entries.map((e) => ({ source: ip, model: e })) });
      }
    }
  }

  // ── Legacy item/block overrides (pre-1.21.4) ────────────────────────────────
  let hasLegacyOverrides = false;
  for (const mp of byKind.model) {
    const json = textParsed.get(mp);
    if (!json || !Array.isArray(json.overrides) || json.overrides.length === 0) continue;
    hasLegacyOverrides = true;
    const loc = modelPathToLoc(mp);
    const baseItem = loc?.path?.replace(/^item\//, '').replace(/^block\//, '') ?? mp;
    const isBaseVanilla = loc?.namespace === 'minecraft' &&
      (loc.path.startsWith('item/') || loc.path.startsWith('block/'));
    if (isBaseVanilla) {
      roots.set(mp, { path: mp, kind: 'certain',
        reason: `Base model for vanilla item/block "${baseItem}" (overrides the default).` });
    }
    const cmdEntries: CmdEntry[] = [];
    for (const ov of json.overrides) {
      if (!ov || typeof ov !== 'object' || typeof ov.model !== 'string') continue;
      const mr = resolveModelRef(ov.model);
      if (mr.status === 'found') { addEdge(mp, mr.path); if (mr.casing) casingIssue(mp, ov.model, mr.path); }
      else if (mr.status === 'broken') {
        issues.push({ severity: 'error', category: 'broken-reference',
          title: 'Override references a missing model',
          detail: `custom_model_data override in "${baseItem}" points at "${ov.model}", which is not in the pack.`,
          path: mp,
          fix: { file: mp, value: ov.model, targetKind: 'model', context: 'override model', reason: 'custom-namespace model missing from pack' } });
      }
      const cmdv = ov.predicate?.custom_model_data;
      // Key by the FULL predicate: two overrides only collide when their entire
      // predicate is identical. Distinct predicates that share a
      // custom_model_data value (bow pulling/pull, compass angle) are not a bug.
      if (cmdv !== undefined) cmdEntries.push({ key: predicateSig(ov.predicate), value: cmdv, model: ov.model });
    }
    if (cmdEntries.length > 1) {
      const dupes = findThresholdDupes(cmdEntries);
      for (const d of dupes) {
        cmd.push({ baseItem, value: d.value, system: 'legacy-overrides',
          entries: d.entries.map((e) => ({ source: mp, model: e })) });
      }
    }
  }

  // ── Vanilla model overrides (convention roots) ──────────────────────────────
  // A minecraft-namespace model at models/block|item/<vanilla-name> overrides a
  // vanilla model that vanilla's own blockstate/item still points at — so it is
  // used even with NO in-pack reference. Rooting these prevents a false-unused
  // for packs that replace vanilla models directly (a classic trap).
  for (const mp of byKind.model) {
    if (roots.has(mp)) continue;
    const loc = modelPathToLoc(mp);
    if (loc?.namespace !== 'minecraft') continue;
    const isItem = loc.path.startsWith('item/');
    const isBlock = loc.path.startsWith('block/');
    if (!isItem && !isBlock) continue;
    const base = loc.path.replace(/^item\//, '').replace(/^block\//, '');
    // A vanilla-named model (by the block/item registry, or a multi-variant name
    // whose base block exists, e.g. oak_stairs_inner) overrides a default that
    // vanilla still renders — used-by-convention even with no in-pack reference.
    const baseBlock = base.replace(/_(inner|outer|top|bottom|side|open|on|lit|horizontal|vertical|\d+)$/g, '');
    if ((isItem && isVanillaItem(base)) || (isBlock && (isVanillaBlock(base) || isVanillaBlock(baseBlock)))) {
      roots.set(mp, { path: mp, kind: 'certain',
        reason: `Overrides the vanilla ${isItem ? 'item' : 'block'} model "${base}" (vanilla still renders it).` });
    }
  }

  // ── Fonts → bitmap textures ─────────────────────────────────────────────────
  for (const fp of byKind.font) {
    const json = textParsed.get(fp);
    if (parseErrors.has(fp)) {
      issues.push({ severity: 'error', category: 'invalid-json', title: 'Malformed font JSON',
        detail: parseErrors.get(fp)!, path: fp });
      continue;
    }
    const fname = fp.match(/\/font\/(.+?)\.json$/)?.[1] ?? '';
    const vanillaFont = (namespaceOf(fp) === 'minecraft') && VANILLA_FONTS.has(fname);
    roots.set(fp, {
      path: fp, kind: vanillaFont ? 'certain' : 'uncertain',
      reason: vanillaFont
        ? `Vanilla font "${fname}" (loaded by the game).`
        : `Custom font "${fname}" — used only if a text component references it via "font".`,
    });
    const providers = Array.isArray(json?.providers) ? json.providers : [];
    for (const prov of providers) {
      if (!prov || typeof prov !== 'object') continue;
      if (prov.type === 'bitmap' && typeof prov.file === 'string') {
        const tr = resolveTextureRef(prov.file.replace(/\.png$/i, ''));
        if (tr.status === 'found') addEdge(fp, tr.path);
        else if (tr.status === 'broken') {
          issues.push({ severity: 'error', category: 'broken-reference',
            title: 'Font references a missing bitmap',
            detail: `bitmap provider file "${prov.file}" is not present in the pack.`, path: fp,
            fix: { file: fp, value: prov.file, targetKind: 'font', context: 'font bitmap', reason: 'bitmap texture missing from pack' } });
        }
      } else if ((prov.type === 'ttf' || prov.type === 'unihex') &&
                 typeof (prov.file ?? prov.hex_file) === 'string') {
        const file = (prov.file ?? prov.hex_file) as string;
        const { namespace, path } = parseLoc(file);
        const target = `assets/${namespace}/font/${path}`;
        const hit = findFile(target);
        if (hit) addEdge(fp, hit.path);
      } else if (prov.type === 'reference' && typeof prov.id === 'string') {
        const { namespace, path } = parseLoc(prov.id);
        const hit = findFile(`assets/${namespace}/font/${path}.json`);
        if (hit) addEdge(fp, hit.path);
      }
    }
  }

  // ── Particles → textures ────────────────────────────────────────────────────
  for (const pp of byKind.particle) {
    const json = textParsed.get(pp);
    if (parseErrors.has(pp)) {
      issues.push({ severity: 'error', category: 'invalid-json', title: 'Malformed particle JSON',
        detail: parseErrors.get(pp)!, path: pp });
      continue;
    }
    const pname = pp.match(/\/particles\/(.+?)\.json$/)?.[1] ?? '';
    const vanillaParticle = (namespaceOf(pp) === 'minecraft') && VANILLA_PARTICLES.has(pname);
    roots.set(pp, {
      path: pp, kind: vanillaParticle ? 'certain' : 'uncertain',
      reason: vanillaParticle
        ? `Vanilla particle "${pname}" definition (loaded by the game).`
        : `Custom particle "${pname}" — requires a mod to be emitted; cannot be verified here.`,
    });
    const texs = Array.isArray(json?.textures) ? json.textures : [];
    for (const t of texs) {
      if (typeof t !== 'string') continue;
      const target = particleTexturePath(t);
      const hit = findFile(target);
      if (hit) addEdge(pp, hit.path);
      else if (parseLoc(t).namespace !== 'minecraft') {
        issues.push({ severity: 'error', category: 'broken-reference',
          title: 'Particle references a missing texture',
          detail: `"${t}" → ${target} is not present in the pack.`, path: pp,
          fix: { file: pp, value: t, targetKind: 'texture', context: 'particle texture', reason: 'particle texture missing from pack' } });
      }
    }
  }

  // ── Equipment (1.21.2+) → textures ──────────────────────────────────────────
  for (const ep of byKind.equipment) {
    const json = textParsed.get(ep);
    if (parseErrors.has(ep)) {
      issues.push({ severity: 'error', category: 'invalid-json', title: 'Malformed equipment JSON',
        detail: parseErrors.get(ep)!, path: ep });
      continue;
    }
    const ename = ep.match(/\/equipment\/(.+?)\.json$/)?.[1] ?? '';
    const vanillaEquip = (namespaceOf(ep) === 'minecraft') && VANILLA_EQUIPMENT.has(ename);
    roots.set(ep, {
      path: ep, kind: vanillaEquip ? 'certain' : 'uncertain',
      reason: vanillaEquip
        ? `Vanilla equipment asset "${ename}" (worn armor/elytra overlay).`
        : `Custom equipment "${ename}" — used only if an item's equippable component points at it (datapack).`,
    });
    const layers = json?.layers && typeof json.layers === 'object' ? json.layers : {};
    for (const [layerType, arr] of Object.entries(layers)) {
      if (!Array.isArray(arr)) continue;
      for (const layer of arr) {
        if (!layer || typeof layer.texture !== 'string') continue;
        const target = equipmentTexturePath(layer.texture, layerType);
        const hit = findFile(target);
        if (hit) addEdge(ep, hit.path);
        else if (parseLoc(layer.texture).namespace !== 'minecraft') {
          issues.push({ severity: 'error', category: 'broken-reference',
            title: 'Equipment references a missing texture',
            detail: `layer "${layerType}" texture "${layer.texture}" → ${target} is not present.`, path: ep,
            fix: { file: ep, value: layer.texture, targetKind: 'texture', context: `equipment layer "${layerType}"`, reason: 'equipment texture missing from pack' } });
        }
      }
    }
  }

  // ── Atlases → textures (directory / single / permutations) ──────────────────
  const textureFiles = byKind.texture;
  for (const ap of byKind.atlas) {
    const json = textParsed.get(ap);
    if (parseErrors.has(ap)) {
      issues.push({ severity: 'error', category: 'invalid-json', title: 'Malformed atlas JSON',
        detail: parseErrors.get(ap)!, path: ap });
      continue;
    }
    const aname = ap.match(/\/atlases\/(.+?)\.json$/)?.[1] ?? '';
    roots.set(ap, {
      path: ap, kind: VANILLA_ATLASES.has(aname) ? 'certain' : 'uncertain',
      reason: VANILLA_ATLASES.has(aname)
        ? `Extends the vanilla "${aname}" atlas (loaded by the game).`
        : `Custom atlas "${aname}".`,
    });
    const sources = Array.isArray(json?.sources) ? json.sources : [];
    for (const src of sources) {
      if (!src || typeof src !== 'object') continue;
      if (src.type === 'directory' && typeof src.source === 'string') {
        // Stitches EVERY texture under textures/<source>/ in EVERY namespace —
        // the game's resource listing spans namespaces, so restricting this to
        // the atlas file's own namespace would falsely orphan cross-ns sprites.
        const dirRe = new RegExp(`^assets/[^/]+/textures/${escapeRe(src.source.replace(/\/$/, ''))}/`);
        for (const tf of textureFiles) {
          if (dirRe.test(tf)) {
            addEdge(ap, tf);
            markConvention(tf, `Stitched into the "${aname}" atlas by a directory source ("${src.source}").`);
          }
        }
      } else if (src.type === 'single' && typeof src.resource === 'string') {
        const tr = resolveTextureRef(src.resource);
        if (tr.status === 'found') {
          addEdge(ap, tr.path);
          markConvention(tr.path, `Referenced by a single source in the "${aname}" atlas.`);
        }
      } else if (src.type === 'paletted_permutations') {
        const texs = Array.isArray(src.textures) ? src.textures : [];
        for (const t of texs) {
          if (typeof t !== 'string') continue;
          const tr = resolveTextureRef(t);
          if (tr.status === 'found') { addEdge(ap, tr.path); markConvention(tr.path, `Base texture for the "${aname}" atlas permutations.`); }
        }
        if (typeof src.palette_key === 'string') {
          const tr = resolveTextureRef(src.palette_key);
          if (tr.status === 'found') { addEdge(ap, tr.path); markConvention(tr.path, `Palette key for the "${aname}" atlas.`); }
        }
        // The permutation VALUES are real palette texture files too.
        const perms = src.permutations && typeof src.permutations === 'object' ? Object.values(src.permutations) : [];
        for (const p of perms) {
          if (typeof p !== 'string') continue;
          const tr = resolveTextureRef(p);
          if (tr.status === 'found') { addEdge(ap, tr.path); markConvention(tr.path, `Colour palette for the "${aname}" atlas permutations.`); }
        }
      } else if (src.type === 'unstitch' && typeof src.resource === 'string') {
        const tr = resolveTextureRef(src.resource);
        if (tr.status === 'found') { addEdge(ap, tr.path); markConvention(tr.path, `Unstitched by the "${aname}" atlas.`); }
      }
    }
  }

  // ── .png.mcmeta ↔ texture pairing ───────────────────────────────────────────
  for (const mp of byKind.texture_meta) {
    const texPath = mp.replace(/\.mcmeta$/, '');
    const hit = findFile(texPath);
    if (hit) {
      // texture → mcmeta: a used texture PULLS its animation metadata into the
      // used set. (The reverse direction left every paired mcmeta unreachable
      // and falsely safe-remove.)
      addEdge(hit.path, mp);
    } else {
      issues.push({ severity: 'warning', category: 'orphan-mcmeta',
        title: 'Orphaned .mcmeta file',
        detail: `${mp} has no paired texture (${texPath.split('/').pop()}). It animates nothing.`,
        path: mp });
    }
  }

  // ── sounds.json → *.ogg ─────────────────────────────────────────────────────
  for (const sp of byKind.sounds_json) {
    const json = textParsed.get(sp);
    if (parseErrors.has(sp)) {
      issues.push({ severity: 'error', category: 'invalid-json', title: 'Malformed sounds.json',
        detail: parseErrors.get(sp)!, path: sp });
      continue;
    }
    const ns = sp.match(/^assets\/([^/]+)\/sounds\.json$/)?.[1] ?? 'minecraft';
    roots.set(sp, { path: sp, kind: 'certain', reason: 'sounds.json is loaded by the game by convention.' });
    for (const [event, val] of Object.entries(json ?? {})) {
      const sounds = (val as any)?.sounds;
      if (!Array.isArray(sounds)) continue;
      for (const s of sounds) {
        const name = typeof s === 'string' ? s : s?.name;
        const type = typeof s === 'object' ? s?.type : undefined;
        if (typeof name !== 'string' || type === 'event') continue;
        // A namespaced name resolves in ITS namespace; a bare name is looked up
        // in this file's namespace and then minecraft (safe direction — never
        // report an error for a sound that actually resolves).
        const soundNs = name.includes(':') ? parseLoc(name).namespace : null;
        const candidates = soundNs
          ? [`assets/${soundNs}/sounds/${parseLoc(name).path}.ogg`]
          : [...new Set([`assets/${ns}/sounds/${name}.ogg`, `assets/minecraft/sounds/${name}.ogg`])];
        const hit = candidates.map((c) => findFile(c)).find(Boolean);
        if (hit) addEdge(sp, hit.path);
        else if (soundNs && soundNs !== 'minecraft') {
          // Only a custom namespace is provably broken — vanilla ships the
          // minecraft-namespace sounds, so those may resolve outside the pack.
          issues.push({ severity: 'error', category: 'missing-sound',
            title: 'sounds.json points at a missing file',
            detail: `Event "${event}" references ${candidates[0]}, which is not in the pack.`, path: sp });
        }
      }
    }
  }

  // ── lang files are convention roots ─────────────────────────────────────────
  for (const lp of byKind.lang) {
    roots.set(lp, { path: lp, kind: 'certain', reason: 'Language file — loaded by the game for translations.' });
    if (parseErrors.has(lp)) {
      issues.push({ severity: 'error', category: 'invalid-json', title: 'Malformed language file',
        detail: parseErrors.get(lp)!, path: lp });
    }
  }

  // ── Texture-level convention roots (strong override paths + known vanilla) ──
  for (const tp of byKind.texture) {
    const loc = texturePathToLoc(tp);
    if (!loc) continue;
    const ns = loc.namespace;
    if (ns === 'minecraft') {
      if (isStrongOverridePath(loc.path)) {
        markConvention(tp, `Sits at a hardcoded vanilla path (textures/${loc.path.split('/')[0]}/…) — Minecraft loads it directly.`);
      } else if (isKnownVanillaTexture(loc.path)) {
        markConvention(tp, `Overrides the vanilla texture "${loc.path}" (vanilla's own model still points here).`);
      }
    }
  }

  return { nodes, byKind, roots, models, cmd, issues, conventionTextures, hasLegacyOverrides };
}

/**
 * A candidate custom_model_data mapping. `key` is the collision grouping key:
 * for item-definition range_dispatch it is the threshold; for legacy overrides
 * it is the FULL predicate signature (so a bow's pulling/pull stages, which
 * share one custom_model_data value, are NOT flagged as a collision).
 */
interface CmdEntry { key: string; value: string | number; model: string }

/** Stable signature of a predicate object (keys sorted). */
function predicateSig(pred: any): string {
  if (!pred || typeof pred !== 'object') return '{}';
  const keys = Object.keys(pred).sort();
  return JSON.stringify(keys.map((k) => [k, pred[k]]));
}

// ── Item-model tree walker (1.21.4+ + generic) ────────────────────────────────
// `dctx` numbers each range_dispatch node so collision keys never cross two
// different dispatches (an item can legally dispatch on several custom_model_data
// indices, each with its own threshold space).
function walkItemModel(
  node: any,
  out: string[],
  cmdEntries: CmdEntry[],
  depth = 0,
  dctx: { n: number } = { n: 0 },
) {
  if (!node || depth > 40) return;
  if (typeof node === 'string') { out.push(node); return; }
  if (Array.isArray(node)) { node.forEach((n) => walkItemModel(n, out, cmdEntries, depth + 1, dctx)); return; }
  if (typeof node !== 'object') return;
  const type = typeof node.type === 'string' ? node.type.replace(/^minecraft:/, '') : undefined;

  // range_dispatch on custom_model_data → collision candidates.
  if (type === 'range_dispatch') {
    const prop = (typeof node.property === 'string' ? node.property : '').replace(/^minecraft:/, '');
    const dispatchId = dctx.n++;
    if (Array.isArray(node.entries)) {
      for (const e of node.entries) {
        if (typeof e?.model === 'object') walkItemModel(e.model, out, cmdEntries, depth + 1, dctx);
        else if (typeof e?.model === 'string') out.push(e.model);
        if (prop === 'custom_model_data' && e?.threshold !== undefined && typeof e?.model !== 'undefined') {
          const m = typeof e.model === 'string' ? e.model : (e.model?.model ?? JSON.stringify(e.model));
          cmdEntries.push({ key: `d${dispatchId}|${String(e.threshold)}`, value: e.threshold, model: typeof m === 'string' ? m : JSON.stringify(m) });
        }
      }
    }
    walkItemModel(node.fallback, out, cmdEntries, depth + 1, dctx);
    return;
  }
  if (type === 'select') {
    if (Array.isArray(node.cases)) for (const c of node.cases) walkItemModel(c?.model, out, cmdEntries, depth + 1, dctx);
    walkItemModel(node.fallback, out, cmdEntries, depth + 1, dctx);
    return;
  }
  if (type === 'condition') {
    walkItemModel(node.on_true, out, cmdEntries, depth + 1, dctx);
    walkItemModel(node.on_false, out, cmdEntries, depth + 1, dctx);
    return;
  }
  if (type === 'composite') {
    if (Array.isArray(node.models)) node.models.forEach((m: any) => walkItemModel(m, out, cmdEntries, depth + 1, dctx));
    return;
  }
  if (type === 'model') {
    if (typeof node.model === 'string') out.push(node.model);
    return;
  }
  if (type === 'special') {
    if (typeof node.base === 'string') out.push(node.base);
    return;
  }
  // Generic fallback sweep for any shape we didn't special-case.
  if (typeof node.model === 'string') out.push(node.model);
  else if (typeof node.model === 'object') walkItemModel(node.model, out, cmdEntries, depth + 1, dctx);
  if (Array.isArray(node.models)) node.models.forEach((m: any) => walkItemModel(m, out, cmdEntries, depth + 1, dctx));
  if (Array.isArray(node.entries)) node.entries.forEach((e: any) => walkItemModel(e?.model, out, cmdEntries, depth + 1, dctx));
  if (Array.isArray(node.cases)) node.cases.forEach((c: any) => walkItemModel(c?.model, out, cmdEntries, depth + 1, dctx));
  walkItemModel(node.fallback, out, cmdEntries, depth + 1, dctx);
  walkItemModel(node.on_true, out, cmdEntries, depth + 1, dctx);
  walkItemModel(node.on_false, out, cmdEntries, depth + 1, dctx);
}

/**
 * Find collisions: the same grouping key mapped to more than one distinct model.
 * For item definitions the key is the threshold; for legacy overrides it is the
 * full predicate, so distinct predicates that merely share a custom_model_data
 * value (bow pull stages, compass angles) are correctly NOT reported.
 */
function findThresholdDupes(
  entries: CmdEntry[],
): Array<{ value: string | number; entries: string[] }> {
  const byKey = new Map<string, { value: string | number; models: Set<string> }>();
  for (const e of entries) {
    if (!byKey.has(e.key)) byKey.set(e.key, { value: e.value, models: new Set() });
    byKey.get(e.key)!.models.add(e.model);
  }
  const out: Array<{ value: string | number; entries: string[] }> = [];
  for (const { value, models } of byKey.values()) {
    if (models.size > 1) out.push({ value, entries: [...models] });
  }
  return out;
}

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

import type { AssetKind, AssetNode, CmdCollision, Evidence, RawFile } from './types';
import {
  classify, namespaceOf, parseLoc, textureLocToPath, modelLocToPath,
  fontBitmapPath, particleTexturePath, equipmentTexturePath, modelPathToLoc,
  itemDefPathToLoc, texturePathToLoc,
} from './resloc';
import {
  isVanillaModelRef, isStrongOverridePath, isVanillaItem, isKnownVanillaTexture,
  VANILLA_FONTS, VANILLA_PARTICLES, VANILLA_EQUIPMENT,
} from './vanilla';

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
  fix?: { modelPath: string; key: string; value: string; reason: string };
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

  // ── Texture reference resolution ────────────────────────────────────────────
  type TexResult =
    | { status: 'found'; path: string; casing: boolean }
    | { status: 'vanilla' }
    | { status: 'broken' };

  function resolveTextureRef(value: string): TexResult {
    if (typeof value !== 'string' || value.startsWith('#')) return { status: 'vanilla' };
    const { namespace } = parseLoc(value);
    const target = textureLocToPath(value);
    const hit = findFile(target);
    if (hit) return { status: 'found', path: hit.path, casing: hit.casing };
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
          fix: { modelPath: mp, key: t.key, value: t.value, reason: 'custom-namespace texture missing from pack' } });
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
      if (mr.status === 'found') addEdge(bp, mr.path);
      else if (mr.status === 'broken') {
        issues.push({ severity: 'error', category: 'broken-reference',
          title: 'Blockstate references a missing model',
          detail: `"${ref}" is a custom-namespace model not present in the pack.`, path: bp });
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
    const cmdEntries: Array<{ threshold: string | number; model: string }> = [];
    walkItemModel(json?.model, modelRefs, cmdEntries);
    for (const ref of modelRefs) {
      const mr = resolveModelRef(ref);
      if (mr.status === 'found') addEdge(ip, mr.path);
      else if (mr.status === 'broken') {
        issues.push({ severity: 'error', category: 'broken-reference',
          title: 'Item definition references a missing model',
          detail: `"${ref}" is a custom-namespace model not present in the pack.`, path: ip });
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
  for (const mp of byKind.model) {
    const json = textParsed.get(mp);
    if (!json || !Array.isArray(json.overrides)) continue;
    const loc = modelPathToLoc(mp);
    const baseItem = loc?.path?.replace(/^item\//, '').replace(/^block\//, '') ?? mp;
    const isBaseVanilla = loc?.namespace === 'minecraft' &&
      (loc.path.startsWith('item/') || loc.path.startsWith('block/'));
    if (isBaseVanilla) {
      roots.set(mp, { path: mp, kind: 'certain',
        reason: `Base model for vanilla item/block "${baseItem}" (overrides the default).` });
    }
    const cmdEntries: Array<{ threshold: string | number; model: string }> = [];
    for (const ov of json.overrides) {
      if (!ov || typeof ov !== 'object' || typeof ov.model !== 'string') continue;
      const mr = resolveModelRef(ov.model);
      if (mr.status === 'found') addEdge(mp, mr.path);
      else if (mr.status === 'broken') {
        issues.push({ severity: 'error', category: 'broken-reference',
          title: 'Override references a missing model',
          detail: `custom_model_data override in "${baseItem}" points at "${ov.model}", which is not in the pack.`,
          path: mp });
      }
      const cmdv = ov.predicate?.custom_model_data;
      if (cmdv !== undefined) cmdEntries.push({ threshold: cmdv, model: ov.model });
    }
    if (cmdEntries.length > 1) {
      const dupes = findThresholdDupes(cmdEntries);
      for (const d of dupes) {
        cmd.push({ baseItem, value: d.value, system: 'legacy-overrides',
          entries: d.entries.map((e) => ({ source: mp, model: e })) });
      }
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
    const loc = itemDefPathToLoc(fp) ?? modelPathToLoc(fp);
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
            detail: `bitmap provider file "${prov.file}" is not present in the pack.`, path: fp });
        }
      } else if ((prov.type === 'ttf' || prov.type === 'unihex') &&
                 typeof (prov.file ?? prov.hex_file ?? prov.sizes) === 'string') {
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
          detail: `"${t}" → ${target} is not present in the pack.`, path: pp });
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
            detail: `layer "${layerType}" texture "${layer.texture}" → ${target} is not present.`, path: ep });
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
    const ans = namespaceOf(ap) ?? 'minecraft';
    // Vanilla atlas names extend the game's built-in atlases → certain.
    const VANILLA_ATLASES = new Set(['blocks', 'particles', 'mob_effects', 'paintings',
      'gui', 'banner_patterns', 'beds', 'chests', 'shield_patterns', 'shulker_boxes',
      'signs', 'armor_trims', 'decorated_pot', 'map_decorations']);
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
        // Stitches EVERY texture under assets/<ns>/textures/<source>/ — used.
        const prefix = `assets/${ans}/textures/${src.source.replace(/\/$/, '')}/`;
        for (const tf of textureFiles) {
          if (tf.startsWith(prefix)) {
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
      addEdge(mp, hit.path); // the mcmeta "belongs to" its texture
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
        const bare = name.replace(/^[^:]+:/, '');
        const target = `assets/${ns}/sounds/${bare}.ogg`;
        const hit = findFile(target);
        if (hit) addEdge(sp, hit.path);
        else {
          issues.push({ severity: 'error', category: 'missing-sound',
            title: 'sounds.json points at a missing file',
            detail: `Event "${event}" references ${target}, which is not in the pack.`, path: sp });
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

  return { nodes, byKind, roots, models, cmd, issues, conventionTextures };
}

// ── Item-model tree walker (1.21.4+ + generic) ────────────────────────────────
function walkItemModel(
  node: any,
  out: string[],
  cmdEntries: Array<{ threshold: string | number; model: string }>,
  depth = 0,
) {
  if (!node || depth > 40) return;
  if (typeof node === 'string') { out.push(node); return; }
  if (Array.isArray(node)) { node.forEach((n) => walkItemModel(n, out, cmdEntries, depth + 1)); return; }
  if (typeof node !== 'object') return;
  const type = typeof node.type === 'string' ? node.type.replace(/^minecraft:/, '') : undefined;

  // range_dispatch on custom_model_data → collision candidates.
  if (type === 'range_dispatch') {
    const prop = (node.property ?? '').replace(/^minecraft:/, '');
    if (Array.isArray(node.entries)) {
      for (const e of node.entries) {
        if (typeof e?.model === 'object') walkItemModel(e.model, out, cmdEntries, depth + 1);
        else if (typeof e?.model === 'string') out.push(e.model);
        if (prop === 'custom_model_data' && e?.threshold !== undefined && typeof e?.model !== 'undefined') {
          const m = typeof e.model === 'string' ? e.model : (e.model?.model ?? JSON.stringify(e.model));
          cmdEntries.push({ threshold: e.threshold, model: typeof m === 'string' ? m : JSON.stringify(m) });
        }
      }
    }
    walkItemModel(node.fallback, out, cmdEntries, depth + 1);
    return;
  }
  if (type === 'select') {
    if (Array.isArray(node.cases)) for (const c of node.cases) walkItemModel(c?.model, out, cmdEntries, depth + 1);
    walkItemModel(node.fallback, out, cmdEntries, depth + 1);
    return;
  }
  if (type === 'condition') {
    walkItemModel(node.on_true, out, cmdEntries, depth + 1);
    walkItemModel(node.on_false, out, cmdEntries, depth + 1);
    return;
  }
  if (type === 'composite') {
    if (Array.isArray(node.models)) node.models.forEach((m: any) => walkItemModel(m, out, cmdEntries, depth + 1));
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
  else if (typeof node.model === 'object') walkItemModel(node.model, out, cmdEntries, depth + 1);
  if (Array.isArray(node.models)) node.models.forEach((m: any) => walkItemModel(m, out, cmdEntries, depth + 1));
  if (Array.isArray(node.entries)) node.entries.forEach((e: any) => walkItemModel(e?.model, out, cmdEntries, depth + 1));
  if (Array.isArray(node.cases)) node.cases.forEach((c: any) => walkItemModel(c?.model, out, cmdEntries, depth + 1));
  walkItemModel(node.fallback, out, cmdEntries, depth + 1);
  walkItemModel(node.on_true, out, cmdEntries, depth + 1);
  walkItemModel(node.on_false, out, cmdEntries, depth + 1);
}

/** Find custom_model_data thresholds mapped to more than one distinct model. */
function findThresholdDupes(
  entries: Array<{ threshold: string | number; model: string }>,
): Array<{ value: string | number; entries: string[] }> {
  const byVal = new Map<string, { value: string | number; models: Set<string> }>();
  for (const e of entries) {
    const key = String(e.threshold);
    if (!byVal.has(key)) byVal.set(key, { value: e.threshold, models: new Set() });
    byVal.get(key)!.models.add(e.model);
  }
  const out: Array<{ value: string | number; entries: string[] }> = [];
  for (const { value, models } of byVal.values()) {
    if (models.size > 1) out.push({ value, entries: [...models] });
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// Verdicts + findings
//
// Reachability is computed from two tiers of roots:
//   • certain roots   — vanilla overrides, datapack references, convention files
//   • uncertain roots — custom entry points that MAY be invoked (mod/plugin)
//
// An asset reachable from any root is "used" (we never suggest deleting a file
// something references). An asset reachable from NOTHING is a cleanup candidate,
// and only then is "safe to remove" — always with the full evidence trail and an
// explicit statement of what removing it would do.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  AnalysisResult, AssetNode, Evidence, Finding, PackMetaInfo, Confidence,
  DuplicateGroup, CmdCollision, DatapackRef, AssetKind,
} from './types';
import type { Graph } from './graph';
import { texturePathToLoc } from './resloc';
import { isStrongOverridePath, isKnownVanillaTexture } from './vanilla';

interface VerdictInput {
  graph: Graph;
  meta: PackMetaInfo;
  duplicates: DuplicateGroup[];
  datapackRefs: DatapackRef[];
  datapacks: string[];
}

export function computeAnalysis(input: VerdictInput): AnalysisResult {
  const { graph, meta, duplicates, datapackRefs, datapacks } = input;
  const { nodes, roots, conventionTextures } = graph;

  // ── Reachability (two tiers) ────────────────────────────────────────────────
  const certainSeeds: string[] = [];
  const anySeeds: string[] = [];
  for (const [path, r] of roots) {
    anySeeds.push(path);
    if (r.kind === 'certain') certainSeeds.push(path);
  }
  // Convention textures are certain leaf-roots.
  for (const tp of conventionTextures.keys()) { certainSeeds.push(tp); anySeeds.push(tp); }

  const usedCertain = bfs(certainSeeds, nodes);
  const usedAny = bfs(anySeeds, nodes);

  // ── Per-node verdicts ───────────────────────────────────────────────────────
  const errorPaths = new Set<string>();
  for (const iss of graph.issues) {
    if (iss.severity === 'error' && iss.path) errorPaths.add(iss.path);
  }

  for (const node of Object.values(nodes)) {
    assignVerdict(node, {
      root: roots.get(node.path),
      isError: node.parseError != null || errorPaths.has(node.path),
      usedCertain: usedCertain.has(node.path),
      usedAny: usedAny.has(node.path),
      conventionReason: conventionTextures.get(node.path),
    });
  }

  // ── Findings ────────────────────────────────────────────────────────────────
  const findings: Finding[] = [];
  let fid = 0;
  const nextId = () => `f${fid++}`;

  // pack.mcmeta / version findings.
  for (const err of meta.errors) {
    findings.push({ id: nextId(), severity: 'error', category: 'pack-meta',
      title: 'pack.mcmeta problem', detail: err, path: 'pack.mcmeta',
      evidence: [{ kind: 'note', detail: err, source: 'pack.mcmeta' }], confidence: 'certain' });
  }
  // System / format mismatch — either system used against the wrong format.
  const hasItemDefs = graph.byKind.item_definition.length > 0;
  if (meta.itemSystem === 'legacy-overrides' && hasItemDefs) {
    findings.push({ id: nextId(), severity: 'warning', category: 'system-mismatch',
      title: 'Item definitions present but pack_format predates them',
      detail: `This pack declares pack_format ${meta.packFormat} (${meta.versionLabel}), but ships assets/<ns>/items/ definitions, which Minecraft only reads from 1.21.4 (format 46) onward. Those files will be ignored on the declared version.`,
      path: 'pack.mcmeta', confidence: 'high',
      evidence: [{ kind: 'note', detail: `${graph.byKind.item_definition.length} item definition file(s) found.` }] });
  }
  if (meta.itemSystem === 'item-definition' && graph.hasLegacyOverrides && !hasItemDefs) {
    findings.push({ id: nextId(), severity: 'warning', category: 'system-mismatch',
      title: 'Legacy custom_model_data overrides on a version that ignores them',
      detail: `This pack declares pack_format ${meta.packFormat} (${meta.versionLabel}), where item model "overrides" with custom_model_data predicates no longer work — Minecraft 1.21.4+ reads item models from assets/<ns>/items/ instead. These overrides render nothing; migrate them to item definitions.`,
      path: 'pack.mcmeta', confidence: 'high',
      evidence: [{ kind: 'note', detail: 'Models with an "overrides" array were found, but no assets/<ns>/items/ definitions exist.' }] });
  }

  // Graph issues → findings.
  for (const iss of graph.issues) {
    const node = iss.path ? nodes[iss.path] : undefined;
    findings.push({
      id: nextId(), severity: iss.severity === 'error' ? 'error' : 'warning',
      category: iss.category, title: iss.title, detail: iss.detail, path: iss.path, refs: iss.refs,
      confidence: 'certain',
      evidence: node ? evidenceFor(node, graph) : (iss.path ? [{ kind: 'note', detail: iss.detail, source: iss.path }] : []),
      fix: iss.fix,
    });
  }

  // custom_model_data collisions.
  for (const c of graph.cmd) {
    findings.push({ id: nextId(), severity: 'warning', category: 'cmd-collision',
      title: `custom_model_data ${c.value} is assigned twice on ${c.baseItem}`,
      detail: `The ${c.system === 'legacy-overrides' ? 'legacy overrides' : 'item definition'} for ${c.baseItem} map the same custom_model_data value (${c.value}) to more than one model. In-game only one wins — the others are dead.`,
      refs: c.entries.map((e) => e.model), confidence: 'high',
      evidence: c.entries.map((e) => ({ kind: 'note' as const, detail: `→ ${e.model}`, source: e.source })),
      consequence: 'Give each variant a distinct custom_model_data value, or remove the duplicate.' });
  }

  // Duplicate textures.
  for (const g of duplicates) {
    const [keep, ...rest] = g.members;
    findings.push({ id: nextId(), severity: 'cleanup', category: g.kind === 'exact' ? 'duplicate-exact' : 'duplicate-near',
      title: g.kind === 'exact'
        ? `${g.members.length} identical textures`
        : `${g.members.length} near-identical textures (aHash distance ${g.distance})`,
      detail: g.kind === 'exact'
        ? `These files are byte-for-byte (pixel) identical. You can collapse them to one and repoint references.`
        : `These look almost the same. Review whether they should be a single texture.`,
      refs: g.members, path: keep, confidence: g.kind === 'exact' ? 'high' : 'low',
      evidence: g.members.map((m) => ({ kind: 'note' as const, detail: m === keep ? `${m} (keep)` : `${m} (duplicate of keep)`, source: m })),
      consequence: g.kind === 'exact'
        ? 'Identical pixels — safe to merge, but confirm nothing depends on the exact path.'
        : 'Near-duplicate — do NOT auto-merge; the difference may be intentional.' });
  }

  // Cleanup + review findings from node verdicts.
  const safeRemove = Object.values(nodes).filter((n) => n.verdict === 'safe-remove');
  const review = Object.values(nodes).filter((n) => n.verdict === 'review');
  for (const n of safeRemove) {
    findings.push({ id: nextId(), severity: 'cleanup', category: 'unreferenced',
      title: `Unreferenced ${labelKind(n.kind)}`,
      detail: describeUnreferenced(n),
      path: n.path, confidence: n.confidence,
      evidence: evidenceFor(n, graph),
      consequence: consequenceFor(n) });
  }
  for (const n of review) {
    // Only surface review items that are genuine entry points or leaves worth a look.
    if (n.kind === 'texture' || n.kind === 'model' || isEntryKind(n.kind)) {
      findings.push({ id: nextId(), severity: 'info', category: 'review',
        title: `Review: ${labelKind(n.kind)} with no verified use`,
        detail: describeReview(n),
        path: n.path, confidence: n.confidence,
        evidence: evidenceFor(n, graph),
        consequence: 'Keep unless you can confirm nothing invokes it — the editor cannot see plugin/mod code or macro-built NBT.' });
    }
  }

  // ── Summary + sort ──────────────────────────────────────────────────────────
  findings.sort((a, b) => sevRank(a.severity) - sevRank(b.severity) || confRank(b.confidence) - confRank(a.confidence));

  const textures = graph.byKind.texture;
  const reclaimable = safeRemove.reduce((s, n) => s + (n.bytes ?? 0), 0);
  const summary = {
    files: Object.keys(nodes).length,
    textures: textures.length,
    models: graph.byKind.model.length,
    used: Object.values(nodes).filter((n) => n.verdict === 'used').length,
    review: review.length,
    safeRemove: safeRemove.length,
    errors: findings.filter((f) => f.severity === 'error').length,
    warnings: findings.filter((f) => f.severity === 'warning').length,
    reclaimableBytes: reclaimable,
  };

  const blindSpots = buildBlindSpots(datapackRefs, datapacks, graph);
  if (meta.overlays.length > 0) {
    blindSpots.push(`This pack declares ${meta.overlays.length} overlay directory(ies) (${meta.overlays.join(', ')}). Overlay assets load on specific versions and are analysed separately — files inside them are surfaced for review, never flagged for removal.`);
  }

  const brokenRefs = graph.issues
    .filter((i) => i.fix)
    .map((i) => i.fix!);

  return {
    meta, nodes, byKind: graph.byKind, models: graph.models,
    findings, brokenRefs, cmdCollisions: graph.cmd, duplicates, datapackRefs, datapacks,
    summary, blindSpots,
  };
}

// ── Reachability BFS ──────────────────────────────────────────────────────────
function bfs(seeds: string[], nodes: Record<string, AssetNode>): Set<string> {
  const seen = new Set<string>();
  const queue: string[] = [];
  for (const s of seeds) if (nodes[s] && !seen.has(s)) { seen.add(s); queue.push(s); }
  while (queue.length) {
    const cur = queue.shift()!;
    for (const to of nodes[cur]?.refs ?? []) {
      if (!seen.has(to)) { seen.add(to); queue.push(to); }
    }
  }
  return seen;
}

// ── Verdict assignment ────────────────────────────────────────────────────────
interface VerdictCtx {
  root?: { kind: 'certain' | 'uncertain'; reason: string };
  isError: boolean;
  usedCertain: boolean;
  usedAny: boolean;
  conventionReason?: string;
}

function assignVerdict(node: AssetNode, ctx: VerdictCtx) {
  const ev: Evidence[] = [];
  // pack.mcmeta, pack.png, shaders, text — not part of the used/unused model.
  if (node.kind === 'pack_meta' || node.kind === 'pack_png' || node.kind === 'shader' ||
      node.kind === 'sounds_json' || node.kind === 'lang' || node.kind === 'other' || node.kind === 'text') {
    node.verdict = ctx.isError ? 'error' : 'used';
    node.confidence = 'certain';
    if (ctx.root) ev.push({ kind: 'convention', detail: ctx.root.reason });
    node.evidence = ev;
    return;
  }
  if (ctx.isError) { node.verdict = 'error'; node.confidence = 'certain'; return; }

  if (ctx.conventionReason) {
    node.verdict = 'used'; node.confidence = 'certain'; node.vanillaOverride = true;
    ev.push({ kind: 'vanilla-override', detail: ctx.conventionReason });
    node.evidence = ev; return;
  }

  // A file that IS a root (blockstate, item def, font, particle, equipment…).
  if (ctx.root) {
    if (ctx.root.kind === 'certain') {
      node.verdict = 'used'; node.confidence = 'certain';
      ev.push({ kind: 'convention', detail: ctx.root.reason });
    } else {
      // Uncertain root: an entry point we cannot confirm is invoked.
      const dpUsed = node.datapackRefs.length > 0;
      if (dpUsed) {
        node.verdict = 'used'; node.confidence = 'high';
        for (const d of node.datapackRefs) ev.push({ kind: 'datapack', detail: `${d.via} = ${d.value}`, source: `${d.pack}: ${d.file}` });
      } else {
        node.verdict = 'review'; node.confidence = 'medium';
        ev.push({ kind: 'ambiguity', detail: ctx.root.reason });
        ev.push({ kind: 'no-reference', detail: 'No datapack given references this entry point.' });
      }
    }
    node.evidence = ev; return;
  }

  // Not a root. Verdict follows reachability.
  if (ctx.usedCertain) {
    node.verdict = 'used'; node.confidence = 'certain';
    node.evidence = ev; return;
  }
  if (ctx.usedAny) {
    // Reachable only through an uncertain entry point.
    node.verdict = 'used'; node.confidence = 'medium';
    ev.push({ kind: 'referenced-by', detail: 'Reachable only through a custom entry point whose use is unverified.' });
    node.evidence = ev; return;
  }

  // Reachable from nothing → cleanup candidate.
  classifyUnreferenced(node);
}

/** Decide safe-remove vs review for a genuinely unreferenced asset. */
function classifyUnreferenced(node: AssetNode) {
  const ev: Evidence[] = [{ kind: 'no-reference', detail: 'Nothing in the resource pack, no vanilla path, and no supplied datapack references this file.' }];
  if (node.kind === 'texture') {
    const loc = texturePathToLoc(node.path);
    if (!loc) {
      // Non-standard path: not under assets/<ns>/textures/. Most often a pack
      // overlay directory, whose internal references we do not resolve. Never
      // flag these for removal — keep for review.
      node.verdict = 'review'; node.confidence = 'low';
      ev.push({ kind: 'ambiguity', detail: 'This texture is not under a standard assets/<ns>/textures/ path — it may live in a pack overlay directory whose references are resolved separately in-game. Kept for review, not flagged for removal.' });
    } else if (loc.namespace !== 'minecraft') {
      node.verdict = 'safe-remove'; node.confidence = 'high';
      ev.push({ kind: 'note', detail: `Custom namespace "${loc.namespace}" — cannot be a vanilla override, so nothing loads it by convention.` });
    } else if (isStrongOverridePath(loc.path)) {
      // Shouldn't reach here (handled as convention), but guard anyway.
      node.verdict = 'used'; node.confidence = 'certain';
    } else if (isKnownVanillaTexture(loc.path)) {
      node.verdict = 'used'; node.confidence = 'high'; node.vanillaOverride = true;
    } else {
      node.verdict = 'safe-remove'; node.confidence = 'medium';
      ev.push({ kind: 'ambiguity', detail: 'This is under block/ or item/ in the minecraft namespace. If it overrides a vanilla texture whose name we do not recognise, keep it — vanilla’s own model would still load it.' });
    }
  } else if (node.kind === 'texture_meta') {
    node.verdict = 'safe-remove'; node.confidence = 'high';
    ev.push({ kind: 'note', detail: 'Animation metadata for a texture that is itself unused.' });
  } else if (node.kind === 'model') {
    const custom = node.namespace && node.namespace !== 'minecraft';
    node.verdict = 'safe-remove'; node.confidence = custom ? 'high' : 'medium';
    ev.push({ kind: 'note', detail: custom
      ? 'Custom-namespace model reached by no blockstate, item definition, override, or parent link.'
      : 'Minecraft-namespace model not referenced by any blockstate/override and not at a recognised vanilla model path.' });
  } else if (node.kind === 'sound') {
    node.verdict = 'review'; node.confidence = 'medium';
    ev.push({ kind: 'ambiguity', detail: 'Not listed in any sounds.json. It may be played by a datapack /playsound using its path directly, which we cannot fully verify.' });
  } else {
    node.verdict = 'review'; node.confidence = 'low';
    ev.push({ kind: 'ambiguity', detail: 'No static reference found, but a dynamic one may exist.' });
  }
  node.evidence = ev;
}

// ── Evidence + descriptions ───────────────────────────────────────────────────
function evidenceFor(node: AssetNode, graph: Graph): Evidence[] {
  const ev = [...node.evidence];
  // Add provenance: who uses this.
  for (const from of node.usedBy.slice(0, 12)) {
    ev.push({ kind: 'referenced-by', detail: `Referenced by ${from.split('/').slice(-2).join('/')}`, source: from });
  }
  if (node.usedBy.length > 12) ev.push({ kind: 'note', detail: `…and ${node.usedBy.length - 12} more.` });
  // What this references.
  for (const to of node.refs.slice(0, 8)) {
    ev.push({ kind: 'references', detail: `Uses ${to.split('/').slice(-2).join('/')}`, source: to });
  }
  return ev;
}

function describeUnreferenced(n: AssetNode): string {
  const size = n.bytes ? ` (${fmtBytes(n.bytes)})` : '';
  return `${n.path}${size} is reached by nothing — no model, blockstate, item definition, atlas source, font, particle, equipment, or supplied datapack points at it.`;
}

function describeReview(n: AssetNode): string {
  return `${n.path} has no verified use, but a reference could exist somewhere the editor cannot see.`;
}

function consequenceFor(n: AssetNode): string {
  if (n.confidence === 'high') {
    return `Removing this deletes ${fmtBytes(n.bytes ?? 0)} with no known effect in-game. Confirm no server plugin references it by hardcoded path before deleting.`;
  }
  return `Likely safe to remove, BUT: if this overrides a vanilla asset by exact name, or a plugin loads it by path, removing it changes the game. Review before deleting.`;
}

function buildBlindSpots(datapackRefs: DatapackRef[], datapacks: string[], graph: Graph): string[] {
  const spots: string[] = [];
  if (datapacks.length === 0) {
    spots.push('No datapacks were provided. Any texture/model/font invoked only by a datapack (item_model, custom_model_data, font) will look unreferenced here — add your datapacks for a complete picture.');
  }
  spots.push('Server plugins (Bukkit/Paper/Spigot) and mods live outside the pack and can reference assets by hardcoded path — the editor cannot see those.');
  if (datapackRefs.some((r) => r.value === '(object)')) {
    spots.push('Some datapack custom_model_data values are objects/macros that cannot be fully resolved statically; the affected item entry points are flagged for review rather than confirmed.');
  }
  if (graph.byKind.atlas.length === 0 && graph.byKind.texture.length > 0) {
    spots.push('No atlas files were found. If your server relies on an atlas directory source we did not see, some GUI/runtime textures could be used without a model reference.');
  }
  return spots;
}

// ── Small helpers ─────────────────────────────────────────────────────────────
function isEntryKind(k: AssetKind): boolean {
  return k === 'item_definition' || k === 'font' || k === 'particle' || k === 'equipment' || k === 'atlas' || k === 'blockstate';
}
function labelKind(k: AssetKind): string {
  const map: Partial<Record<AssetKind, string>> = {
    texture: 'texture', texture_meta: 'animation metadata', model: 'model',
    blockstate: 'blockstate', item_definition: 'item definition', font: 'font',
    particle: 'particle', equipment: 'equipment', atlas: 'atlas', sound: 'sound',
  };
  return map[k] ?? k;
}
function sevRank(s: Finding['severity']): number {
  return { error: 0, warning: 1, cleanup: 2, info: 3 }[s];
}
function confRank(c: Confidence): number {
  return { certain: 3, high: 2, medium: 1, low: 0 }[c];
}
export function fmtBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

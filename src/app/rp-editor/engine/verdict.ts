import { verdictLabel, assetKindLabel } from '@/lib/icelandic';
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
import { texturePathToLoc, modelPathToLoc } from './resloc';
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

  // An .mcmeta is exactly as removable as the texture it animates — mirror the
  // paired texture's verdict (a used texture already pulled its mcmeta into the
  // used set via the texture→mcmeta edge; this covers the unused/review cases).
  for (const node of Object.values(nodes)) {
    if (node.kind !== 'texture_meta' || node.verdict === 'used' || node.verdict === 'error') continue;
    const tex = nodes[node.path.replace(/\.mcmeta$/i, '')];
    if (!tex) continue; // orphaned mcmeta — already surfaced as its own warning
    node.verdict = tex.verdict === 'error' ? 'review' : tex.verdict;
    node.confidence = tex.confidence;
    node.evidence = [
      { kind: 'note', detail: `Hreyfilýsigögn fyrir ${tex.path.split('/').pop()} — fylgja niðurstöðu áferðarinnar (${verdictLabel(tex.verdict)}).` },
      ...tex.evidence.slice(0, 2),
    ];
  }

  // ── Findings ────────────────────────────────────────────────────────────────
  const findings: Finding[] = [];
  let fid = 0;
  const nextId = () => `f${fid++}`;

  // pack.mcmeta / version findings.
  for (const err of meta.errors) {
    findings.push({ id: nextId(), severity: 'error', category: 'pack-meta',
      title: 'Vandamál í pack.mcmeta', detail: err, path: 'pack.mcmeta',
      evidence: [{ kind: 'note', detail: err, source: 'pack.mcmeta' }], confidence: 'certain' });
  }
  // System / format mismatch — either system used against the wrong format.
  const hasItemDefs = graph.byKind.item_definition.length > 0;
  if (meta.itemSystem === 'legacy-overrides' && hasItemDefs) {
    findings.push({ id: nextId(), severity: 'warning', category: 'system-mismatch',
      title: 'Hlutaskilgreiningar eru til staðar en pack_format er of gamalt',
      detail: `Pakkinn skilgreinir pack_format ${meta.packFormat} (${meta.versionLabel}) en inniheldur assets/<ns>/items/-skilgreiningar sem Minecraft les aðeins frá útgáfu 1.21.4 (snið 46). Þessar skrár verða hunsaðar í tilgreindri útgáfu.`,
      path: 'pack.mcmeta', confidence: 'high',
      evidence: [{ kind: 'note', detail: `Hlutaskilgreiningar fundust: ${graph.byKind.item_definition.length}.` }] });
  }
  if (meta.itemSystem === 'item-definition' && graph.hasLegacyOverrides && !hasItemDefs) {
    findings.push({ id: nextId(), severity: 'warning', category: 'system-mismatch',
      title: 'Gamlar custom_model_data-yfirskriftir í útgáfu sem hunsar þær',
      detail: `Pakkinn skilgreinir pack_format ${meta.packFormat} (${meta.versionLabel}), þar sem "overrides" með custom_model_data-skilyrðum virka ekki lengur. Minecraft 1.21.4 og nýrra les hlutalíkön úr assets/<ns>/items/. Þessar yfirskriftir birta því ekkert; færðu þær yfir í hlutaskilgreiningar.`,
      path: 'pack.mcmeta', confidence: 'high',
      evidence: [{ kind: 'note', detail: 'Líkön með "overrides"-lista fundust en engar skilgreiningar í assets/<ns>/items/.' }] });
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
      title: `custom_model_data ${c.value} er úthlutað tvisvar á ${c.baseItem}`,
      detail: `${c.system === 'legacy-overrides' ? 'Gömlu yfirskriftirnar' : 'Hlutaskilgreiningin'} fyrir ${c.baseItem} tengja sama custom_model_data-gildi (${c.value}) við fleiri en eitt líkan. Aðeins eitt þeirra birtist í leiknum.`,
      refs: c.entries.map((e) => e.model), confidence: 'high',
      evidence: c.entries.map((e) => ({ kind: 'note' as const, detail: `→ ${e.model}`, source: e.source })),
      consequence: 'Gefðu hverju afbrigði eigið custom_model_data-gildi eða fjarlægðu tvítekninguna.' });
  }

  // Duplicate textures.
  for (const g of duplicates) {
    const [keep, ...rest] = g.members;
    findings.push({ id: nextId(), severity: 'cleanup', category: g.kind === 'exact' ? 'duplicate-exact' : 'duplicate-near',
      title: g.kind === 'exact'
        ? `Nákvæmlega eins áferðir: ${g.members.length}`
        : `Næstum eins áferðir: ${g.members.length} (aHash-fjarlægð ${g.distance})`,
      detail: g.kind === 'exact'
        ? `Þetta eru nákvæmlega eins afrit af sömu skrá. Þú getur sameinað þau og uppfært tilvísanir.`
        : `Þessar áferðir líta næstum eins út. Athugaðu hvort þær eigi að vera ein áferð.`,
      refs: g.members, path: keep, confidence: g.kind === 'exact' ? 'high' : 'low',
      evidence: g.members.map((m) => ({ kind: 'note' as const, detail: m === keep ? `${m} (halda)` : `${m} (afrit skrárinnar sem er haldið)`, source: m })),
      consequence: g.kind === 'exact'
        ? 'Skrárnar eru eins og má sameina. Staðfestu fyrst að ekkert reiði sig á nákvæma slóð þeirra.'
        : 'Skrárnar eru næstum eins — ekki sameina þær sjálfvirkt; munurinn gæti verið viljandi.' });
  }

  // Cleanup + review findings from node verdicts.
  const safeRemove = Object.values(nodes).filter((n) => n.verdict === 'safe-remove');
  const review = Object.values(nodes).filter((n) => n.verdict === 'review');
  for (const n of safeRemove) {
    findings.push({ id: nextId(), severity: 'cleanup', category: 'unreferenced',
      title: `Engar tilvísanir: ${labelKind(n.kind)}`,
      detail: describeUnreferenced(n),
      path: n.path, confidence: n.confidence,
      evidence: evidenceFor(n, graph),
      consequence: consequenceFor(n) });
  }
  for (const n of review) {
    // Only surface review items that are genuine entry points or leaves worth a look.
    if (n.kind === 'texture' || n.kind === 'model' || isEntryKind(n.kind)) {
      findings.push({ id: nextId(), severity: 'info', category: 'review',
        title: `Yfirferð: ${labelKind(n.kind)} án staðfestrar notkunar`,
        detail: describeReview(n),
        path: n.path, confidence: n.confidence,
        evidence: evidenceFor(n, graph),
        consequence: 'Haltu skránni nema þú getir staðfest að ekkert noti hana. Ritillinn sér ekki kóða viðbóta eða NBT sem er búið til með fjölvum.' });
    }
  }

  // ── Summary + sort ──────────────────────────────────────────────────────────
  findings.sort(compareFindings);

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
    blindSpots.push(`Pakkinn skilgreinir möppur fyrir útgáfusértækar yfirskriftir: ${meta.overlays.length} (${meta.overlays.join(', ')}). Þær eru hlaðnar í tilteknum útgáfum og greindar sérstaklega. Skrár í þeim eru merktar til yfirferðar, aldrei eyðingar.`);
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
  for (let i = 0; i < queue.length; i++) {  // index cursor — shift() is O(n²) on big packs
    for (const to of nodes[queue[i]]?.refs ?? []) {
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
    } else if (ctx.usedCertain) {
      // Also reachable from a certain root (e.g. a custom font pulled in by the
      // default font's reference provider) — provably used, don't demote it.
      node.verdict = 'used'; node.confidence = 'certain';
      ev.push({ kind: 'referenced-by', detail: 'Tilvísun kemur úr skrá sem er örugglega hlaðið, auk þess sem þessi skrá er sjálf upphafspunktur.' });
    } else {
      // Uncertain root: an entry point we cannot confirm is invoked.
      const dpUsed = node.datapackRefs.length > 0;
      if (dpUsed) {
        node.verdict = 'used'; node.confidence = 'high';
        for (const d of node.datapackRefs) ev.push({ kind: 'datapack', detail: `${d.via} = ${d.value}`, source: `${d.pack}: ${d.file}` });
      } else {
        node.verdict = 'review'; node.confidence = 'medium';
        ev.push({ kind: 'ambiguity', detail: ctx.root.reason });
        ev.push({ kind: 'no-reference', detail: 'Enginn af opnu gagnapökkunum vísar í þennan upphafspunkt.' });
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
    ev.push({ kind: 'referenced-by', detail: 'Aðeins er vísað í þetta gegnum sérsniðinn upphafspunkt með óstaðfesta notkun.' });
    node.evidence = ev; return;
  }

  // Reachable from nothing → cleanup candidate.
  classifyUnreferenced(node);
}

/** Decide safe-remove vs review for a genuinely unreferenced asset. */
function classifyUnreferenced(node: AssetNode) {
  const ev: Evidence[] = [{ kind: 'no-reference', detail: 'Hvorki útlitspakkinn, upprunaleg slóð í leiknum né opnir gagnapakkar vísa í þessa skrá.' }];
  if (node.kind === 'texture') {
    const loc = texturePathToLoc(node.path);
    if (!loc) {
      // Non-standard path: not under assets/<ns>/textures/. Most often a pack
      // overlay directory, whose internal references we do not resolve. Never
      // flag these for removal — keep for review.
      node.verdict = 'review'; node.confidence = 'low';
      ev.push({ kind: 'ambiguity', detail: 'Áferðin er ekki á hefðbundinni assets/<ns>/textures/-slóð. Hún gæti verið í möppu fyrir útgáfusértækar yfirskriftir sem leikurinn les sérstaklega. Hún er því merkt til yfirferðar, ekki eyðingar.' });
    } else if (loc.namespace !== 'minecraft') {
      node.verdict = 'safe-remove'; node.confidence = 'high';
      ev.push({ kind: 'note', detail: `Eigið nafnarými "${loc.namespace}" — getur ekki komið í stað upprunalegrar skrár og er því ekki hlaðið sjálfkrafa.` });
    } else if (isStrongOverridePath(loc.path)) {
      // Shouldn't reach here (handled as convention), but guard anyway.
      node.verdict = 'used'; node.confidence = 'certain';
    } else if (isKnownVanillaTexture(loc.path)) {
      node.verdict = 'used'; node.confidence = 'high'; node.vanillaOverride = true;
    } else {
      // A minecraft-namespace texture whose name we don't positively recognise.
      // Our vanilla manifest has known holes (multi-frame item sprites like
      // clock_04, pre-1.13 blocks/ items/ layouts), and if the name IS vanilla,
      // vanilla's own model still loads it — so this must never be safe-remove.
      node.verdict = 'review'; node.confidence = 'medium';
      ev.push({ kind: 'ambiguity', detail: 'Áferð í minecraft-nafnarýminu sem er ekki í skránni okkar yfir upprunaleg tilföng. Leikurinn gæti samt hlaðið henni ef hún kemur í stað upprunalegrar áferðar með óþekktu heiti, svo sem hreyfiramma eða eldri skrá. Hún er því merkt til yfirferðar, aldrei eyðingar.' });
    }
  } else if (node.kind === 'texture_meta') {
    // Mirrored to its paired texture in a post-pass; this default only applies
    // to unpaired edge cases. Keep, never remove blindly.
    node.verdict = 'review'; node.confidence = 'medium';
    ev.push({ kind: 'note', detail: 'Hreyfilýsigögn — fylgja tilheyrandi áferð.' });
  } else if (node.kind === 'model') {
    const loc = modelPathToLoc(node.path);
    if (!loc) {
      // Not under a standard assets/<ns>/models/ path — most often a pack
      // overlay directory. Never flag those for removal.
      node.verdict = 'review'; node.confidence = 'low';
      ev.push({ kind: 'ambiguity', detail: 'Líkanið er ekki á hefðbundinni assets/<ns>/models/-slóð. Það gæti verið í möppu fyrir útgáfusértækar yfirskriftir sem leikurinn les sérstaklega. Það er því merkt til yfirferðar, ekki eyðingar.' });
    } else if (loc.namespace !== 'minecraft') {
      node.verdict = 'safe-remove'; node.confidence = 'high';
      ev.push({ kind: 'note', detail: 'Líkan í eigin nafnarými sem hvorki kubbaástand, hlutaskilgreining, yfirskrift né tengill á yfirlíkan vísar í.' });
    } else {
      // Vanilla model names our registry-derived heuristic can miss (door
      // left/right variants, pulling_0 frames, template_*) would still be
      // rendered by vanilla's own blockstates — never safe-remove on a guess.
      node.verdict = 'review'; node.confidence = 'medium';
      ev.push({ kind: 'ambiguity', detail: 'Líkan í minecraft-nafnarýminu án tilvísana innan pakkans og með heiti sem við þekkjum ekki úr upprunalega leiknum. Ef það kemur í stað upprunalegs líkans birtir leikurinn það samt. Það er því merkt til yfirferðar.' });
    }
  } else if (node.kind === 'sound') {
    node.verdict = 'review'; node.confidence = 'medium';
    ev.push({ kind: 'ambiguity', detail: 'Ekki skráð í neinu sounds.json. Gagnapakki gæti spilað það með /playsound og beinni slóð, sem við getum ekki staðfest að fullu.' });
  } else {
    node.verdict = 'review'; node.confidence = 'low';
    ev.push({ kind: 'ambiguity', detail: 'Engin föst tilvísun fannst en tilvísun gæti verið búin til við keyrslu.' });
  }
  node.evidence = ev;
}

// ── Evidence + descriptions ───────────────────────────────────────────────────
function evidenceFor(node: AssetNode, graph: Graph): Evidence[] {
  const ev = [...node.evidence];
  // Add provenance: who uses this.
  for (const from of node.usedBy.slice(0, 12)) {
    ev.push({ kind: 'referenced-by', detail: `Vísað í af ${from.split('/').slice(-2).join('/')}`, source: from });
  }
  if (node.usedBy.length > 12) ev.push({ kind: 'note', detail: `…og ${node.usedBy.length - 12} til viðbótar.` });
  // What this references.
  for (const to of node.refs.slice(0, 8)) {
    ev.push({ kind: 'references', detail: `Notar ${to.split('/').slice(-2).join('/')}`, source: to });
  }
  return ev;
}

function describeUnreferenced(n: AssetNode): string {
  const size = n.bytes ? ` (${fmtBytes(n.bytes)})` : '';
  return `Ekkert vísar í ${n.path}${size}: hvorki líkan, kubbaástand, hlutaskilgreining, áferðarsafn, letur, ögn, búnaður né opinn gagnapakki.`;
}

function describeReview(n: AssetNode): string {
  return `Notkun ${n.path} er óstaðfest, en tilvísun gæti verið til staðar þar sem ritillinn sér ekki.`;
}

function consequenceFor(n: AssetNode): string {
  if (n.confidence === 'high') {
    return `Eyðing losar ${fmtBytes(n.bytes ?? 0)} án þekktra áhrifa á leikinn. Staðfestu fyrst að engin þjónsviðbót vísi í skrána eftir fastri slóð.`;
  }
  return `Líklega óhætt að fjarlægja. Ef skráin kemur í stað upprunalegs tilfangs með sama heiti eða viðbót hleður henni eftir slóð hefur eyðing þó áhrif á leikinn. Farðu yfir þetta áður en þú eyðir.`;
}

function buildBlindSpots(datapackRefs: DatapackRef[], datapacks: string[], graph: Graph): string[] {
  const spots: string[] = [];
  if (datapacks.length === 0) {
    spots.push('Engir gagnapakkar voru opnaðir. Áferðir, líkön og letur sem aðeins gagnapakki notar (item_model, custom_model_data, font) virðast því ónotuð hér. Bættu gagnapökkunum þínum við til að fá heildarmyndina.');
  }
  spots.push('Þjónsviðbætur (Bukkit/Paper/Spigot) og leikjaviðbætur eru utan pakkans og geta vísað í tilföng eftir föstum slóðum. Ritillinn sér ekki þær tilvísanir.');
  if (datapackRefs.some((r) => r.value === '(object)')) {
    spots.push('Sum custom_model_data-gildi gagnapakka eru hlutir eða fjölvar sem ekki er hægt að greina að fullu án keyrslu. Viðkomandi upphafspunktar hluta eru því merktir til yfirferðar.');
  }
  if (graph.byKind.atlas.length === 0 && graph.byKind.texture.length > 0) {
    spots.push('Engin áferðarsöfn fundust. Ef þjónninn notar möppu sem uppsprettu áferðarsafns sem við sáum ekki gætu sumar áferðir verið í notkun án tilvísunar úr líkani.');
  }
  return spots;
}

// ── Small helpers ─────────────────────────────────────────────────────────────
function isEntryKind(k: AssetKind): boolean {
  return k === 'item_definition' || k === 'font' || k === 'particle' || k === 'equipment' || k === 'atlas' || k === 'blockstate';
}
function labelKind(k: AssetKind): string {
  return assetKindLabel(k);
}
function sevRank(s: Finding['severity']): number {
  return { error: 0, warning: 1, cleanup: 2, info: 3 }[s];
}
function confRank(c: Confidence): number {
  return { certain: 3, high: 2, medium: 1, low: 0 }[c];
}
/** Canonical findings ordering: severity first, then confidence. */
export function compareFindings(a: Finding, b: Finding): number {
  return sevRank(a.severity) - sevRank(b.severity) || confRank(b.confidence) - confRank(a.confidence);
}
export function fmtBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toLocaleString('is-IS', { maximumFractionDigits: 1 })} KB`;
  return `${(b / 1024 / 1024).toLocaleString('is-IS', { maximumFractionDigits: 1 })} MB`;
}

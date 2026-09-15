import { confidenceLabel } from '@/lib/icelandic';
// Shareable report + cleanup-list export.

import type { AnalysisResult } from '../engine/types';
import { fmtBytes } from '../engine/verdict';

const SEV_HEAD: Record<string, string> = {
  error: 'Bilaðar tilvísanir og villur',
  warning: 'Viðvaranir',
  cleanup: 'Möguleg tiltekt',
  info: 'Yfirferð (óstaðfest notkun)',
};

/** A human-readable Markdown report — the shareable deliverable. */
export function generateReportMarkdown(a: AnalysisResult, packName: string): string {
  const L: string[] = [];
  const now = new Date().toISOString().slice(0, 10);
  L.push(`# Pakkaskýrsla — ${packName}`);
  L.push('');
  L.push(`Búið til ${now} með JOÐ-pakkaritlinum.`);
  L.push('');
  L.push(`- Minecraft-útgáfa: **${a.meta.versionLabel ?? 'óþekkt'}** (pack_format ${a.meta.packFormat ?? '?'}, ${a.meta.itemSystem === 'item-definition' ? 'hlutaskilgreiningarkerfi' : a.meta.itemSystem === 'legacy-overrides' ? 'eldra yfirskriftarkerfi' : 'óþekkt kerfi'})`);
  L.push(`- Skrár: ${a.summary.files} · Áferðir: ${a.summary.textures} · Líkön: ${a.summary.models}`);
  L.push(`- Villur: ${a.summary.errors} · Viðvaranir: ${a.summary.warnings} · Skrár án tilvísana: ${a.summary.safeRemove} (má losa ${fmtBytes(a.summary.reclaimableBytes)}) · Til yfirferðar: ${a.summary.review}`);
  if (a.datapacks.length) L.push(`- Gagnapakkar greindir: ${a.datapacks.join(', ')} (tilvísanir fundnar: ${a.datapackRefs.length})`);
  L.push('');

  const bySev: Record<string, typeof a.findings> = { error: [], warning: [], cleanup: [], info: [] };
  for (const f of a.findings) bySev[f.severity].push(f);

  for (const sev of ['error', 'warning', 'cleanup', 'info'] as const) {
    const list = bySev[sev];
    if (!list.length) continue;
    L.push(`## ${SEV_HEAD[sev]} (${list.length})`);
    L.push('');
    for (const f of list) {
      L.push(`### ${f.title}`);
      L.push(`_Vissa: ${confidenceLabel(f.confidence)}_${f.path ? ` · \`${f.path}\`` : ''}`);
      L.push('');
      L.push(f.detail);
      if (f.evidence.length) {
        L.push('');
        L.push('Rökstuðningur:');
        for (const e of f.evidence) L.push(`- ${e.detail}${e.source ? ` (\`${e.source}\`)` : ''}`);
      }
      if (f.consequence) { L.push(''); L.push(`> **Ef þú gerir þessa breytingu:** ${f.consequence}`); }
      L.push('');
    }
  }

  if (a.blindSpots.length) {
    L.push('## Það sem greiningin nær ekki yfir');
    L.push('');
    for (const b of a.blindSpots) L.push(`- ${b}`);
    L.push('');
  }
  return L.join('\n');
}

/** A machine-readable cleanup list (dry-run) — only provably-unreferenced files. */
export function generateCleanupJson(a: AnalysisResult, packName: string): string {
  const items = Object.values(a.nodes)
    .filter((n) => n.verdict === 'safe-remove')
    .map((n) => ({
      path: n.path,
      kind: n.kind,
      bytes: n.bytes ?? 0,
      confidence: n.confidence,
      reason: n.evidence.map((e) => e.detail),
      note: n.confidence === 'high'
        ? 'Ekkert vísar í þetta. Staðfestu að engin þjónsviðbót hlaði skránni eftir fastri slóð.'
        : 'Líklega ónotað, en lestu fyrirvarann um yfirskriftir upprunalegra skráa áður en þú eyðir.',
    }));
  return JSON.stringify({
    pack: packName,
    generated: new Date().toISOString(),
    version: a.meta.versionLabel,
    reclaimableBytes: a.summary.reclaimableBytes,
    dryRun: true,
    note: 'Þetta er listi til yfirferðar, ekki fyrirmæli. Ekkert hefur verið fjarlægt. Farðu yfir hverja færslu áður en þú eyðir.',
    blindSpots: a.blindSpots,
    items,
  }, null, 2);
}

export function download(name: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Shareable report + cleanup-list export.

import type { AnalysisResult } from '../engine/types';
import { fmtBytes } from '../engine/verdict';

const SEV_HEAD: Record<string, string> = {
  error: 'Broken references & errors',
  warning: 'Warnings',
  cleanup: 'Cleanup opportunities',
  info: 'Review (unverified use)',
};

/** A human-readable Markdown report — the shareable deliverable. */
export function generateReportMarkdown(a: AnalysisResult, packName: string): string {
  const L: string[] = [];
  const now = new Date().toISOString().slice(0, 10);
  L.push(`# Pack report — ${packName}`);
  L.push('');
  L.push(`Generated ${now} by the JOÐcraft Pack Editor.`);
  L.push('');
  L.push(`- Minecraft target: **${a.meta.versionLabel ?? 'unknown'}** (pack_format ${a.meta.packFormat ?? '?'}, ${a.meta.itemSystem} system)`);
  L.push(`- ${a.summary.files} files · ${a.summary.textures} textures · ${a.summary.models} models`);
  L.push(`- ${a.summary.errors} errors · ${a.summary.warnings} warnings · ${a.summary.safeRemove} provably unreferenced (${fmtBytes(a.summary.reclaimableBytes)} reclaimable) · ${a.summary.review} to review`);
  if (a.datapacks.length) L.push(`- Datapacks analysed: ${a.datapacks.join(', ')} (${a.datapackRefs.length} references extracted)`);
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
      L.push(`_confidence: ${f.confidence}_${f.path ? ` · \`${f.path}\`` : ''}`);
      L.push('');
      L.push(f.detail);
      if (f.evidence.length) {
        L.push('');
        L.push('Evidence:');
        for (const e of f.evidence) L.push(`- ${e.detail}${e.source ? ` (\`${e.source}\`)` : ''}`);
      }
      if (f.consequence) { L.push(''); L.push(`> **If you act on this:** ${f.consequence}`); }
      L.push('');
    }
  }

  if (a.blindSpots.length) {
    L.push('## What this analysis cannot see');
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
        ? 'Nothing references this. Confirm no server plugin loads it by hardcoded path.'
        : 'Likely unused, but review the vanilla-override caveat before deleting.',
    }));
  return JSON.stringify({
    pack: packName,
    generated: new Date().toISOString(),
    version: a.meta.versionLabel,
    reclaimableBytes: a.summary.reclaimableBytes,
    dryRun: true,
    note: 'This is a review list, not an instruction. Nothing has been removed. Confirm each entry before deleting.',
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

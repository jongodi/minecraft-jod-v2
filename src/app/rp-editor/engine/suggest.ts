// ─────────────────────────────────────────────────────────────────────────────
// Fix suggestions
//
// Given a broken reference, rank the pack's REAL assets of the right kind by
// similarity to the broken value. Suggestions are drawn only from files that
// actually exist, so applying one can never introduce a new broken reference.
// A confident (above-threshold) best match is offered as an auto-fill; weak
// matches are left for the user to choose or skip.
// ─────────────────────────────────────────────────────────────────────────────

import type { AnalysisResult, BrokenRef } from './types';
import { parseLoc, texturePathToLoc, modelPathToLoc, fmtLoc } from './resloc';

function bigrams(s: string): Map<string, number> {
  const m = new Map<string, number>();
  for (let i = 0; i < s.length - 1; i++) {
    const g = s.slice(i, i + 2);
    m.set(g, (m.get(g) ?? 0) + 1);
  }
  return m;
}

/** Sørensen–Dice coefficient on character bigrams (0..1). */
function dice(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;
  const A = bigrams(a);
  const B = bigrams(b);
  let inter = 0;
  for (const [g, c] of A) if (B.has(g)) inter += Math.min(c, B.get(g)!);
  const total = (a.length - 1) + (b.length - 1);
  return (2 * inter) / total;
}

/** Similarity between a broken value's path and a candidate path. */
function score(qPath: string, qName: string, cPath: string, cName: string): number {
  const nameSim = dice(qName, cName);
  const pathSim = dice(qPath, cPath);
  let s = Math.max(nameSim, pathSim * 0.9);
  if (cName === qName) s = Math.max(s, 0.95);          // same filename, different folder
  if (cPath.includes(qName) || qPath.includes(cName)) s = Math.max(s, 0.8);
  return s;
}

interface Candidate { loc: string; path: string; name: string }

/** Every pack asset of the target kind, as a resource-location candidate. */
export function candidatesFor(targetKind: BrokenRef['targetKind'], analysis: AnalysisResult): Candidate[] {
  const out: Candidate[] = [];
  if (targetKind === 'model') {
    for (const p of analysis.byKind.model) {
      const loc = modelPathToLoc(p);
      if (loc) out.push({ loc: fmtLoc(loc), path: loc.path, name: loc.path.split('/').pop() ?? loc.path });
    }
  } else {
    // texture or font bitmap — both draw from the texture pool.
    for (const p of analysis.byKind.texture) {
      const loc = texturePathToLoc(p);
      if (!loc) continue;
      const rendered = targetKind === 'font' ? `${fmtLoc(loc)}.png` : fmtLoc(loc);
      out.push({ loc: rendered, path: loc.path, name: loc.path.split('/').pop() ?? loc.path });
    }
  }
  return out;
}

const CONFIDENT = 0.42;

/** Ranked replacement candidates (resource-location strings) for a broken value. */
export function suggestReplacements(
  value: string,
  targetKind: BrokenRef['targetKind'],
  analysis: AnalysisResult,
  limit = 8,
): string[] {
  const q = parseLoc(value).path.replace(/\.(png|json)$/i, '');
  const qName = q.split('/').pop() ?? q;
  const scored = candidatesFor(targetKind, analysis)
    .map((c) => ({ c, s: score(q, qName, c.path.replace(/\.(png|json)$/i, ''), c.name.replace(/\.(png|json)$/i, '')) }))
    .filter((x) => x.s > 0.12)
    .sort((a, b) => b.s - a.s);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const { c } of scored) {
    if (seen.has(c.loc)) continue;
    seen.add(c.loc);
    out.push(c.loc);
    if (out.length >= limit) break;
  }
  return out;
}

/** The single best replacement, or null if nothing is confident enough to auto-fill. */
export function bestReplacement(
  value: string,
  targetKind: BrokenRef['targetKind'],
  analysis: AnalysisResult,
): string | null {
  const q = parseLoc(value).path.replace(/\.(png|json)$/i, '');
  const qName = q.split('/').pop() ?? q;
  let best: { loc: string; s: number } | null = null;
  for (const c of candidatesFor(targetKind, analysis)) {
    const s = score(q, qName, c.path.replace(/\.(png|json)$/i, ''), c.name.replace(/\.(png|json)$/i, ''));
    if (!best || s > best.s) best = { loc: c.loc, s };
  }
  return best && best.s >= CONFIDENT ? best.loc : null;
}

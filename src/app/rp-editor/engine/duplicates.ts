// ─────────────────────────────────────────────────────────────────────────────
// Duplicate + near-duplicate texture detection
//
// Exact:  identical file-content hash, cross-checked against byte length,
//         dimensions and perceptual hash so a 32-bit hash collision can never
//         group two different textures as "identical".
// Near:   perceptual average-hash (aHash) within a small Hamming distance.
//
// Near-duplicates are reported but NEVER auto-merged — a 1px difference can be
// intentional. The report says so.
// ─────────────────────────────────────────────────────────────────────────────

import type { AssetNode, DuplicateGroup } from './types';

/** Hamming distance between two equal-length hex strings (nibble-wise popcount). */
function hexHamming(a: string, b: string): number {
  if (a.length !== b.length) return 64;
  let d = 0;
  for (let i = 0; i < a.length; i++) {
    let x = parseInt(a[i], 16) ^ parseInt(b[i], 16);
    while (x) { d += x & 1; x >>= 1; }
  }
  return d;
}

const NEAR_THRESHOLD = 5;      // out of 64 bits
const NEAR_PAIR_CAP = 4_000;   // texture count above which we skip the O(n²) pass

export function findDuplicates(nodes: Record<string, AssetNode>): {
  groups: DuplicateGroup[];
  nearCapped: boolean;
} {
  const textures = Object.values(nodes).filter((n) => n.kind === 'texture' && n.image);

  // ── Exact groups by content hash + corroborating fingerprint ────────────────
  // The content hash is 32-bit; folding in byte length, dimensions and the
  // 64-bit aHash makes an accidental "identical" grouping practically impossible.
  const byHash = new Map<string, string[]>();
  for (const t of textures) {
    const h = t.image?.hash;
    if (!h) continue;
    const key = `${h}|${t.bytes ?? 0}|${t.image?.width}x${t.image?.height}|${t.image?.ahash ?? ''}`;
    (byHash.get(key) ?? byHash.set(key, []).get(key)!).push(t.path);
  }
  const groups: DuplicateGroup[] = [];
  const exactMembers = new Set<string>();
  for (const [, members] of byHash) {
    if (members.length > 1) {
      members.sort();
      groups.push({ kind: 'exact', members });
      members.forEach((m) => exactMembers.add(m));
    }
  }

  // ── Near groups by aHash (skip exact dupes, cap on size) ────────────────────
  let nearCapped = false;
  const candidates = textures.filter((t) => t.image?.ahash && !exactMembers.has(t.path));
  if (candidates.length > NEAR_PAIR_CAP) {
    nearCapped = true;
  } else {
    // Union-find over near pairs.
    const parent = new Map<string, string>();
    const find = (x: string): string => {
      let r = x;
      while (parent.get(r) && parent.get(r) !== r) r = parent.get(r)!;
      parent.set(x, r);
      return r;
    };
    const union = (a: string, b: string) => { parent.set(find(a), find(b)); };
    for (const c of candidates) parent.set(c.path, c.path);

    const minDist = new Map<string, number>();
    for (let i = 0; i < candidates.length; i++) {
      for (let j = i + 1; j < candidates.length; j++) {
        const d = hexHamming(candidates[i].image!.ahash ?? '', candidates[j].image!.ahash ?? '');
        if (d <= NEAR_THRESHOLD) {
          union(candidates[i].path, candidates[j].path);
          const key = [candidates[i].path, candidates[j].path].sort().join('|');
          minDist.set(key, d);
        }
      }
    }
    const clusters = new Map<string, string[]>();
    for (const c of candidates) {
      const root = find(c.path);
      (clusters.get(root) ?? clusters.set(root, []).get(root)!).push(c.path);
    }
    for (const members of clusters.values()) {
      if (members.length > 1) {
        members.sort();
        // Representative distance = smallest pair distance in the cluster.
        let best = NEAR_THRESHOLD;
        for (let i = 0; i < members.length; i++)
          for (let j = i + 1; j < members.length; j++) {
            const key = [members[i], members[j]].sort().join('|');
            if (minDist.has(key)) best = Math.min(best, minDist.get(key)!);
          }
        groups.push({ kind: 'near', distance: best, members });
      }
    }
  }

  return { groups, nearCapped };
}

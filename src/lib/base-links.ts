/* The base maps as the home page links to them (src/lib/bluemap-bases.ts
   makes the list on the server). Kept apart from that module so the page's
   script never carries the bases' manifests. */

/** What the home page needs of a base to link to its viewer at /kort/<id>. */
export interface BaseLink {
  id: string;
  name: string;
  x: number;
  z: number;
  radius: number;
}

/** A base's viewer. */
export const baseUrl = (id: string): string => `/kort/${id}`;

/** The base whose rendered square holds a point, if any (the nearest centre where two overlap). */
export function baseAt<T extends Omit<BaseLink, 'id' | 'name'>>(bases: readonly T[], point: { x: number; z: number }): T | null {
  let best: T | null = null;
  let bestD = Infinity;
  for (const b of bases) {
    if (Math.abs(point.x - b.x) > b.radius || Math.abs(point.z - b.z) > b.radius) continue;
    const d = Math.hypot(point.x - b.x, point.z - b.z);
    if (d < bestD) { best = b; bestD = d; }
  }
  return best;
}

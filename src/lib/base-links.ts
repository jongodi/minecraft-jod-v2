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

/** The edges of the main map's rendered world, in blocks: the same edges the
    viewer holds its camera inside (boundsOf in scripts/bluemap-brand.mjs,
    written into src/lib/bluemap-viewer.json by map:brand). 'circle' when the
    render mask is round, and the edge is the ellipse inside the box. */
export interface MapBounds { minX: number; maxX: number; minZ: number; maxZ: number; shape: 'box' | 'circle' }

/** Whether a point stands on the main map's rendered ground. */
export function onMap(bounds: MapBounds, point: { x: number; z: number }): boolean {
  if (bounds.shape === 'circle') {
    const rx = (bounds.maxX - bounds.minX) / 2;
    const rz = (bounds.maxZ - bounds.minZ) / 2;
    return Math.hypot((point.x - (bounds.minX + rx)) / rx, (point.z - (bounds.minZ + rz)) / rz) <= 1;
  }
  return point.x >= bounds.minX && point.x <= bounds.maxX && point.z >= bounds.minZ && point.z <= bounds.maxZ;
}

/** The 3D map a place is seen in: the main map when it stands on that map's
    rendered ground, else the base whose own map holds it, else none. Before
    the main map's edges are known (no copy synced yet), a place no base holds
    is taken to be on the main map, as it always was. */
export function mapAt<T extends Omit<BaseLink, 'id' | 'name'>>(bases: readonly T[], bounds: MapBounds | null, point: { x: number; z: number }): 'main' | T | null {
  if (bounds && onMap(bounds, point)) return 'main';
  return baseAt(bases, point) ?? (bounds ? null : 'main');
}

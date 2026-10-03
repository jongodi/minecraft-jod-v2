import config from '@/lib/map-bases.json';
import jodville from '@/lib/map-bases/jodville.json';
import faraway from '@/lib/map-bases/faraway.json';
import bustadur from '@/lib/map-bases/bustadur.json';
import shroomy from '@/lib/map-bases/shroomy.json';
import { copyOf, type Copy, type Snapshot } from '@/lib/bluemap-snapshot';
import type { BaseLink } from '@/lib/base-links';

/* The base maps: small BlueMap maps of the other bases, kept apart from the
   main map (src/lib/map-bases.json). Each is uploaded by hand, on its own,
   with npm run map:bases -- --upload <id>, into a folder of its own in the
   store, and its manifest is src/lib/map-bases/<id>.json, in the same shape as
   the main map's. map:sync never reads, uploads or cleans up any of it. A base
   that hasn't been uploaded yet has an empty manifest, and no viewer. */

/* Every base in map-bases.json has its manifest here (a test checks). */
const MANIFESTS: Record<string, unknown> = { jodville, faraway, bustadur, shroomy };

const EMPTY: Snapshot = { syncedAt: null, files: [] };

export interface Base {
  id: string;
  name: string;
  /** the centre, with y at ground level */
  x: number;
  y: number;
  z: number;
  /** blocks each way from the centre that are rendered */
  radius: number;
  copy: Copy;
}

export const BASES: Base[] = config.bases.map((b) => ({
  id: b.id,
  name: b.name,
  x: b.x,
  y: b.y,
  z: b.z,
  radius: b.radius,
  copy: copyOf((MANIFESTS[b.id] as Snapshot | undefined) ?? EMPTY),
}));

const byId = new Map(BASES.map((b) => [b.id, b]));

/** A base by its id, uploaded or not. */
export const baseNamed = (id: string): Base | null => byId.get(id) ?? null;

/** The bases whose copy is in the store: the ones with a viewer at /kort/<id>. */
export const uploadedBases = (): Base[] => BASES.filter((b) => b.copy.hasFiles && b.copy.blob !== null && b.copy.version !== null);

/** The base copy a map path is in (maps/<id>/…), or null for the main map and any other. */
export function baseCopyFor(path: string): Copy | null {
  const id = /^maps\/([^/]+)\//.exec(path)?.[1];
  return id ? byId.get(id)?.copy ?? null : null;
}

/** The uploaded bases, as the home page links to them: no manifests, so the page stays light. */
export const baseLinks = (): BaseLink[] => uploadedBases().map(({ id, name, x, z, radius }) => ({ id, name, x, z, radius }));

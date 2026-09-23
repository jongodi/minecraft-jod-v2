import snapshotFile from '@/lib/bluemap-snapshot.json';

/* The copy of the map kept on the site, as `npm run map:sync` last wrote it:
   when it was taken, which files it holds, where the store is, and the
   version the viewer asks for them under. */

export interface Snapshot {
  syncedAt: string | null;
  /** Changes with every sync; the viewer reads the map from /bluemap-data/<version>/maps. */
  version?: string;
  files: string[];
  blob?: { base: string; access: 'public' | 'private' };
  /** The files as they are stored: laid end to end in a few large blobs. at[i]
      is [pack, offset, length] of files[i] in names[pack]. A copy made before
      packs has none, and each file is a blob of its own. */
  packs?: { names: string[]; at: [number, number, number][] };
}

export const snapshot = snapshotFile as unknown as Snapshot;

const files = new Set(snapshot.files);

const packs = snapshot.packs?.at.length === snapshot.files.length ? snapshot.packs : null;
const place = packs ? new Map(snapshot.files.map((rel, i) => [rel, i])) : null;

/** Whether the copy is stored in packs. */
export const isPacked = packs !== null;

/** Where a file of the copy sits in its pack, when the copy is packed. */
export function packedAt(path: string): { name: string; offset: number; length: number } | null {
  const i = place?.get(path);
  if (!packs || i === undefined) return null;
  const [pack, offset, length] = packs.at[i];
  const name = packs.names[pack];
  return name ? { name, offset, length } : null;
}

/** Whether the copy holds this file (a path under maps/). An empty copy holds nothing it can vouch for. */
export const inSnapshot = (path: string): boolean => files.has(path);

/** Whether there is a copy to consult at all. */
export const hasSnapshot = snapshot.files.length > 0;

const VERSION = /^v[0-9a-z]{1,16}$/;

/** A request under /bluemap-data: the version it was asked under, if any, and the store path.
    /bluemap-data/v1a2b3c/maps/world/… → { version: 'v1a2b3c', path: 'maps/world/…' } */
export function parseDataPath(segments: string[]): { version: string | null; path: string } {
  if (segments.length > 2 && VERSION.test(segments[0]) && segments[1] === 'maps') {
    return { version: segments[0], path: segments.slice(1).join('/') };
  }
  return { version: null, path: segments.join('/') };
}

/** True when the request names this deployment's copy, so the answer can be kept forever. */
export const isCurrentVersion = (version: string | null): boolean =>
  version !== null && snapshot.version !== undefined && version === snapshot.version;

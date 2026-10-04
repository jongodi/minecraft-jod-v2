import snapshotFile from '@/lib/bluemap-snapshot.json';

/* The copy of the map kept on the site, as `npm run map:sync` last wrote it:
   when it was taken, which files it holds, where the store is, and the
   version the viewer asks for them under. The base maps have copies of their
   own, in the same shape (src/lib/bluemap-bases.ts). */

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

/** One map's copy in the store, read off its manifest. */
export interface Copy {
  syncedAt: string | null;
  version: string | null;
  /** Every file the copy holds, as maps/… paths. */
  files: readonly string[];
  blob: Snapshot['blob'] | null;
  /** Whether the copy is stored in packs. */
  isPacked: boolean;
  /** Whether there is a copy to consult at all. An empty copy holds nothing it can vouch for. */
  hasFiles: boolean;
  /** Whether the copy holds this file (a path under maps/). */
  has(path: string): boolean;
  /** Where a file of the copy sits in its pack, when the copy is packed. */
  packedAt(path: string): { name: string; offset: number; length: number } | null;
  /** True when the request names this copy's version, so the answer can be kept forever. */
  isCurrent(version: string | null): boolean;
}

export function copyOf(manifest: Snapshot): Copy {
  const list = Array.isArray(manifest.files) ? manifest.files : [];
  const files = new Set(list);
  const packs = manifest.packs?.at.length === list.length ? manifest.packs : null;
  const place = packs ? new Map(list.map((rel, i) => [rel, i])) : null;
  const version = manifest.version ?? null;
  return {
    syncedAt: manifest.syncedAt ?? null,
    version,
    files: list,
    blob: manifest.blob ?? null,
    isPacked: packs !== null,
    hasFiles: list.length > 0,
    has: (path) => files.has(path),
    packedAt(path) {
      const i = place?.get(path);
      if (!packs || i === undefined) return null;
      const [pack, offset, length] = packs.at[i];
      const name = packs.names[pack];
      return name ? { name, offset, length } : null;
    },
    isCurrent: (asked) => asked !== null && version !== null && asked === version,
  };
}

export const snapshot = snapshotFile as unknown as Snapshot;

/** The main map's copy. */
export const mainCopy = copyOf(snapshot);

/** Whether the copy is stored in packs. */
export const isPacked = mainCopy.isPacked;

/** Where a file of the copy sits in its pack, when the copy is packed. */
export const packedAt = (path: string) => mainCopy.packedAt(path);

/** Whether the copy holds this file (a path under maps/). An empty copy holds nothing it can vouch for. */
export const inSnapshot = (path: string): boolean => mainCopy.has(path);

/** Whether there is a copy to consult at all. */
export const hasSnapshot = mainCopy.hasFiles;

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
export const isCurrentVersion = (version: string | null): boolean => mainCopy.isCurrent(version);

/** When the copy of the map kept on the site was taken, as the home page says it. */
export const syncedOn: string | null = snapshot.syncedAt
  ? new Date(snapshot.syncedAt).toLocaleDateString('is-IS', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Atlantic/Reykjavik' })
  : null;

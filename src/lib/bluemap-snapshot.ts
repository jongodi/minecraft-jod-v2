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
  /** A short fingerprint of each file's bytes, so the next copy can tell what
      changed (scripts/bluemap-pack.mjs). */
  sums?: string[];
  /** The version each file has been the same since: a file the copy before
      already had keeps the address it was first sent under, so browsers and
      the CDN still hold it after a new copy. Left out, every file is the
      copy's own version. */
  since?: string[];
}

/** One map's copy in the store, read off its manifest. */
export interface Copy {
  syncedAt: string | null;
  version: string | null;
  /** Every file the copy holds, as maps/… paths. */
  files: readonly string[];
  /** How many bytes the files come to, when the copy is packed (0 otherwise). */
  bytes: number;
  blob: Snapshot['blob'] | null;
  /** Whether the copy is stored in packs. */
  isPacked: boolean;
  /** Whether there is a copy to consult at all. An empty copy holds nothing it can vouch for. */
  hasFiles: boolean;
  /** Whether the copy holds this file (a path under maps/). */
  has(path: string): boolean;
  /** Where a file of the copy sits in its pack, when the copy is packed. */
  packedAt(path: string): { name: string; offset: number; length: number } | null;
  /** For each file, the version it is read under (`since` in the manifest),
      or null when the manifest doesn't say and every file is the copy's own. */
  since: readonly string[] | null;
  /** True when the request names this copy's version, or the version the
      file has been the same since, so the answer can be kept forever. */
  isCurrent(version: string | null, path?: string): boolean;
}

export function copyOf(manifest: Snapshot): Copy {
  const list = Array.isArray(manifest.files) ? manifest.files : [];
  const files = new Set(list);
  const packs = manifest.packs?.at.length === list.length ? manifest.packs : null;
  const version = manifest.version ?? null;
  const since = Array.isArray(manifest.since) && manifest.since.length === list.length ? manifest.since : null;
  const index = since || packs ? new Map(list.map((rel, i) => [rel, i])) : null;
  return {
    syncedAt: manifest.syncedAt ?? null,
    version,
    files: list,
    bytes: packs ? packs.at.reduce((sum, [, , length]) => sum + length, 0) : 0,
    blob: manifest.blob ?? null,
    isPacked: packs !== null,
    hasFiles: list.length > 0,
    has: (path) => files.has(path),
    packedAt(path) {
      const i = index?.get(path);
      if (!packs || i === undefined) return null;
      const [pack, offset, length] = packs.at[i];
      const name = packs.names[pack];
      return name ? { name, offset, length } : null;
    },
    since,
    isCurrent(asked, path) {
      if (asked === null || version === null) return false;
      if (asked === version) return true;
      const i = path === undefined ? undefined : index?.get(path);
      return since !== null && i !== undefined && since[i] === asked;
    },
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

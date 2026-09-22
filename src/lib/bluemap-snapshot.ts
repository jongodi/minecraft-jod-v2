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
}

export const snapshot = snapshotFile as Snapshot;

const files = new Set(snapshot.files);

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

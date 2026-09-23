// Prints on a member's wall: where they may come from, and how they are
// taken down again. Server only.
import { BLOB_PROXY_PREFIX, deleteStoredImage, isOwnBlobUrl, storageMode } from '@/lib/blob-store';
import { CREW_PATH, LIMITS, cleanText, type CrewEntry, type CrewPhoto } from '@/lib/crew-types';

/** What the browser sends after an upload: the stored file plus its caption. */
export interface PhotoDraft {
  id?:       unknown;
  url?:      unknown;
  pathname?: unknown;
  caption?:  unknown;
  takenAt?:  unknown;
}

const isUuid = (v: unknown): v is string => typeof v === 'string' && /^[0-9a-f-]{36}$/i.test(v);

/** A print is accepted only from this member's own folder in this project's
    store, or from the local screenshots folder in development. Anything else,
    including a draft that is not an object or a path that does not decode, is
    dropped. */
export function photoFromDraft(username: string, draft: PhotoDraft | null | undefined): CrewPhoto | null {
  if (!draft || typeof draft !== 'object' || !isUuid(draft.id) || typeof draft.url !== 'string') return null;
  const id  = draft.id.toLowerCase();
  const url = draft.url;
  const own = (pathname: string) => {
    const m = CREW_PATH.exec(pathname);
    return !!m && m[1] === username.toLowerCase() && m[2].toLowerCase() === id;
  };

  let ok = false;
  try {
    if (isOwnBlobUrl(url)) ok = own(decodeURIComponent(new URL(url).pathname.replace(/^\//, '')));
    else if (url.startsWith(BLOB_PROXY_PREFIX)) ok = own(decodeURIComponent(url.slice(BLOB_PROXY_PREFIX.length)));
    else if (storageMode() === 'local' && /^\/screenshots\/upload-[0-9a-f-]{36}\.(png|jpe?g|webp|gif|avif)$/i.test(url)) ok = url.toLowerCase().includes(id);
  } catch {
    ok = false;   /* a path that does not decode */
  }
  if (!ok) return null;

  const takenAt = typeof draft.takenAt === 'string' && !Number.isNaN(Date.parse(draft.takenAt)) ? new Date(draft.takenAt).toISOString() : null;
  return { id, filename: url, caption: cleanText(draft.caption, LIMITS.caption), uploadedAt: new Date().toISOString(), takenAt };
}

/** Take the prints of an entry (or some of them) out of the store. Never throws. */
export async function removePhotos(photos: CrewPhoto[]): Promise<void> {
  await Promise.all(photos.map(p => deleteStoredImage(p.filename)));
}

export function photosNotIn(entry: CrewEntry, keep: CrewPhoto[]): CrewPhoto[] {
  const ids = new Set(keep.map(p => p.id));
  return entry.photos.filter(p => !ids.has(p.id));
}

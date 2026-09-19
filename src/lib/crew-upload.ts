// A member's print on its way to the store, from the browser: shrunk to a
// sensible size, sent straight to Vercel Blob (or to the server in local
// development), then pinned with the entry that carries it.
import { upload } from '@vercel/blob/client';
import { prepareImage, formatBytes } from '@/lib/client-image';
import { crewBlobPath, takenAtFromFilename } from '@/lib/crew-types';

export interface StorageInfo { mode: 'blob' | 'local' | 'none'; access: 'public' | 'private' | null; maxBytes: number; error: string | null }

/** What the browser holds after an upload and sends when pinning. */
export interface UploadedPrint { id: string; url: string; pathname: string; takenAt: string | null }

export async function fetchStorageInfo(username: string): Promise<StorageInfo> {
  try {
    const res = await fetch(`/api/crew/${username}/upload`, { cache: 'no-store' });
    if (!res.ok) throw new Error();
    return await res.json() as StorageInfo;
  } catch {
    return { mode: 'none', access: null, maxBytes: 0, error: 'Náði ekki í stillingar geymslunnar.' };
  }
}

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/** Read an error message out of any response, JSON or not (Vercel's 413 page is plain text). */
export async function errorFrom(res: Response): Promise<string> {
  const text = await res.text().catch(() => '');
  try {
    const j = JSON.parse(text) as { error?: string; message?: string };
    if (j.error || j.message) return j.error ?? j.message!;
  } catch { /* not json */ }
  if (res.status === 413) return 'Skráin er of stór fyrir þjóninn.';
  if (res.status === 401) return 'Innskráningin er útrunnin. Skráðu þig inn aftur.';
  return `Villa ${res.status}${res.statusText ? ` (${res.statusText})` : ''}`;
}

/** Shrink and store one print. `onProgress` gets 0 to 100 while it travels. */
export async function uploadPrint(username: string, file: File, info: StorageInfo, onProgress: (pct: number) => void): Promise<UploadedPrint> {
  if (info.mode === 'none') throw new Error(info.error ?? 'Myndageymsla er ekki stillt.');
  const prepared = await prepareImage(file);
  if (prepared.blob.size > info.maxBytes) throw new Error(`Of stór eftir minnkun (${formatBytes(prepared.blob.size)}, hámark ${formatBytes(info.maxBytes)}).`);
  const takenAt = takenAtFromFilename(file.name)?.toISOString() ?? null;

  if (info.mode === 'blob') {
    const id = newId();
    const pathname = crewBlobPath(username, id, prepared.ext);
    const blob = await upload(pathname, prepared.blob, {
      access:          info.access ?? 'public',
      handleUploadUrl: `/api/crew/${username}/upload`,
      contentType:     prepared.contentType,
      multipart:       prepared.blob.size > 8 * 1024 * 1024,
      onUploadProgress: ({ percentage }) => onProgress(percentage),
    });
    onProgress(100);
    /* a private store is shown through the site's own proxy */
    const url = info.access === 'private' ? `/api/blob/${blob.pathname.split('/').map(encodeURIComponent).join('/')}` : blob.url;
    return { id, url, pathname: blob.pathname, takenAt };
  }

  const fd = new FormData();
  fd.append('file', new File([prepared.blob], `${file.name.replace(/\.[^.]+$/, '') || 'mynd'}.${prepared.ext}`, { type: prepared.contentType }));
  const res = await fetch(`/api/crew/${username}/upload`, { method: 'POST', body: fd });
  if (!res.ok) throw new Error(await errorFrom(res));
  onProgress(100);
  const saved = await res.json() as { id: string; url: string; pathname: string };
  return { ...saved, takenAt };
}

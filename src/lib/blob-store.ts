// Where uploaded photos live: Vercel Blob in production, /public/screenshots in local dev.
//
// A Blob store is either public or private (chosen when the store is created and
// not changeable afterwards). Public blobs are shown straight from their URL; private
// blobs can only be fetched with the token, so they are served through /api/blob/…
import { promises as fs } from 'fs';
import path from 'path';

export type BlobAccess = 'public' | 'private';

export const BLOB_PROXY_PREFIX = '/api/blob/';
/** Blob path prefixes the proxy is allowed to serve. */
export const SERVABLE_PREFIXES = ['gallery/', 'crew/'];
/** Upper bound for a single photo. Client uploads go straight to Blob, so this is not limited by Vercel's 4.5 MB request body cap. */
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

export function hasBlob(): boolean {
  return !!process.env.BLOB_READ_WRITE_TOKEN;
}

/** Where a photo would be written if it were uploaded right now. */
export function storageMode(): 'blob' | 'local' | 'none' {
  if (hasBlob()) return 'blob';
  // On Vercel the filesystem is read-only, so without a Blob token there is nowhere to put a photo.
  if (process.env.VERCEL) return 'none';
  return 'local';
}

function isPrivateStoreError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  return /private store|private access/i.test(msg);
}

let cachedAccess: BlobAccess | null = null;

/** Which access level the store accepts. BLOB_ACCESS=public|private skips the probe. */
export async function detectBlobAccess(): Promise<BlobAccess> {
  const forced = process.env.BLOB_ACCESS;
  if (forced === 'public' || forced === 'private') return forced;
  if (cachedAccess) return cachedAccess;

  const { put, del } = await import('@vercel/blob');
  try {
    const probe = await put('probe/access-check.txt', 'ok', { access: 'public', addRandomSuffix: true });
    cachedAccess = 'public';
    del(probe.url).catch(() => {});
  } catch (e) {
    if (!isPrivateStoreError(e)) throw e;
    cachedAccess = 'private';
  }
  return cachedAccess;
}

export function blobProxyUrl(pathname: string): string {
  return BLOB_PROXY_PREFIX + pathname.split('/').map(encodeURIComponent).join('/');
}

/** The URL an <img> should use for a blob that was just uploaded. */
export function displayUrlFor(blob: { url: string; pathname: string }, access: BlobAccess): string {
  return access === 'private' ? blobProxyUrl(blob.pathname) : blob.url;
}

/* This project's own store, read off the token the way @vercel/blob builds
   its URLs: https://<storeId>.<access>.blob.vercel-storage.com/<pathname>. */
function ownStoreId(): string | null {
  const id = process.env.BLOB_READ_WRITE_TOKEN?.split('_')[3];
  return id ? id.toLowerCase() : null;
}

/** A URL in this project's Blob store. Any Vercel Blob host is not enough:
    anyone can make a store of their own, and a print pinned from it would skip
    the size and type limits the upload handshake sets. */
export function isOwnBlobUrl(url: string): boolean {
  const id = ownStoreId();
  if (!id) return false;
  try {
    const host = new URL(url).hostname;
    return host === `${id}.public.blob.vercel-storage.com` || host === `${id}.private.blob.vercel-storage.com`;
  } catch {
    return false;
  }
}

export function isBlobHost(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return host === 'blob.vercel-storage.com' || host.endsWith('.blob.vercel-storage.com');
  } catch {
    return false;
  }
}

/**
 * Store an image and return the URL to show it from.
 * `pathname` is the blob path (e.g. gallery/<id>.png); locally the basename lands in /public/screenshots.
 */
export async function storeImage(pathname: string, file: Blob, contentType: string): Promise<string> {
  const mode = storageMode();
  if (mode === 'none') {
    throw new Error('Myndageymsla er ekki stillt: vantar BLOB_READ_WRITE_TOKEN á Vercel.');
  }
  if (mode === 'blob') {
    const { put } = await import('@vercel/blob');
    const access = await detectBlobAccess();
    const opts = { access, contentType, addRandomSuffix: false } as const;
    try {
      const blob = await put(pathname, file, opts);
      return displayUrlFor(blob, access);
    } catch (e) {
      // Probe result was stale: the store turned out to be private
      if (access === 'public' && isPrivateStoreError(e)) {
        cachedAccess = 'private';
        const blob = await put(pathname, file, { ...opts, access: 'private' });
        return displayUrlFor(blob, 'private');
      }
      throw e;
    }
  }
  const filename = `upload-${path.basename(pathname).replace(/[^a-zA-Z0-9._-]/g, '')}`;
  const savePath = path.join(process.cwd(), 'public', 'screenshots', filename);
  await fs.mkdir(path.dirname(savePath), { recursive: true });
  await fs.writeFile(savePath, Buffer.from(await file.arrayBuffer()));
  return `/screenshots/${filename}`;
}

/** Remove a stored image, wherever storeImage() put it. Never throws. */
export async function deleteStoredImage(url: string): Promise<void> {
  try {
    if (url.startsWith(BLOB_PROXY_PREFIX)) {
      if (!hasBlob()) return;
      const { del } = await import('@vercel/blob');
      await del(decodeURIComponent(url.slice(BLOB_PROXY_PREFIX.length)));
    } else if (isBlobHost(url)) {
      if (!hasBlob()) return;
      const { del } = await import('@vercel/blob');
      await del(url);
    } else if (url.startsWith('/screenshots/') && path.basename(url).startsWith('upload-')) {
      /* Built from the screenshots folder and a bare file name, so the build's file
         tracer only pulls public/screenshots into functions, not all of public/.
         Only what storeImage() wrote (upload-*): the bundled screenshots are the
         site's own fallback album and are never deleted from here. */
      const absPath = path.join(process.cwd(), 'public', 'screenshots', path.basename(url));
      await fs.unlink(absPath);
    }
  } catch (e) {
    console.error('deleteStoredImage:', e);
  }
}

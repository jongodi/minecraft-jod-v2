import { get } from '@vercel/blob';
import { packedAt, snapshot } from '@/lib/bluemap-snapshot';
import { discard } from '@/lib/bluemap-server';

/* Reads a file of the map copy out of Vercel Blob. map:sync stores the copy
   as a few large packs (scripts/bluemap-pack.mjs) and the manifest says where
   each file sits in them, so a file is one range request into its pack: the
   same bytes BlueMap wrote, nothing unpacked or recompressed. A copy made
   before packs holds each file as a blob of its own. */

const BLOB_DIR = 'bluemap-data';

/* the types map:sync stores the files under */
const TYPES: Record<string, string> = { gz: 'application/gzip', json: 'application/json', png: 'image/png' };

export function contentTypeOf(path: string): string {
  return TYPES[path.slice(path.lastIndexOf('.') + 1).toLowerCase()] ?? 'application/octet-stream';
}

export interface CopyFile {
  status: 200 | 304;
  body: ReadableStream<Uint8Array> | null;
  contentType: string;
  size: number | null;
  etag: string | null;
}

type Fetched = { status: 200 | 304; body: ReadableStream<Uint8Array> | null; headers: Headers | { get(name: string): string | null } };

/** A file of the copy (a path under maps/). Null when the store doesn't hold
    it; throws when the store can't be read. `ifNoneMatch` only applies to a
    copy stored file by file. */
export async function readCopy(path: string, ifNoneMatch?: string): Promise<CopyFile | null> {
  const packed = packedAt(path);
  if (packed) {
    const { name, offset, length } = packed;
    if (length === 0) return { status: 200, body: null, contentType: contentTypeOf(path), size: 0, etag: null };
    const last = offset + length - 1;
    const res = await fetchBlob(name, { range: `bytes=${offset}-${last}` }, false);
    if (!res) return null;
    /* a store that ignored the range would send the whole pack */
    if (res.headers.get('content-range')?.match(/^bytes (\d+)-(\d+)\//)?.slice(1).join('-') !== `${offset}-${last}`) {
      await discard(res);
      throw new Error(`the store did not answer the byte range for ${path}`);
    }
    return { status: 200, body: res.body, contentType: contentTypeOf(path), size: length, etag: null };
  }

  /* straight from storage: a file the last sync overwrote must not come back
     old from the store's own cache and then be kept for a year */
  const res = await fetchBlob(`${BLOB_DIR}/${path}`, ifNoneMatch ? { 'If-None-Match': ifNoneMatch } : {}, true);
  if (!res) return null;
  const size = Number(res.headers.get('content-length'));
  return {
    status: res.status,
    body: res.body,
    contentType: res.headers.get('content-type') ?? contentTypeOf(path),
    size: res.status === 200 && Number.isFinite(size) && size > 0 ? size : null,
    etag: res.headers.get('etag'),
  };
}

async function fetchBlob(pathname: string, headers: Record<string, string>, fresh: boolean): Promise<Fetched | null> {
  const blob = snapshot.blob;
  if (!blob?.base) return null;
  if (blob.access === 'public') {
    const res = await fetch(`${blob.base}/${pathname.split('/').map(encodeURIComponent).join('/')}`, { headers, cache: 'no-store' });
    if (res.status === 404) {
      await discard(res);
      return null;
    }
    if (res.status !== 304 && !res.ok) {
      await discard(res);
      throw new Error(`Vercel Blob: Failed to fetch blob: ${res.status} ${res.statusText}`);
    }
    return { status: res.status === 304 ? 304 : 200, body: res.body, headers: res.headers };
  }
  const res = await get(pathname, { access: 'private', headers, ...(fresh ? { useCache: false } : {}) });
  if (!res) return null;
  return { status: res.statusCode, body: res.stream, headers: res.headers };
}

import { get } from '@vercel/blob';
import { mainCopy, type Copy } from '@/lib/bluemap-snapshot';
import { discard } from '@/lib/bluemap-server';

/* Reads a file of a map copy out of Vercel Blob. map:sync stores the main
   map's copy as a few large packs (scripts/bluemap-pack.mjs), map:bases each
   base map's the same way, and the manifest says where each file sits in
   them, so a file is one range request into its pack: the same bytes BlueMap
   wrote, nothing unpacked or recompressed. A copy made before packs holds each
   file as a blob of its own. */

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

/** A file of a copy (a path under maps/), the main map's unless another is
    named. Null when the store doesn't hold it; throws when the store can't be
    read. `ifNoneMatch` only applies to a copy stored file by file. */
export async function readCopy(path: string, ifNoneMatch?: string, copy: Copy = mainCopy): Promise<CopyFile | null> {
  const packed = copy.packedAt(path);
  if (packed) {
    const { name, offset, length } = packed;
    if (length === 0) return { status: 200, body: null, contentType: contentTypeOf(path), size: 0, etag: null };
    const body = await readRange(copy, name, offset, length);
    if (body === undefined) return null;
    return { status: 200, body, contentType: contentTypeOf(path), size: length, etag: null };
  }

  /* straight from storage: a file the last sync overwrote must not come back
     old from the store's own cache and then be kept for a year */
  const res = await fetchBlob(copy, `${BLOB_DIR}/${path}`, ifNoneMatch ? { 'If-None-Match': ifNoneMatch } : {}, true);
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

/* The bytes [offset, offset + length) of a pack. The store's cache does not
   always honour a range: a pack it has not cached yet can come back whole,
   with no Content-Range. Then the store itself is asked, past its cache, and
   should that also send more than was asked for, the file is cut out of what
   arrived. The map never gets someone else's bytes, and a store that answers
   at all is never given up on. Undefined when the store doesn't hold the pack. */
async function readRange(copy: Copy, name: string, offset: number, length: number): Promise<ReadableStream<Uint8Array> | undefined> {
  const last = offset + length - 1;
  const range = { range: `bytes=${offset}-${last}` };
  let res: Fetched | null = null;
  for (const fresh of [false, true]) {
    if (res) await discard(res);
    res = await fetchBlob(copy, name, range, fresh);
    if (!res) return undefined;
    const sent = sentRange(res.headers.get('content-range'));
    if (res.body && sent?.[0] === offset && sent[1] === last) return res.body;
  }
  /* the store sent something other than the range: the whole pack (200, no
     Content-Range) or a range that starts earlier */
  const r = res!;
  const sent = sentRange(r.headers.get('content-range'));
  const start = sent ? sent[0] : r.status === 200 ? 0 : null;
  if (start === null || start > offset || (sent && sent[1] < last) || !r.body) {
    await discard(r);
    throw new Error(`the store did not answer the byte range ${offset}-${last} of ${name}`);
  }
  return slice(r.body, offset - start, length);
}

/** [first, last] byte of a Content-Range, or null without one. */
function sentRange(contentRange: string | null): [number, number] | null {
  const m = contentRange?.match(/^bytes (\d+)-(\d+)\//);
  return m ? [Number(m[1]), Number(m[2])] : null;
}

/** `length` bytes of `body`, after skipping `skip`; the rest is let go of unread. */
function slice(body: ReadableStream<Uint8Array>, skip: number, length: number): ReadableStream<Uint8Array> {
  const reader = body.getReader();
  let toSkip = skip;
  let left = length;
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      while (left > 0) {
        const { done, value } = await reader.read();
        if (done) {
          controller.error(new Error('the pack ended before the file did'));
          return;
        }
        let chunk = value;
        if (toSkip > 0) {
          if (chunk.length <= toSkip) { toSkip -= chunk.length; continue; }
          chunk = chunk.subarray(toSkip);
          toSkip = 0;
        }
        if (chunk.length > left) chunk = chunk.subarray(0, left);
        left -= chunk.length;
        controller.enqueue(chunk);
        if (left === 0) break;
        return;
      }
      controller.close();
      void reader.cancel().catch(() => {});
    },
    cancel(reason) {
      void reader.cancel(reason).catch(() => {});
    },
  });
}

async function fetchBlob(copy: Copy, pathname: string, headers: Record<string, string>, fresh: boolean): Promise<Fetched | null> {
  const blob = copy.blob;
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

import { get, BlobNotFoundError } from '@vercel/blob';
import { hasSnapshot, inSnapshot, isCurrentVersion, parseDataPath, snapshot } from '@/lib/bluemap-snapshot';
import { discard, fetchFile, isMissing, resolveServerId } from '@/lib/bluemap-server';

/* The map data, out of Vercel Blob. A public store never reaches this route:
   next.config rewrites /bluemap-data straight to it. A private store can only
   be read with the token, so this route streams it. In development a local
   copy under public/bluemap-data is served as static files before this route
   is ever asked.

   The viewer asks for the map under a version that changes with every sync
   (/bluemap-data/<version>/maps/…, set in public/bluemap/settings.json by
   map:brand), so an answer to a current address never goes stale: the browser
   and the CDN keep it for a year, and a returning visitor reads the whole map
   from disk. The store holds one copy under unversioned paths; the version is
   only in the address.

   Should the store refuse to be read (paused for going over the plan's usage,
   or a token that no longer fits it), the same files come straight off the
   Minecraft server through the exaroton file API, as the map was read before
   there was a copy: slower, and slower still while the server is stopped, but
   the map still opens. */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
/* the texture atlas can take half a minute to come off exaroton the first time */
export const maxDuration = 60;

const BLOB_DIR = 'bluemap-data';
const SEGMENT = /^[A-Za-z0-9_-][A-Za-z0-9_.-]*$/;
const MAX_DEPTH = 16;

const FOREVER = 'public, max-age=31536000, s-maxage=31536000, immutable';
/* an unversioned address, or one from a page older than this deployment */
const FOUND_BRIEF = 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400';
const MISSING_BRIEF = 'public, max-age=60, s-maxage=120';
/* read off the server while the store is refusing: the server may have drawn
   the tile again since the copy, so it is kept for a day, not a year, and the
   copy takes over again once the store answers */
const FROM_SERVER = 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800';

/* the types map:sync stores the files under */
const TYPES: Record<string, string> = { gz: 'application/gzip', json: 'application/json', png: 'image/png' };
const contentType = (path: string): string => TYPES[path.slice(path.lastIndexOf('.') + 1).toLowerCase()] ?? 'application/octet-stream';

type Context = { params: Promise<{ path: string[] }> };

function answer(status: number, cache: string, body: BodyInit | null = null, headers: Record<string, string> = {}): Response {
  return new Response(body, { status, headers: { 'Cache-Control': cache, ...headers } });
}

export async function GET(req: Request, { params }: Context): Promise<Response> {
  const segments = (await params).path ?? [];
  if (segments.length === 0 || segments.length > MAX_DEPTH || !segments.every(s => SEGMENT.test(s))) {
    return answer(400, 'no-store');
  }
  const { version, path } = parseDataPath(segments);
  const current = isCurrentVersion(version);

  /* The copy lists every file it holds, so anything else is missing without
     asking the store: the tiles past the edge of the rendered world, mostly. */
  if (hasSnapshot && !inSnapshot(path)) return answer(404, current ? FOREVER : MISSING_BRIEF);

  const blob = snapshot.blob;
  if (!blob?.base) return answer(404, MISSING_BRIEF);
  if (blob.access === 'public') {
    return Response.redirect(`${blob.base}/${BLOB_DIR}/${path.split('/').map(encodeURIComponent).join('/')}`, 307);
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN) return fromServer(path);

  const cache = current ? FOREVER : FOUND_BRIEF;
  try {
    /* straight from storage: a tile the last sync overwrote must not come back
       old from the store's own cache and then be kept for a year */
    const res = await get(`${BLOB_DIR}/${path}`, {
      access: 'private',
      useCache: false,
      ifNoneMatch: current ? undefined : req.headers.get('if-none-match') ?? undefined,
    });
    if (!res) return answer(404, current ? FOREVER : MISSING_BRIEF);
    const etag = res.blob.etag ? { ETag: res.blob.etag } : undefined;
    if (res.statusCode !== 200 || !res.stream) return answer(304, cache, null, etag);
    return answer(200, cache, res.stream, {
      'Content-Type': res.blob.contentType ?? 'application/octet-stream',
      'Content-Length': String(res.blob.size ?? ''),
      ...etag,
    });
  } catch (err) {
    if (err instanceof BlobNotFoundError) return answer(404, current ? FOREVER : MISSING_BRIEF);
    console.warn(`[bluemap-data] ${err instanceof Error ? err.message : err}; reading /${path} off the server`);
    return fromServer(path);
  }
}

async function fromServer(path: string): Promise<Response> {
  const token = process.env.EXAROTON_API_KEY;
  if (!token) return answer(502, 'no-store');
  try {
    const file = await fetchFile(await resolveServerId(token), token, path);
    if (isMissing(file.status)) {
      await discard(file);
      return answer(404, MISSING_BRIEF);
    }
    if (!file.ok) {
      console.warn(`[bluemap-data] exaroton answered ${file.status} for /${path}`);
      await discard(file);
      return file.status === 429
        ? answer(503, 'no-store', null, { 'Retry-After': '5' })
        : answer(502, 'no-store');
    }
    /* BlueMap's .gz files go out packed, as the store holds them: the viewer unpacks them itself */
    return answer(200, FROM_SERVER, file.body, { 'Content-Type': contentType(path) });
  } catch (err) {
    console.warn(`[bluemap-data] exaroton: ${err instanceof Error ? err.message : err}`);
    return answer(502, 'no-store');
  }
}

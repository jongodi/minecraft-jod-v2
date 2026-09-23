import { BlobNotFoundError } from '@vercel/blob';
import { hasSnapshot, inSnapshot, isCurrentVersion, isPacked, parseDataPath, snapshot } from '@/lib/bluemap-snapshot';
import { contentTypeOf, readCopy } from '@/lib/bluemap-copy';
import { discard, fetchFile, isMissing, resolveServerId } from '@/lib/bluemap-server';

/* The map data, out of Vercel Blob. map:sync stores it as a few large packs,
   and this route reads each file back out of its pack (src/lib/bluemap-copy.ts).
   A copy from before packs, in a public store, never reaches this route:
   next.config rewrites /bluemap-data straight to the store. In development a
   local copy under public/bluemap-data is served as static files before this
   route is ever asked.

   The viewer asks for the map under a version that changes with every sync
   (/bluemap-data/<version>/maps/…, set in public/bluemap/settings.json by
   map:brand), so an answer to a current address never goes stale: the browser
   and the CDN keep it for a year, and a returning visitor reads the whole map
   from disk. The version is only in the address: the manifest this
   deployment carries says which packs hold its copy.

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
/* Read off the server while the store is refusing. The CDN keeps it for a
   month, and keeps handing it out should the server fail to answer when it is
   due, so a tile fetched once stays quick while the server is stopped
   (npm run map:warm fetches them all ahead). Not for a year: the server may
   have redrawn the tile since the copy, and the next sync's version takes
   over anyway. */
const FROM_SERVER = 'public, max-age=86400, s-maxage=2592000, stale-while-revalidate=2592000, stale-if-error=2592000';
/* once the store has refused, it isn't asked again for every tile */
const REFUSED_FOR = 5 * 60_000;
let refusedUntil = 0;

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
  if (blob.access === 'public' && !isPacked) {
    return Response.redirect(`${blob.base}/${BLOB_DIR}/${path.split('/').map(encodeURIComponent).join('/')}`, 307);
  }
  if (blob.access === 'private' && !process.env.BLOB_READ_WRITE_TOKEN) return fromServer(path);
  if (Date.now() < refusedUntil) return fromServer(path);

  const cache = current ? FOREVER : FOUND_BRIEF;
  try {
    const file = await readCopy(path, current ? undefined : req.headers.get('if-none-match') ?? undefined);
    if (!file) return answer(404, current ? FOREVER : MISSING_BRIEF);
    const etag = file.etag ? { ETag: file.etag } : undefined;
    if (file.status === 304) return answer(304, cache, null, etag);
    return answer(200, cache, file.body, {
      'Content-Type': file.contentType,
      ...(file.size !== null ? { 'Content-Length': String(file.size) } : {}),
      ...etag,
    });
  } catch (err) {
    if (err instanceof BlobNotFoundError) return answer(404, current ? FOREVER : MISSING_BRIEF);
    refusedUntil = Date.now() + REFUSED_FOR;
    console.warn(`[bluemap-data] ${err instanceof Error ? err.message : err}; reading the map off the server for the next ${REFUSED_FOR / 60_000} minutes`);
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
    return answer(200, FROM_SERVER, file.body, { 'Content-Type': contentTypeOf(path) });
  } catch (err) {
    console.warn(`[bluemap-data] exaroton: ${err instanceof Error ? err.message : err}`);
    return answer(502, 'no-store');
  }
}

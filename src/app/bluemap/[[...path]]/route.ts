import { readMap } from '@/lib/map';
import { PLACES_SET, placesMarkerSet } from '@/lib/bluemap-markers';
import { hasSnapshot, inSnapshot } from '@/lib/bluemap-snapshot';
import { readCopy } from '@/lib/bluemap-copy';
import { discard, fetchFile, isMissing, isOnline, resolveServerId } from '@/lib/bluemap-server';

/* The BlueMap viewer and its map data, read straight off the Minecraft server.
   BlueMap renders into bluemap/web on the exaroton server, and this route serves
   that folder through the exaroton file API, so the map needs no open port and
   no storage of its own. Vercel's CDN keeps what it can, so exaroton is only
   asked for a tile again once the cached copy has gone stale.

   `npm run map:sync` keeps a copy of the map: the viewer in public/bluemap
   (served before this route is ever asked) and the map data in Vercel Blob,
   reached as /bluemap-data. With map-data-root pointed at that copy in
   BlueMap's webapp.conf, the viewer loads the map from the store and only live
   data (players, markers) comes through here. Anything else that still arrives
   is served live while the server runs and from the copy once it stops, since
   exaroton hands out files far too slowly then to draw a map.

   Live data is shared: the viewer asks for players.json every second and
   markers.json every ten, so the CDN keeps each answer for a moment and every
   open map in a region costs one call to exaroton, not one each. The places
   that have world coordinates are added to markers.json here, so they stand
   in the 3D map whether the server runs or not. */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
/* the texture atlas can take half a minute to come off exaroton the first time */
export const maxDuration = 60;

/* Plain file and folder names only. Nothing starting with a dot gets through,
   so a request can never climb out of the webroot. */
const SEGMENT = /^[A-Za-z0-9_-][A-Za-z0-9_.-]*$/;
const MAX_DEPTH = 16;

const SNAPSHOT_ROOT = '/bluemap-data';

const LIVE     = /^maps\/[^/]+\/live\//;
const PLAYERS  = /^maps\/[^/]+\/live\/players\.json$/;
const MARKERS  = /^maps\/[^/]+\/live\/markers\.json$/;
/* BlueMap's live event stream; exaroton's file API can't carry one, and the
   viewer falls back to polling the moment it is refused */
const EVENTS   = /^maps\/[^/]+\/live\/sse$/;
const TILES    = /^maps\/[^/]+\/tiles\//;
const TEXTURES = /^maps\/[^/]+\/textures\.json(\.gz)?$/;
/* BlueMap stores these gzipped, so ask exaroton for the .gz straight away
   instead of paying a round trip for the plain name first */
const PACKED_FIRST = /(\.prbm|\/textures\.json)$/;

const TYPES: Record<string, string> = {
  html:  'text/html; charset=utf-8',
  js:    'text/javascript; charset=utf-8',
  mjs:   'text/javascript; charset=utf-8',
  css:   'text/css; charset=utf-8',
  json:  'application/json; charset=utf-8',
  conf:  'text/plain; charset=utf-8',
  txt:   'text/plain; charset=utf-8',
  svg:   'image/svg+xml',
  png:   'image/png',
  jpg:   'image/jpeg',
  jpeg:  'image/jpeg',
  webp:  'image/webp',
  gif:   'image/gif',
  ico:   'image/x-icon',
  woff:  'font/woff',
  woff2: 'font/woff2',
  ttf:   'font/ttf',
};

function contentType(path: string): string {
  const ext = path.slice(path.lastIndexOf('.') + 1).toLowerCase();
  return TYPES[ext] ?? 'application/octet-stream';
}

/* Live data (players, markers) changes every few seconds, the hashed viewer
   assets never do, and tiles sit in between: re-rendered now and then, so a
   slightly old copy is fine while a fresh one is fetched in the background.
   Missing tiles are cached briefly so the render can fill them in. */
const LIVE_PLAYERS = 'public, max-age=0, s-maxage=2, stale-while-revalidate=2';
const LIVE_OTHER   = 'public, max-age=0, s-maxage=10, stale-while-revalidate=30';
/* the server is stopped: nothing moves until it starts, and starting takes longer than this */
const STOPPED      = 'public, max-age=0, s-maxage=30, stale-while-revalidate=60';

function cacheControl(path: string, found: boolean): string {
  if (PLAYERS.test(path)) return LIVE_PLAYERS;
  if (LIVE.test(path)) return LIVE_OTHER;
  if (TEXTURES.test(path) && found) {
    /* only changes when BlueMap or its resource packs change */
    return 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800';
  }
  if (path.startsWith('assets/')) {
    return found ? 'public, max-age=31536000, immutable' : 'public, max-age=60, s-maxage=60';
  }
  if (TILES.test(path)) {
    return found
      ? 'public, max-age=300, s-maxage=900, stale-while-revalidate=86400'
      : 'public, max-age=60, s-maxage=120';
  }
  return 'public, max-age=0, s-maxage=300, stale-while-revalidate=3600';
}

function toSnapshot(path: string, cache: string): Response {
  const location = `${SNAPSHOT_ROOT}/${path.split('/').map(encodeURIComponent).join('/')}`;
  return new Response(null, { status: 307, headers: { Location: location, 'Cache-Control': cache } });
}

function json(body: string, cache = 'no-store'): Response {
  return new Response(body, {
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': cache },
  });
}

/* The server is stopped: nobody is online, and the map is whatever was synced last. */
function fromSnapshot(path: string): Response {
  if (PLAYERS.test(path)) return json('{"players":[]}', STOPPED);
  if (inSnapshot(path)) return toSnapshot(path, 'public, max-age=60, s-maxage=60');
  if (LIVE.test(path)) return json('{}', STOPPED);
  return empty(TILES.test(path) ? 204 : 404, 'public, max-age=60, s-maxage=60');
}

/* The marker sets BlueMap wrote, from the server while it runs and from the
   copy while it is stopped; an empty set of sets if neither answers. */
async function baseMarkers(path: string, live: { id: string; token: string } | null): Promise<Record<string, unknown>> {
  try {
    let text: string | null = null;
    if (live) {
      const res = await fetchFile(live.id, live.token, path);
      text = res.ok ? await res.text() : (await discard(res), null);
    } else if (inSnapshot(path)) {
      const file = await readCopy(path);
      text = file?.body ? await new Response(file.body).text() : null;
    }
    const data = text ? JSON.parse(text) : null;
    return data && typeof data === 'object' && !Array.isArray(data) ? data : {};
  } catch {
    return {};
  }
}

async function markers(path: string, live: { id: string; token: string } | null): Promise<Response> {
  const [base, config] = await Promise.all([baseMarkers(path, live), readMap().catch(() => null)]);
  const sets: Record<string, unknown> = { ...base };
  if (config) sets[PLACES_SET] = placesMarkerSet(config.locations);
  return json(JSON.stringify(sets), live ? LIVE_OTHER : STOPPED);
}

function empty(status: number, cache: string): Response {
  return new Response(null, { status, headers: { 'Cache-Control': cache } });
}

function notice(status: number, text: string): Response {
  return new Response(text, {
    status,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

type Context = { params: Promise<{ path?: string[] }> };

export async function GET(req: Request, { params }: Context): Promise<Response> {
  const started = Date.now();
  const segments = (await params).path ?? [];
  const res = await serve(req, segments);
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[bluemap] ${res.status} ${Date.now() - started}ms /${segments.join('/')}`);
  }
  return res;
}

async function serve(req: Request, segments: string[]): Promise<Response> {
  /* /bluemap on its own: the viewer resolves everything relative to its folder */
  if (segments.length === 0) {
    return Response.redirect(new URL('/bluemap/index.html', req.url), 308);
  }
  if (segments.length > MAX_DEPTH || !segments.every((s) => SEGMENT.test(s))) {
    return empty(400, 'no-store');
  }

  const path = segments.join('/');
  if (EVENTS.test(path)) return empty(404, 'public, max-age=3600, s-maxage=86400');

  const token = process.env.EXAROTON_API_KEY;
  if (!token) {
    /* the places stand in the map even when it isn't connected to the server,
       and the viewer's once-a-second ask for players gets an empty list it can
       cache rather than an error every second */
    if (MARKERS.test(path)) return markers(path, null);
    if (path.startsWith('maps/')) return fromSnapshot(path);
    return notice(503, 'Kortið er ekki tengt við þjóninn (EXAROTON_API_KEY vantar).');
  }

  let id: string;
  try {
    id = await resolveServerId(token);
  } catch {
    if (MARKERS.test(path)) return markers(path, null);
    if (path.startsWith('maps/')) return fromSnapshot(path);
    return notice(502, 'Náði ekki sambandi við Exaroton.');
  }

  if (MARKERS.test(path)) {
    return markers(path, (await isOnline(id, token)) ? { id, token } : null);
  }

  if (path.startsWith('maps/') && hasSnapshot) {
    /* the texture atlas rarely changes and takes long to come off exaroton,
       so the synced copy wins even while the server is running */
    if (TEXTURES.test(path) && inSnapshot(path)) {
      return toSnapshot(path, 'public, max-age=3600, s-maxage=3600');
    }
    if (!(await isOnline(id, token))) return fromSnapshot(path);
  }

  let file: Response;
  let packed = false;

  if (PACKED_FIRST.test(path)) {
    file = await fetchFile(id, token, `${path}.gz`);
    packed = file.ok;
    if (isMissing(file.status)) {
      await discard(file);
      file = await fetchFile(id, token, path);
    }
  } else {
    file = await fetchFile(id, token, path);
    /* anything else under maps/ may still turn out to be stored gzipped */
    if (isMissing(file.status) && path.startsWith('maps/') && !path.endsWith('.gz')) {
      const gz = await fetchFile(id, token, `${path}.gz`);
      if (gz.ok) {
        await discard(file);
        file = gz;
        packed = true;
      } else {
        await discard(gz);
      }
    }
  }

  if (isMissing(file.status)) {
    await discard(file);
    /* a tile that isn't rendered yet is an empty patch of map, not an error */
    return empty(TILES.test(path) ? 204 : 404, cacheControl(path, false));
  }
  if (file.status === 429) {
    console.warn(`[bluemap] exaroton rate limit hit on /${path}`);
    await discard(file);
    return new Response(null, { status: 503, headers: { 'Retry-After': '5', 'Cache-Control': 'no-store' } });
  }
  if (!file.ok) {
    console.warn(`[bluemap] exaroton answered ${file.status} for /${path}`);
    await discard(file);
    return empty(502, 'no-store');
  }

  /* Gzipped files go out as they are, marked so the browser unpacks them.
     Streaming them untouched keeps big files like the texture atlas from
     being held in memory or unpacked on the function. */
  const headers: Record<string, string> = {
    'Content-Type': contentType(path),
    'Cache-Control': cacheControl(path, true),
  };
  if (packed) headers['Content-Encoding'] = 'gzip';
  return new Response(file.body, { headers });
}

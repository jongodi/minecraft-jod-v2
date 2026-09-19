import { getExarotonServerId } from '@/lib/exaroton';
import snapshotFile from '@/lib/bluemap-snapshot.json';

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
   exaroton hands out files far too slowly then to draw a map. */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
/* the texture atlas can take half a minute to come off exaroton the first time */
export const maxDuration = 60;

const WEBROOT = 'bluemap/web';
const SERVERS_API = 'https://api.exaroton.com/v1/servers';

/* Plain file and folder names only. Nothing starting with a dot gets through,
   so a request can never climb out of the webroot. */
const SEGMENT = /^[A-Za-z0-9_-][A-Za-z0-9_.-]*$/;
const MAX_DEPTH = 16;

const SNAPSHOT_ROOT = '/bluemap-data';
const snapshot = snapshotFile as { syncedAt: string | null; files: string[]; blob?: { base: string; access: string } };
const inSnapshot = new Set(snapshot.files);

const LIVE     = /^maps\/[^/]+\/live\//;
const PLAYERS  = /^maps\/[^/]+\/live\/players\.json$/;
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
function cacheControl(path: string, found: boolean): string {
  if (LIVE.test(path)) return 'no-store';
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

let serverId: Promise<string> | null = null;
let serverState: { online: boolean; checked: number } | null = null;

function resolveServerId(token: string): Promise<string> {
  serverId ??= getExarotonServerId(token).catch((err: unknown) => {
    serverId = null;
    throw err;
  });
  return serverId;
}

/* exaroton status 1 is online; checked at most every 30 seconds per instance */
async function isOnline(id: string, token: string): Promise<boolean> {
  if (serverState && Date.now() - serverState.checked < 30_000) return serverState.online;
  let online = false;
  try {
    const res = await fetch(`${SERVERS_API}/${id}/`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (res.ok) online = ((await res.json()) as { data?: { status?: number } }).data?.status === 1;
  } catch {
    /* can't tell: treat it as stopped and use the copy */
  }
  serverState = { online, checked: Date.now() };
  return online;
}

function toSnapshot(path: string, cache: string): Response {
  const location = `${SNAPSHOT_ROOT}/${path.split('/').map(encodeURIComponent).join('/')}`;
  return new Response(null, { status: 307, headers: { Location: location, 'Cache-Control': cache } });
}

function json(body: string): Response {
  return new Response(body, {
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

/* The server is stopped: nobody is online, and the map is whatever was synced last. */
function fromSnapshot(path: string): Response {
  if (PLAYERS.test(path)) return json('{"players":[]}');
  if (inSnapshot.has(path)) return toSnapshot(path, 'public, max-age=60, s-maxage=60');
  if (LIVE.test(path)) return json('{}');
  return empty(TILES.test(path) ? 204 : 404, 'public, max-age=60, s-maxage=60');
}

function fetchFile(id: string, token: string, path: string): Promise<Response> {
  const encoded = `${WEBROOT}/${path}`.split('/').map(encodeURIComponent).join('/');
  return fetch(`${SERVERS_API}/${id}/files/data/${encoded}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
}

/* exaroton answers a missing file with a 4xx; which one isn't documented,
   so anything that isn't about the key or the rate limit counts as missing */
function isMissing(status: number): boolean {
  return status >= 400 && status < 500 && status !== 401 && status !== 403 && status !== 429;
}

async function discard(res: Response): Promise<void> {
  await res.body?.cancel().catch(() => undefined);
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

  const token = process.env.EXAROTON_API_KEY;
  if (!token) return notice(503, 'Kortið er ekki tengt við þjóninn (EXAROTON_API_KEY vantar).');

  let id: string;
  try {
    id = await resolveServerId(token);
  } catch {
    return notice(502, 'Náði ekki sambandi við Exaroton.');
  }

  const path = segments.join('/');

  if (path.startsWith('maps/') && snapshot.files.length > 0) {
    /* the texture atlas rarely changes and takes long to come off exaroton,
       so the synced copy wins even while the server is running */
    if (TEXTURES.test(path) && inSnapshot.has(path)) {
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

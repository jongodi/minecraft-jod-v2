/* What the server itself changed, as the board tells it: the game moved to a
   new version, or a pack was put on the shelf or updated there. Noticed by
   comparing with what was seen last: the version on each live status read
   from exaroton (src/app/api/server-status/route.ts), the shelf after every
   change made to it in the admin panel and once a day (for packs that came
   with a deploy). What was seen is swapped in one step, so two readers at
   once never tell a change twice, and the first look only remembers. Kept as
   a short list in Redis; without Redis there is none. Server only. */

export type ServerNews =
  /** the game on the server moved from one version to another */
  | { kind: 'version'; at: string; from: string; to: string }
  /** a pack new to the shelf (`was` null), or a pack on it whose installed version moved */
  | { kind: 'pack'; at: string; packId: number; name: string; version: string | null; was: string | null; added: boolean; glyph: string | null; category: string };

export const SERVER_NEWS_KEY = 'server:news';
export const SERVER_NEWS_SIZE = 30;
const VERSION_KEY = 'server:version';
const SHELF_KEY = 'server:shelf';

/** The shelf as it was seen: each visible pack's name and installed version, by id. */
export type Shelf = Record<string, { name: string; version: string | null; glyph: string | null; category: string }>;

/** What changed on the shelf between two looks: packs new to it, and packs
    whose installed version moved. A pack taken off, renamed or re-glyphed is
    not news. */
export function shelfNews(prev: Shelf, next: Shelf, at: string): ServerNews[] {
  return Object.entries(next).flatMap(([id, p]): ServerNews[] => {
    const was = prev[id];
    const base = { kind: 'pack' as const, at, packId: Number(id), name: p.name, version: p.version, glyph: p.glyph, category: p.category };
    if (!was) return [{ ...base, was: null, added: true }];
    if ((was.version ?? null) !== (p.version ?? null) && p.version) return [{ ...base, was: was.version ?? null, added: false }];
    return [];
  });
}

/** The version change, if there is one; the first version ever seen is only remembered. */
export const versionNews = (prev: string | null, next: string, at: string): ServerNews[] =>
  prev && prev !== next ? [{ kind: 'version', at, from: prev, to: next }] : [];

async function redis() {
  const { getRedis } = await import('@/lib/redis');
  return getRedis();
}

async function record(news: ServerNews[]): Promise<void> {
  if (news.length === 0) return;
  const r = await redis();
  /* pushed last first, so a batch reads back newest first in the order it was told */
  await r.lpush(SERVER_NEWS_KEY, ...[...news].reverse().map(n => JSON.stringify(n)));
  await r.ltrim(SERVER_NEWS_KEY, 0, SERVER_NEWS_SIZE - 1);
}

/* the version this instance last saw stored, so a status read that changes nothing costs nothing */
let knownVersion: string | null = null;

/** Note the version a live status read from exaroton gave. Only exaroton's
    is trusted: it is the version the server is set to run, while the public
    lookup's is whatever the server says it is, written its own way, and
    would read as a change every time the lookup stood in. */
export async function noteServerVersion(body: { source: string; version?: string }): Promise<void> {
  const version = body.version?.trim();
  if (!process.env.REDIS_URL || body.source !== 'exaroton' || !version || version === knownVersion) return;
  try {
    const r = await redis();
    if ((await r.get(VERSION_KEY)) === version) { knownVersion = version; return; }
    /* swapped in one step: of two readers at once, only the first gets the old version back */
    const prev = await r.getset(VERSION_KEY, version);
    knownVersion = version;
    await record(versionNews(prev, version, new Date().toISOString()));
  } catch (e) {
    console.error('server version news:', e);
  }
}

/** Note the shelf as it is now. Called after each change to it, and daily. */
export async function noteShelf(): Promise<void> {
  if (!process.env.REDIS_URL) return;
  try {
    const { getPublicPacks } = await import('@/lib/datapacks-store');
    const next: Shelf = {};
    for (const p of await getPublicPacks()) next[p.id] = { name: p.name, version: p.currentVersion?.trim() || null, glyph: p.glyph, category: p.category };
    const seen = JSON.stringify(next);
    const r = await redis();
    if ((await r.get(SHELF_KEY)) === seen) return;
    const raw = await r.getset(SHELF_KEY, seen);
    if (raw === null) return;
    let prev: Shelf;
    try { prev = JSON.parse(raw) as Shelf; } catch { return; }
    await record(shelfNews(prev, next, new Date().toISOString()));
  } catch (e) {
    console.error('shelf news:', e);
  }
}

/** The server's news, newest first. */
export async function readServerNews(): Promise<ServerNews[]> {
  if (!process.env.REDIS_URL) return [];
  const raw = await (await redis()).lrange(SERVER_NEWS_KEY, 0, SERVER_NEWS_SIZE - 1);
  return raw.flatMap(s => { try { return [JSON.parse(s) as ServerNews]; } catch { return []; } });
}

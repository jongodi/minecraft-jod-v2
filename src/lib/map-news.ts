/* What changed on the map, as the board tells it: a new place, a picture
   hung on a place or on the wall of pictures, the painted map painted again.
   Worked out when the map or the gallery is saved (writeMap in
   src/lib/map.ts, addGalleryPhoto in src/lib/gallery.ts) and kept as a short
   list in Redis, so the board never reads the map's whole history to tell it.
   The first read fills the list from the history the site already kept
   (src/lib/map-history.ts). Without Redis there is no list. Server only. */
import type { MapConfig } from '@/lib/map-types';

export type MapNews =
  /** a place drawn on the map for the first time */
  | { kind: 'place'; at: string; placeId: number }
  /** a picture hung: on a place (placeId), or on the wall of pictures with none */
  | { kind: 'photo'; at: string; photoId: string; placeId: number | null }
  /** the painted map painted again: its land, its zones, its lines */
  | { kind: 'painted'; at: string; what: Painted[] };

export type Painted = 'land' | 'zones' | 'lines';

export const NEWS_KEY = 'map:news';
const FILLED_KEY = 'map:news:filled';
export const NEWS_SIZE = 40;

const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/** What one save changed, as news; nothing for a save that only moved, renamed or took things away. */
export function newsOf(prev: MapConfig, next: MapConfig, at: string): MapNews[] {
  const before = new Map(prev.locations.map(l => [l.id, l]));
  const out: MapNews[] = [];
  for (const l of next.locations) {
    const was = before.get(l.id);
    if (!was) out.push({ kind: 'place', at, placeId: l.id });
    /* a place drawn with its picture says so once, as the place; a picture given later is news of its own */
    const photo = l.photoId ?? null;
    if (photo !== null && was && (was.photoId ?? null) !== photo) out.push({ kind: 'photo', at, photoId: photo, placeId: l.id });
  }
  const what: Painted[] = [];
  if (!same(prev.terrain, next.terrain)) what.push('land');
  if (!same(prev.zones, next.zones)) what.push('zones');
  if (!same(prev.paths ?? [], next.paths ?? [])) what.push('lines');
  if (what.length) out.push({ kind: 'painted', at, what });
  return out;
}

async function redis() {
  const { getRedis } = await import('@/lib/redis');
  return getRedis();
}

/** Keep news, newest first. */
export async function recordNews(news: MapNews[]): Promise<void> {
  if (!process.env.REDIS_URL || news.length === 0) return;
  const r = await redis();
  /* pushed oldest first, so the newest ends up at the head */
  await r.lpush(NEWS_KEY, ...[...news].sort((a, b) => Date.parse(a.at) - Date.parse(b.at)).map(n => JSON.stringify(n)));
  await r.ltrim(NEWS_KEY, 0, NEWS_SIZE - 1);
}

const parse = (raw: string[]): MapNews[] => raw.flatMap(s => { try { return [JSON.parse(s) as MapNews]; } catch { return []; } });

/** The news, newest first. The first read ever fills the list from the map's
    history; only one read wins that, so two at once never tell it twice. */
export async function readNews(): Promise<MapNews[]> {
  if (!process.env.REDIS_URL) return [];
  const r = await redis();
  if (await r.set(FILLED_KEY, new Date().toISOString(), 'NX')) {
    try {
      const { readHistory } = await import('@/lib/map-history');
      /* the history is newest first; each save is told against the one before it */
      const versions = (await readHistory()).reverse();
      const told = versions.slice(1).flatMap((v, i) => newsOf(versions[i].config, v.config, v.at));
      /* news recorded since the history was kept is already in the list; only what came before it is added */
      const have = parse(await r.lrange(NEWS_KEY, 0, NEWS_SIZE - 1));
      const oldest = have.length ? Math.min(...have.map(n => Date.parse(n.at))) : Infinity;
      const missing = told.filter(n => Date.parse(n.at) < oldest);
      if (missing.length) {
        await r.rpush(NEWS_KEY, ...missing.sort((a, b) => Date.parse(b.at) - Date.parse(a.at)).map(n => JSON.stringify(n)));
        await r.ltrim(NEWS_KEY, 0, NEWS_SIZE - 1);
      }
    } catch (e) {
      console.error('map news backfill:', e);
    }
  }
  return parse(await r.lrange(NEWS_KEY, 0, NEWS_SIZE - 1));
}

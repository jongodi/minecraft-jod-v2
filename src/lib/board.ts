/* Taflan's items, gathered on the server: what the crew pinned on their
   walls, the fires and the nights that were held, the game's advancements
   and what changed on the map, newest first (src/lib/board-types.ts). The
   same reads as the chat's (src/app/api/chat/route.ts), each with its own
   fallback, so a store that can't be read leaves its part out rather than
   the board. Server only. */
import type { CrewProfile } from '@/lib/crew-types';
import type { MapConfig } from '@/lib/map-types';
import type { GalleryPhoto } from '@/lib/gallery';
import type { Night, PastNight } from '@/lib/play-night';
import type { MapNews, Painted } from '@/lib/map-news';
import type { BoardItem, BoardPlace, BoardResponse } from '@/lib/board-types';
import { advancementOf, type CrewAdvancements } from '@/lib/advancements';
import { optionOf, decidesAt, EVENING_MS } from '@/lib/play-night';
import { woodOf } from '@/lib/map-types';
import { titleCase, sentenceCase } from '@/components/badlands/data';

/** How far back the server's own news reaches; the crew's posts go back further (POSTS_KEEP). */
export const BOARD_DAYS = 60;
/** The newest posts always on the board, however old. Older ones are on the walls. */
export const POSTS_KEEP = 60;

const PAINTED: Painted[] = ['land', 'zones', 'lines'];

export interface BoardSources {
  walls:        CrewProfile[];
  map:          MapConfig | null;
  gallery:      GalleryPhoto[];
  nights:       Night[];
  past:         PastNight[];
  advancements: CrewAdvancements | null;
  news:         MapNews[];
  /** when the 3D map was last copied, if it ever was */
  syncedAt:     string | null;
  now?:         number;
}

export function boardPlaces(map: MapConfig | null): BoardPlace[] {
  return (map?.locations ?? []).map(l => ({ id: l.id, label: titleCase(l.label), sublabel: sentenceCase(l.sublabel), builders: l.builders ?? [], wood: woodOf(l) }));
}

/** Everything on the board, newest first. */
export function boardItems({ walls, map, gallery, nights, past, advancements, news, syncedAt, now = Date.now() }: BoardSources): BoardItem[] {
  const since = now - BOARD_DAYS * 86_400_000;
  const recent = (at: string) => { const t = Date.parse(at); return t >= since && t <= now; };
  const places = new Map((map?.locations ?? []).map(l => [l.id, l]));
  const photos = new Map(gallery.filter(p => p.active).map(p => [p.id, p]));
  const items: BoardItem[] = [];

  /* the posts: the newest few whatever their age, and a call or a question
     still open, which is still asking something of the crew */
  const posts = walls.flatMap(w => w.entries.map(entry => ({ w, entry })))
    .sort((a, b) => Date.parse(b.entry.createdAt) - Date.parse(a.entry.createdAt));
  posts.forEach(({ w, entry }, i) => {
    const open = (entry.bounty && !entry.bounty.doneAt) || (entry.poll && !entry.poll.closed);
    if (i >= POSTS_KEEP && !open && !recent(entry.createdAt)) return;
    const place = entry.placeId !== null ? places.get(entry.placeId) ?? null : null;
    items.push({ kind: 'post', id: `p-${entry.id}`, at: entry.createdAt, who: w.username, wood: woodOf(place), entry });
  });

  for (const n of nights) {
    if (n.cancelled) continue;
    if (recent(n.createdAt)) {
      items.push({ kind: 'fire', id: `f-${n.id}`, at: n.createdAt, who: n.by, nightId: n.id, note: n.note, times: n.options.map(o => o.at), chosen: optionOf(n, n.chosen)?.at ?? null, cancelled: n.cancelled });
    }
    /* decided: a night of one time was decided when it was lit, so only a night of several is told again */
    const chosen = optionOf(n, n.chosen);
    if (chosen && n.options.length > 1) {
      const at = n.chosenBy === 'auto' ? new Date(decidesAt(n)).toISOString() : n.chosenAt ?? null;
      if (at && recent(at)) items.push({ kind: 'decided', id: `d-${n.id}`, at, who: n.chosenBy === 'auto' ? null : n.chosenBy, nightId: n.id, note: n.note, time: chosen.at });
    }
  }

  for (const p of past) {
    const at = new Date(Date.parse(p.at) + EVENING_MS).toISOString();
    if (recent(at)) items.push({ kind: 'held', id: `h-${p.id}`, at, who: p.by, nightId: p.id, note: p.note, came: p.came, noShows: p.noShows });
  }

  /* each member's advancements, a day to a notice */
  for (const [who, done] of Object.entries(advancements?.players ?? {})) {
    const found = advancements?.found?.[who] ?? {};
    const days = new Map<string, { at: string; arrived: string; list: { title: string; frame: 'task' | 'goal' | 'challenge'; at: string }[] }>();
    for (const [id, at] of Object.entries(done)) {
      const def = advancementOf(id);
      if (!def || !recent(at)) continue;
      const day = at.slice(0, 10);
      const d = days.get(day) ?? { at, arrived: at, list: [] };
      d.list.push({ title: def.title, frame: def.frame, at });
      if (at > d.at) d.at = at;
      /* the copy that brought it, which is when it is news */
      const came = found[id] && found[id] > at ? found[id] : at;
      if (came > d.arrived) d.arrived = came;
      days.set(day, d);
    }
    for (const [day, d] of days) {
      /* the challenges first, then the goals, then in the order they were done */
      const rank = { challenge: 0, goal: 1, task: 2 } as const;
      const list = d.list.sort((a, b) => rank[a.frame] - rank[b.frame] || a.at.localeCompare(b.at)).map(({ title, frame }) => ({ title, frame }));
      items.push({ kind: 'advancement', id: `a-${who}-${day}`, at: d.at, who, list, ...(d.arrived > d.at ? { arrived: d.arrived } : {}) });
    }
  }

  /* The map. A picture is told once: on its place when it was hung on one
     (over the same picture first going up on the wall of pictures), and not
     at all when the place it hangs on is told as drawn with it. The painting
     of one day is one notice. */
  const drawnWith = new Set<string>();
  const pictures = new Map<string, Extract<MapNews, { kind: 'photo' }>>();
  const painted = new Map<string, { at: string; what: Set<Painted> }>();
  for (const n of news) {
    if (!recent(n.at)) continue;
    if (n.kind === 'place') {
      const l = places.get(n.placeId);
      if (!l) continue;
      /* the picture it was drawn with, not one hung on it since, which is news of its own */
      const given = n.photoId === undefined ? l.photoId ?? null : n.photoId;
      const photo = given ? photos.get(given) ?? null : null;
      if (photo) drawnWith.add(photo.id);
      items.push({ kind: 'place', id: `l-${n.placeId}-${n.at}`, at: n.at, who: null, placeId: l.id, label: titleCase(l.label), sublabel: sentenceCase(l.sublabel), photo: photo?.filename ?? null });
    } else if (n.kind === 'photo') {
      const was = pictures.get(n.photoId);
      if (!was || (was.placeId === null && n.placeId !== null)) pictures.set(n.photoId, n);
    } else {
      const day = n.at.slice(0, 10);
      const d = painted.get(day) ?? { at: n.at, what: new Set<Painted>() };
      n.what.forEach(w => d.what.add(w));
      if (n.at > d.at) d.at = n.at;
      painted.set(day, d);
    }
  }
  for (const n of pictures.values()) {
    const photo = photos.get(n.photoId);
    const l = n.placeId !== null ? places.get(n.placeId) ?? null : null;
    if (!photo || drawnWith.has(photo.id) || (n.placeId !== null && !l)) continue;
    items.push({ kind: 'photo', id: `m-${n.photoId}`, at: n.at, who: null, placeId: l?.id ?? null, label: l ? titleCase(l.label) : null, photo: photo.filename, title: titleCase(photo.title) });
  }
  for (const [day, d] of painted) {
    items.push({ kind: 'painted', id: `t-${day}`, at: d.at, who: null, what: PAINTED.filter(w => d.what.has(w)) });
  }

  if (syncedAt && recent(syncedAt)) items.push({ kind: 'synced', id: `s-${syncedAt}`, at: syncedAt, who: null });

  return items.sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
}

/* ─── the reads ───────────────────────────────────────────────────────────── */

/** The fires as they stand (an unchosen night past its time is decided on the
    read, as everywhere), and every night that has been held: the annals, and
    one still burning down to embers among the fires, which the annals only
    take once it leaves them a week on. Without Redis there are no fires. */
async function readNightsForBoard(): Promise<{ nights: Night[]; past: PastNight[] }> {
  if (!process.env.REDIS_URL) return { nights: [], past: [] };
  const play = await import('@/lib/play-night');
  const now = Date.now();
  const current = await play.currentNights(now);
  const { all, shown } = current;
  const kept = await play.pastNights(now, current);
  const embers = shown.filter(s => play.phaseOf(s.night, now) === 'over').map(s => play.pastOf(s.night, s.votes, s.seen)).filter((p): p is PastNight => p !== null);
  const ids = new Set(kept.map(p => p.id));
  return { nights: all, past: [...kept, ...embers.filter(p => !ids.has(p.id))] };
}

export async function readBoard(): Promise<BoardResponse> {
  const [{ readAllProfiles }, { readMap }, { readGallery }, { readStoredAdvancements }, { readNews }, snapshot] = await Promise.all([
    import('@/lib/crew'), import('@/lib/map'), import('@/lib/gallery'), import('@/lib/advancements'), import('@/lib/map-news'), import('@/lib/bluemap-snapshot.json'),
  ]);
  const [walls, map, gallery, advancements, news, { nights, past }] = await Promise.all([
    readAllProfiles().catch(() => []),
    readMap().catch(() => null),
    readGallery().catch(() => []),
    readStoredAdvancements(),
    readNews().catch(() => []),
    readNightsForBoard().catch(() => ({ nights: [], past: [] })),
  ]);
  return {
    items: boardItems({ walls, map, gallery, nights, past, advancements, news, syncedAt: (snapshot.default as { syncedAt?: string | null }).syncedAt ?? null }),
    places: boardPlaces(map),
  };
}

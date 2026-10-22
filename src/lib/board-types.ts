/* Taflan: the board where everything on JOÐ is posted, newest first. What
   the crew pinned on their walls, what the server did (fires lit, nights
   decided and held, advancements), and what changed on the map. The types
   and the pure helpers, with no server imports, so the board's components
   and its routes read the same definitions. The items are gathered on the
   server (src/lib/board.ts). */
import type { CrewEntry } from '@/lib/crew-types';
import type { SignWood } from '@/lib/sign-wood';
import type { Frame } from '@/lib/advancements';
import type { Painted } from '@/lib/map-news';

export type BoardItem =
  /** something pinned on a wall: a note, prints, a call for something or a question */
  | { kind: 'post'; id: string; at: string; who: string; wood: SignWood; entry: CrewEntry }
  /** a play night lit, with the times it offered */
  | { kind: 'fire'; id: string; at: string; who: string; nightId: string; note: string; times: string[]; chosen: string | null; cancelled: boolean }
  /** a night's time fixed, by the one who lit it, or on its own (who: null) */
  | { kind: 'decided'; id: string; at: string; who: string | null; nightId: string; note: string; time: string }
  /** a night that was held: who lit it, who came, who said they would and didn't */
  | { kind: 'held'; id: string; at: string; who: string; nightId: string; note: string; came: string[]; noShows: string[] }
  /** one member's advancements on one day */
  | { kind: 'advancement'; id: string; at: string; who: string; list: { title: string; frame: Frame }[] }
  /** a place drawn on the map */
  | { kind: 'place'; id: string; at: string; who: null; placeId: number; label: string; sublabel: string; photo: string | null }
  /** a picture hung on a place, or on the wall of pictures */
  | { kind: 'photo'; id: string; at: string; who: null; placeId: number | null; label: string | null; photo: string; title: string }
  /** the painted map painted again */
  | { kind: 'painted'; id: string; at: string; who: null; what: Painted[] }
  /** a fresh copy of the 3D map */
  | { kind: 'synced'; id: string; at: string; who: null };

export type BoardKind = BoardItem['kind'];

/** A member's advancements on one day are one notice; this many are named on it, the rest counted. */
export const ADV_SHOWN = 6;

/** A place on the map, as the board needs it: to pin things at and to name them. */
export interface BoardPlace { id: number; label: string; sublabel: string; builders: string[]; wood: SignWood }

export interface BoardResponse {
  items:  BoardItem[];
  places: BoardPlace[];
}

/** What the door's lantern counts: when, and by whom (null for the server's own news). */
export interface BoardStamp { at: string; who: string | null }
export interface BoardBrief { stamps: BoardStamp[] }

/* ─── the filters ─────────────────────────────────────────────────────────── */

export type BoardFilter = 'allt' | 'myndir' | 'midar' | 'vidburdir' | 'kortid';
export const FILTERS: { id: BoardFilter; label: string }[] = [
  { id: 'allt',      label: 'Allt' },
  { id: 'myndir',    label: 'Myndir' },
  { id: 'midar',     label: 'Miðar' },
  { id: 'vidburdir', label: 'Viðburðir' },
  { id: 'kortid',    label: 'Kortið' },
];
export const isFilter = (s: string | null | undefined): s is BoardFilter => FILTERS.some(f => f.id === s);

/** Whether an item belongs under a filter. A note with prints is both a print and a note. */
export function inFilter(item: BoardItem, f: BoardFilter): boolean {
  switch (f) {
    case 'allt':      return true;
    case 'myndir':    return (item.kind === 'post' && item.entry.photos.length > 0) || item.kind === 'photo' || (item.kind === 'place' && item.photo !== null);
    case 'midar':     return item.kind === 'post' && (item.entry.text.trim() !== '' || !!item.entry.bounty || !!item.entry.poll);
    case 'vidburdir': return item.kind === 'fire' || item.kind === 'decided' || item.kind === 'held' || item.kind === 'advancement';
    case 'kortid':    return item.kind === 'place' || item.kind === 'photo' || item.kind === 'painted' || item.kind === 'synced';
  }
}

/* ─── what is new ─────────────────────────────────────────────────────────── */

/** On a first look, with nothing seen yet, what came in these last days is new. */
export const FIRST_LOOK_MS = 3 * 86_400_000;

/** Whether something is new to the one looking: posted after they last
    looked, and not by them. With nothing seen yet, the last few days are,
    so a first look at the board shows that it is lived in without calling
    the whole of it news. */
export function isNew(stamp: BoardStamp, seen: string | null, me: string | null | undefined, now = Date.now()): boolean {
  if (me && stamp.who && stamp.who.toLowerCase() === me.toLowerCase()) return false;
  const since = seen ? Date.parse(seen) : now - FIRST_LOOK_MS;
  return Date.parse(stamp.at) > since;
}

export const countNew = (stamps: BoardStamp[], seen: string | null, me: string | null | undefined, now = Date.now()) =>
  stamps.reduce((n, s) => n + (isNew(s, seen, me, now) ? 1 : 0), 0);

/** The newest moment on the board, which is what "seen" moves up to. */
export const newestAt = (stamps: BoardStamp[]): string | null =>
  stamps.reduce<string | null>((max, s) => (!max || Date.parse(s.at) > Date.parse(max) ? s.at : max), null);

/* ─── the days ────────────────────────────────────────────────────────────── */

const WEEKDAYS = ['sunnudagur', 'mánudagur', 'þriðjudagur', 'miðvikudagur', 'fimmtudagur', 'föstudagur', 'laugardagur'];
const MONTHS = ['janúar', 'febrúar', 'mars', 'apríl', 'maí', 'júní', 'júlí', 'ágúst', 'september', 'október', 'nóvember', 'desember'];

/** The day an item is filed under, in Iceland (UTC all year): YYYY-MM-DD. */
export const dayOf = (iso: string) => new Date(iso).toISOString().slice(0, 10);

/** A day as the board heads it: "Í dag", "Í gær", the weekday within the
    week, else the date ("Mánudagur 19. október"). */
export function dayLabel(day: string, now = Date.now()): string {
  const today = dayOf(new Date(now).toISOString());
  const d = new Date(`${day}T12:00:00Z`);
  const diff = Math.round((Date.parse(`${today}T12:00:00Z`) - d.getTime()) / 86_400_000);
  if (diff === 0) return 'Í dag';
  if (diff === 1) return 'Í gær';
  const weekday = WEEKDAYS[d.getUTCDay()];
  const named = weekday.charAt(0).toLocaleUpperCase('is-IS') + weekday.slice(1);
  if (diff > 1 && diff < 7) return named;
  const year = d.getUTCFullYear() !== new Date(now).getUTCFullYear() ? ` ${d.getUTCFullYear()}` : '';
  return `${named} ${d.getUTCDate()}. ${MONTHS[d.getUTCMonth()]}${year}`;
}

/** Items grouped by day, newest day first, in the order they came. */
export function byDay<T extends { at: string }>(items: T[]): { day: string; items: T[] }[] {
  const out: { day: string; items: T[] }[] = [];
  for (const item of items) {
    const day = dayOf(item.at);
    const last = out[out.length - 1];
    if (last && last.day === day) last.items.push(item);
    else out.push({ day, items: [item] });
  }
  return out;
}

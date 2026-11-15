/* Áfangar: the round numbers a member's own counters pass, as the board
   tells them. The hundredth death, the five hundredth hour in the world,
   ten thousand mobs felled, a thousand kilometres on foot. Read off the
   daily copies of the game's own totals (src/lib/daily-stats.ts): a mark is
   passed when one day's copy is under it and a later day's is at or over it.
   The daily job notes them (noteMilestones) in a short list in Redis, each
   mark once per member; the first run looks back over the board's own
   reach, so the board starts with the marks of the last weeks rather than
   bare. Without Redis there are none. Server only, the pure part aside. */
import type { Counters } from '@/lib/stats';
import type { DailySnapshot } from '@/lib/daily-stats';

export type MilestoneKind = 'hours' | 'deaths' | 'mobs' | 'km';

export interface Milestone {
  who:  string;
  what: MilestoneKind;
  /** the round number passed, in the kind's own unit */
  mark: number;
  /** when the copy that found it was taken: the day it became known, not the game's own moment */
  at:   string;
}

/** The marks worth a slip, low to high. Past the last, hours go on every 500. */
export const MARKS: Record<MilestoneKind, readonly number[]> = {
  hours:  [50, 100, 250, 500, 750, 1000],
  deaths: [50, 100, 250, 500, 1000],
  mobs:   [1000, 5000, 10_000, 25_000, 50_000, 100_000],
  km:     [100, 500, 1000, 2500, 5000, 10_000],
};
const HOURS_ON = 500;

/** A counter in its mark's unit: whole hours, deaths, mobs, kilometres. */
const READ: Record<MilestoneKind, (c: Counters) => number> = {
  hours:  c => (c.playTimeTicks ?? 0) / 72_000,
  deaths: c => c.deaths ?? 0,
  mobs:   c => c.mobKills ?? 0,
  km:     c => (c.travelCm ?? 0) / 100_000,
};

/** The highest mark with `before` under it and `after` at or over it; null when none was passed. */
export function passed(what: MilestoneKind, before: number, after: number): number | null {
  if (!Number.isFinite(before) || !Number.isFinite(after) || after <= before) return null;
  let top: number | null = null;
  for (const m of MARKS[what]) if (before < m && m <= after) top = m;
  if (what === 'hours') {
    /* every 500 past the listed marks: 1500, 2000, … */
    const last = MARKS.hours[MARKS.hours.length - 1];
    const on = Math.floor(after / HOURS_ON) * HOURS_ON;
    if (on > last && before < on) top = on;
  }
  return top;
}

/** What one member passed between two of their copies. */
export function passedBetween(who: string, before: Counters, after: Counters, at: string): Milestone[] {
  return (Object.keys(MARKS) as MilestoneKind[]).flatMap(what => {
    const mark = passed(what, READ[what](before), READ[what](after));
    return mark === null ? [] : [{ who, what, mark, at }];
  });
}

/** Every mark passed over a run of daily copies, oldest first. Each member is
    measured from their own last copy, so a day their file could not be read
    loses nothing; a member's first copy only sets where they stand. */
export function milestonesOver(copies: readonly DailySnapshot[]): Milestone[] {
  const sorted = [...copies].sort((a, b) => a.day.localeCompare(b.day));
  const last = new Map<string, Counters>();
  const out: Milestone[] = [];
  for (const copy of sorted) {
    for (const [who, now] of Object.entries(copy.counters)) {
      const then = last.get(who);
      if (then) out.push(...passedBetween(who, then, now, copy.takenAt));
      last.set(who, now);
    }
  }
  return out;
}

/** A mark is passed once: this names it, so a second look never tells it twice. */
export const milestoneId = (m: Pick<Milestone, 'who' | 'what' | 'mark'>) => `${m.who.toLowerCase()}:${m.what}:${m.mark}`;

/** Those of `found` the list does not hold yet, each once. */
export function unseen(found: readonly Milestone[], kept: readonly Milestone[]): Milestone[] {
  const have = new Set(kept.map(milestoneId));
  return found.filter(m => { const id = milestoneId(m); if (have.has(id)) return false; have.add(id); return true; });
}

/* ─── the store ───────────────────────────────────────────────────────────── */

export const MILESTONES_KEY = 'stats:milestones';
/** set once the first, long look back has been made */
export const MILESTONES_FILLED_KEY = 'stats:milestones:filled';
export const MILESTONES_SIZE = 60;
/** the first look goes back as far as the board does; after that a week, which covers a job that missed days */
const FIRST_LOOK_DAYS = 61;
const LOOK_DAYS = 8;

/* one import shared by readers at once: two of a mocked module at the same time hang vitest */
let redisModule: Promise<typeof import('@/lib/redis')> | undefined;
async function redis() {
  redisModule ??= import('@/lib/redis');
  return (await redisModule).getRedis();
}

/** The marks kept, newest first. */
export async function readMilestones(): Promise<Milestone[]> {
  if (!process.env.REDIS_URL) return [];
  const raws = await (await redis()).lrange(MILESTONES_KEY, 0, MILESTONES_SIZE - 1);
  return raws.flatMap(raw => { try { return [JSON.parse(raw) as Milestone]; } catch { return []; } });
}

/** Notes the marks the newest copies show and the list does not hold. Called
    by the daily job once the day's copy is kept; run twice, it adds nothing. */
export async function noteMilestones(now = new Date()): Promise<Milestone[]> {
  if (!process.env.REDIS_URL) return [];
  const r = await redis();
  const { readRecentDays } = await import('@/lib/daily-stats');
  const filled = await r.get(MILESTONES_FILLED_KEY);
  const copies = await readRecentDays(now, filled ? LOOK_DAYS : FIRST_LOOK_DAYS);
  const fresh = unseen(milestonesOver(copies), await readMilestones());
  if (fresh.length) {
    /* oldest pushed first, so the newest ends at the head */
    await r.lpush(MILESTONES_KEY, ...[...fresh].sort((a, b) => Date.parse(a.at) - Date.parse(b.at)).map(m => JSON.stringify(m)));
    await r.ltrim(MILESTONES_KEY, 0, MILESTONES_SIZE - 1);
  }
  if (!filled) await r.set(MILESTONES_FILLED_KEY, now.toISOString());
  return fresh;
}

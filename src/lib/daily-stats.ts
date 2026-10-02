import { getRedis } from '@/lib/redis';
import type { Counters, WeekPlayer, WeekStats } from '@/lib/stats';

/* A copy of every crew member's running totals, one per day, taken by
   /api/cron/daily around noon. They are what the week's outlaw on the
   wanted board (weekOf, below) and a play night's no-shows
   (src/lib/play-night.ts) are measured by, as the difference between two
   days. A year of them is a few hundred kilobytes. */

const KEEP_S = 400 * 24 * 3600;

export interface DailySnapshot {
  /** YYYY-MM-DD, in Iceland (which keeps UTC all year) */
  day:      string;
  takenAt:  string;
  /** by username; a member whose file could not be read is left out, never zeroed */
  counters: Record<string, Counters>;
  /** crew whose stats file was there but could not be read that day */
  failed:   string[];
}

export const dayOf = (d: Date): string => d.toISOString().slice(0, 10);
const keyOf = (day: string) => `stats:day:${day}`;

export async function saveDay(snapshot: DailySnapshot): Promise<void> {
  await getRedis().set(keyOf(snapshot.day), JSON.stringify(snapshot), 'EX', KEEP_S);
}

export async function readDay(day: string): Promise<DailySnapshot | null> {
  const raw = await getRedis().get(keyOf(day));
  return raw ? JSON.parse(raw) as DailySnapshot : null;
}

/** The copies from the last `days` days, newest first. */
export async function readRecentDays(now: Date, days = 8): Promise<DailySnapshot[]> {
  const keys = Array.from({ length: days }, (_, i) => keyOf(dayOf(new Date(now.getTime() - i * 86_400_000))));
  const raws = await getRedis().mget(...keys);
  return raws.flatMap(raw => {
    if (!raw) return [];
    try { return [JSON.parse(raw) as DailySnapshot]; } catch { return []; }
  });
}

/** The week as the board posts it: the difference between the newest copy
    and the oldest of the last few days, per member. Null until two copies
    from different days exist. A member missing from either copy is left
    out rather than shown with nothing, and a counter that went down (a
    stats file reset) counts as nothing. */
export function weekOf(copies: DailySnapshot[]): WeekStats | null {
  if (copies.length < 2) return null;
  const sorted = [...copies].sort((a, b) => a.day.localeCompare(b.day));
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  if (first.day === last.day) return null;
  const players: WeekPlayer[] = [];
  for (const [username, now] of Object.entries(last.counters)) {
    const then = first.counters[username];
    if (!then) continue;
    const up = (k: keyof Counters) => Math.max(0, (now[k] ?? 0) - (then[k] ?? 0));
    const taken = up('damageTaken');
    const dealt = up('damageDealt');
    players.push({
      username,
      playTimeHours: Math.round((up('playTimeTicks') / 72_000) * 10) / 10,
      deaths:        up('deaths'),
      mobKills:      up('mobKills'),
      travelCm:      up('travelCm'),
      raidWins:      up('raidWins'),
      recordsPlayed: up('recordsPlayed'),
      damageRatio:   dealt > 0 ? Math.round((taken / dealt) * 10) / 10 : 0,
    });
  }
  return { from: first.day, to: last.day, players };
}

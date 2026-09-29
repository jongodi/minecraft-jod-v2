import { getRedis } from '@/lib/redis';
import type { Counters } from '@/lib/stats';

/* A copy of every crew member's running totals, one per day, taken by
   /api/cron/daily around noon. Nothing reads them yet: they are what the
   week's outlaw and a play night's no-shows are measured by, as the
   difference between two days, so they are gathered from now on. A year of
   them is a few hundred kilobytes. */

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

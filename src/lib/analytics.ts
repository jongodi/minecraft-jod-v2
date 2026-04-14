// Simple Redis-backed daily hit counter for sections.
// Increments `analytics:hits:{section}:{YYYY-MM-DD}` with 7-day TTL.

const SECTIONS = ['server-status', 'stats', 'gallery', 'map', 'datapacks'] as const;
export type AnalyticsSection = (typeof SECTIONS)[number];

export function analyticsKey(section: AnalyticsSection): string {
  const day = new Date().toISOString().slice(0, 10);
  return `analytics:hits:${section}:${day}`;
}

export async function trackHit(section: AnalyticsSection): Promise<void> {
  if (!process.env.REDIS_URL) return;
  try {
    const { getRedis } = await import('./redis');
    const redis = getRedis();
    const key = analyticsKey(section);
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, 7 * 24 * 3600);
  } catch { /* non-fatal */ }
}

export interface DailyHits { date: string; hits: number }
export interface SectionAnalytics { section: string; days: DailyHits[]; total: number }

export async function getAnalytics(): Promise<SectionAnalytics[]> {
  if (!process.env.REDIS_URL) return [];
  try {
    const { getRedis } = await import('./redis');
    const redis = getRedis();
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().slice(0, 10);
    }).reverse();

    const result: SectionAnalytics[] = [];
    for (const section of SECTIONS) {
      const keys = days.map(d => `analytics:hits:${section}:${d}`);
      const values = await redis.mget(...keys);
      const dayHits: DailyHits[] = days.map((date, i) => ({
        date,
        hits: parseInt(values[i] as string ?? '0', 10) || 0,
      }));
      result.push({
        section,
        days:  dayHits,
        total: dayHits.reduce((s, d) => s + d.hits, 0),
      });
    }
    return result;
  } catch {
    return [];
  }
}

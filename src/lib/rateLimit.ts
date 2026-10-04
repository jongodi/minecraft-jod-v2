// IP-based rate limiter: a fixed window in Redis that starts with the first
// try, and a sliding one in memory when Redis is unavailable (local dev).

const MAX_ATTEMPTS   = 5;
const WINDOW_SECONDS = 15 * 60; // 15 minutes

export interface RateLimitResult {
  limited:   boolean;
  remaining: number;
}

// In-memory fallback for environments without Redis
const memHits = new Map<string, number[]>();

/** At most `max` tries per `windowSeconds` (by default 5 per quarter of an hour) for one address and action. */
export async function checkRateLimit(ip: string, action: string, max = MAX_ATTEMPTS, windowSeconds = WINDOW_SECONDS): Promise<RateLimitResult> {
  const key = `ratelimit:${action}:${ip}`;

  if (!process.env.REDIS_URL) {
    const now = Date.now();
    const windowStart = now - windowSeconds * 1000;
    const hits = (memHits.get(key) ?? []).filter(t => t > windowStart);
    hits.push(now);
    memHits.set(key, hits);
    return {
      limited:   hits.length > max,
      remaining: Math.max(0, max - hits.length),
    };
  }

  try {
    const { getRedis } = await import('./redis');
    const redis = getRedis();
    const count = await redis.incr(key);
    /* the window starts with the first try; a key left without one (an
       expire that never landed) would otherwise turn the address away for good */
    if (count === 1 || (await redis.ttl(key)) === -1) {
      await redis.expire(key, windowSeconds);
    }
    return {
      limited:   count > max,
      remaining: Math.max(0, max - count),
    };
  } catch {
    // Non-fatal — allow the request if Redis is down
    return { limited: false, remaining: max };
  }
}

/** Forget an address's attempts after one succeeds, so the limit counts
    failures: several members signing in from one home router are not turned
    away because each of them got in. */
export async function clearRateLimit(ip: string, action: string): Promise<void> {
  const key = `ratelimit:${action}:${ip}`;
  if (!process.env.REDIS_URL) { memHits.delete(key); return; }
  try {
    const { getRedis } = await import('./redis');
    await getRedis().del(key);
  } catch { /* non-fatal */ }
}

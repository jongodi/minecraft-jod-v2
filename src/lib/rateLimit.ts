// IP-based sliding-window rate limiter backed by Redis.
// Falls back to in-memory limiting when Redis is unavailable (local dev).

const MAX_ATTEMPTS   = 5;
const WINDOW_SECONDS = 15 * 60; // 15 minutes

export interface RateLimitResult {
  limited:   boolean;
  remaining: number;
}

// In-memory fallback for environments without Redis
const memHits = new Map<string, number[]>();

export async function checkRateLimit(ip: string, action: string): Promise<RateLimitResult> {
  const key = `ratelimit:${action}:${ip}`;

  if (!process.env.REDIS_URL) {
    const now = Date.now();
    const windowStart = now - WINDOW_SECONDS * 1000;
    const hits = (memHits.get(key) ?? []).filter(t => t > windowStart);
    hits.push(now);
    memHits.set(key, hits);
    return {
      limited:   hits.length > MAX_ATTEMPTS,
      remaining: Math.max(0, MAX_ATTEMPTS - hits.length),
    };
  }

  try {
    const { getRedis } = await import('./redis');
    const redis = getRedis();
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, WINDOW_SECONDS);
    }
    return {
      limited:   count > MAX_ATTEMPTS,
      remaining: Math.max(0, MAX_ATTEMPTS - count),
    };
  } catch {
    // Non-fatal — allow the request if Redis is down
    return { limited: false, remaining: MAX_ATTEMPTS };
  }
}

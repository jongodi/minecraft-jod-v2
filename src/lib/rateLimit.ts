// IP-based sliding-window rate limiter backed by Redis.
// Falls back gracefully (no limiting) when Redis is unavailable (local dev).

export interface RateLimitResult {
  limited:   boolean;
  remaining: number;
}

interface RateLimitOptions {
  /** Max requests allowed within the window. Default: 5 */
  max?:            number;
  /** Window size in seconds. Default: 900 (15 minutes) */
  windowSeconds?:  number;
}

/**
 * Check and increment the rate-limit counter for a given IP + action key.
 * Returns { limited: true } once the caller has exceeded `max` within the window.
 */
export async function checkRateLimit(
  ip: string,
  action: string,
  options: RateLimitOptions = {},
): Promise<RateLimitResult> {
  const MAX_ATTEMPTS   = options.max           ?? 5;
  const WINDOW_SECONDS = options.windowSeconds ?? 15 * 60;

  if (!process.env.REDIS_URL) {
    return { limited: false, remaining: MAX_ATTEMPTS };
  }

  const key = `ratelimit:${action}:${ip}`;
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

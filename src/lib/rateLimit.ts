// IP-based rate limiter: a fixed window in Redis that starts with the first
// try, and a sliding one in memory when Redis is unavailable (local dev).

const MAX_ATTEMPTS   = 5;
const WINDOW_SECONDS = 15 * 60; // 15 minutes

export interface RateLimitResult {
  limited:   boolean;
  remaining: number;
}

/** Who is asking, as the limits count them: the visitor's own address
    (Vercel writes x-forwarded-for itself), with an IPv6 address taken as its
    /64. One connection is handed a whole /64 and may pick any address in it,
    so counting single addresses let one visitor guess without limit. */
export function clientKey(headers: Headers): string {
  return addressKey(headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown');
}

export function addressKey(ip: string): string {
  if (!ip.includes(':')) return ip;
  const mapped = ip.match(/::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i);
  if (mapped) return mapped[1];
  const bare = ip.replace(/^\[|\](?::\d+)?$/g, '').split('%')[0].toLowerCase();
  const [head, tail] = bare.split('::');
  const front = head ? head.split(':') : [];
  const back = tail ? tail.split(':') : [];
  const groups = tail === undefined ? front : [...front, ...Array(Math.max(0, 8 - front.length - back.length)).fill('0'), ...back];
  if (groups.length !== 8 || groups.some(g => !/^[0-9a-f]{1,4}$/.test(g))) return bare;
  return `${groups.slice(0, 4).map(g => parseInt(g, 16).toString(16)).join(':')}::/64`;
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

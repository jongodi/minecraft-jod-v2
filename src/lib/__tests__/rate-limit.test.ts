import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

/* The sign-in limits count failed tries per address in Redis. A key that
   somehow lost its expiry (the EXPIRE after the first INCR never landed)
   would turn that address away for good after five tries. */
const counts = new Map<string, number>();
const ttls = new Map<string, number>();
vi.mock('@/lib/redis', () => ({
  getRedis: () => ({
    incr: async (k: string) => { const n = (counts.get(k) ?? 0) + 1; counts.set(k, n); return n; },
    ttl: async (k: string) => (counts.has(k) ? ttls.get(k) ?? -1 : -2),
    expire: async (k: string, s: number) => { ttls.set(k, s); return 1; },
    del: async (k: string) => { counts.delete(k); ttls.delete(k); return 1; },
  }),
}));

process.env.REDIS_URL = 'redis://test';
const { checkRateLimit } = await import('@/lib/rateLimit');
afterAll(() => { delete process.env.REDIS_URL; });

beforeEach(() => { counts.clear(); ttls.clear(); });

describe('checkRateLimit', () => {
  it('starts the window on the first try', async () => {
    await checkRateLimit('1.2.3.4', 'crew-auth');
    expect(ttls.get('ratelimit:crew-auth:1.2.3.4')).toBe(900);
  });

  it('gives a key that lost its expiry a window again', async () => {
    counts.set('ratelimit:crew-auth:1.2.3.4', 7);
    const r = await checkRateLimit('1.2.3.4', 'crew-auth');
    expect(r.limited).toBe(true);
    expect(ttls.get('ratelimit:crew-auth:1.2.3.4')).toBe(900);
  });
});

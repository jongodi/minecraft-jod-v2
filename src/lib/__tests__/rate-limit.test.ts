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
const { checkRateLimit, addressKey } = await import('@/lib/rateLimit');
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

describe('addressKey', () => {
  it('counts an IPv4 address as itself', () => {
    expect(addressKey('85.220.1.9')).toBe('85.220.1.9');
    expect(addressKey('::ffff:85.220.1.9')).toBe('85.220.1.9');
  });

  it('counts an IPv6 address by its /64, which one visitor holds whole', () => {
    expect(addressKey('2a01:6f0:1:2:aaaa:bbbb:cccc:dddd')).toBe('2a01:6f0:1:2::/64');
    expect(addressKey('2a01:06f0:0001:0002:1111:2222:3333:4444')).toBe('2a01:6f0:1:2::/64');
    expect(addressKey('2a01:6f0:1:2::1')).toBe('2a01:6f0:1:2::/64');
    expect(addressKey('2a01:6f0::5')).toBe('2a01:6f0:0:0::/64');
    expect(addressKey('[2A01:6F0:1:2::9]:443')).toBe('2a01:6f0:1:2::/64');
  });

  it('leaves what it cannot read as it is', () => {
    expect(addressKey('unknown')).toBe('unknown');
    expect(addressKey('zz::1')).toBe('zz::1');
  });
});

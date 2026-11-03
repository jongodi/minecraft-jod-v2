import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

/* When each member was last in the game: one hash, a name to a moment. */
const hash = new Map<string, string>();
vi.mock('@/lib/redis', () => ({
  getRedis: () => ({
    hset: async (_k: string, fields: Record<string, string>) => { for (const [f, v] of Object.entries(fields)) hash.set(f, v); return 1; },
    hgetall: async () => Object.fromEntries(hash),
  }),
}));

process.env.REDIS_URL = 'redis://test';
const { noteSeenNow, readLastSeen } = await import('@/lib/crew-seen');
afterAll(() => { delete process.env.REDIS_URL; });
beforeEach(() => hash.clear());

describe('last seen in the game', () => {
  it('notes who is in, by name as the crew list spells it, and reads it back', async () => {
    await noteSeenNow(['STEBBIAS', 'joenana'], Date.UTC(2026, 10, 3, 21, 40));
    expect(await readLastSeen()).toEqual({ stebbias: '2026-11-03T21:40:00.000Z', joenana: '2026-11-03T21:40:00.000Z' });
  });

  it('a later look moves only those seen then', async () => {
    await noteSeenNow(['stebbias', 'joenana'], Date.UTC(2026, 10, 3, 21, 40));
    await noteSeenNow(['joenana'], Date.UTC(2026, 10, 4, 20, 0));
    const seen = await readLastSeen();
    expect(seen.stebbias).toBe('2026-11-03T21:40:00.000Z');
    expect(seen.joenana).toBe('2026-11-04T20:00:00.000Z');
  });

  it('leaves out a stranger, a member never seen and a moment that will not parse', async () => {
    await noteSeenNow(['someguest'], Date.UTC(2026, 10, 3, 21, 40));
    hash.set('ammagaur', 'not a date');
    expect(await readLastSeen()).toEqual({});
    expect(hash.has('someguest')).toBe(false);
  });
});

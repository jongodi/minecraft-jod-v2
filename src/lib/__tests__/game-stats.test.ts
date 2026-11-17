import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/* A member Mojang did not answer for (a busy minute, a renamed account) is
   not a member who has left: they are counted as failed, so /api/stats and
   the daily job keep their last numbers instead of saving the board without
   them. */

vi.mock('@/lib/exaroton', () => ({ getExarotonServerId: async () => 'srv', getServerHost: () => 'jod.exaroton.me' }));

const { readGameStats } = await import('@/lib/stats');
const { CREW_USERNAMES } = await import('@/lib/crew-types');

const uuidFor = (name: string) => [...name.padEnd(32, '0')].map(c => (c.charCodeAt(0) % 16).toString(16)).join('');
const dashed = (u: string) => u.replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, '$1-$2-$3-$4-$5');

describe('reading the game stats', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      const mojang = url.match(/api\.mojang\.com\/users\/profiles\/minecraft\/(.+)$/);
      if (mojang) {
        if (mojang[1] === 'stebbias') return { ok: false, status: 429, json: async () => ({}) };
        return { ok: true, json: async () => ({ id: uuidFor(mojang[1]), name: mojang[1] }) };
      }
      if (url.endsWith('/files/info/world/players/stats')) {
        return { ok: true, json: async () => ({ data: { children: CREW_USERNAMES.map(n => ({ name: `${dashed(uuidFor(n))}.json` })) } }) };
      }
      return { ok: true, json: async () => ({ stats: { 'minecraft:custom': { 'minecraft:play_time': 72000 } } }) };
    }));
  });
  afterEach(() => { vi.unstubAllGlobals(); });

  it('counts a member Mojang did not answer for as failed, not as gone', async () => {
    const read = await readGameStats('token');
    expect(read.players.map(p => p.username)).toEqual([...CREW_USERNAMES]);
    expect(read.failed).toEqual(['stebbias']);
    expect(read.counters.stebbias).toBeUndefined();
    expect(read.counters.joenana?.playTimeTicks).toBe(72000);
  });
});

/* Who a UUID belongs to does not change: a member Mojang names no longer (a
   new name in the game), or everyone when Mojang is down, is still known by
   the last full answer, so the Myndavél's photos keep finding their walls. */
describe('the crew\'s UUIDs', () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.resetModules(); vi.doUnmock('@/lib/redis'); delete process.env.REDIS_URL; });

  async function fresh(cached: { at: number; map: Record<string, string> } | null, answers: (name: string) => boolean) {
    vi.resetModules();
    const saved: unknown[] = [];
    process.env.REDIS_URL = 'redis://test';
    vi.doMock('@/lib/redis', () => ({ rGet: async () => cached, rSet: async (_k: string, v: unknown) => { saved.push(v); } }));
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      const name = url.match(/minecraft\/(.+)$/)![1];
      return answers(name) ? { ok: true, json: async () => ({ id: uuidFor(name), name }) } : { ok: false, status: 404, json: async () => ({}) };
    }));
    const { crewUuids } = await import('@/lib/stats');
    return { map: await crewUuids(), saved };
  }
  const full = Object.fromEntries(CREW_USERNAMES.map(n => [dashed(uuidFor(n)), n]));
  const old = Date.now() - 3 * 24 * 3600_000;

  it('keeps a member who took a new name under the UUID they had', async () => {
    const { map, saved } = await fresh({ at: old, map: full }, n => n !== 'stebbias');
    expect(map).toEqual(full);
    expect(saved).toHaveLength(1);
  });

  it('stands on the last full answer while Mojang is down', async () => {
    expect((await fresh({ at: old, map: full }, () => false)).map).toEqual(full);
  });

  it('is partial, and not kept, when there is no full answer to stand on', async () => {
    const { map, saved } = await fresh(null, n => n !== 'stebbias');
    expect(Object.keys(map)).toHaveLength(CREW_USERNAMES.length - 1);
    expect(saved).toHaveLength(0);
  });
});

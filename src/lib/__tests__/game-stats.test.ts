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

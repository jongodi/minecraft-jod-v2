import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

/* Every wall is read in one MGET, and each one has to come out exactly as
   readProfile reads it alone: an unreadable wall is an empty one, and a
   failed read leaves every wall empty rather than taking the page down. */
const store = new Map<string, string>();
let failMget = false;
const mget = vi.fn(async (...keys: string[]) => {
  if (failMget) throw new Error('timeout');
  return keys.map(k => store.get(k) ?? null);
});
vi.mock('@/lib/redis', () => ({
  getRedis: () => ({ mget, get: async (k: string) => store.get(k) ?? null }),
  rGet: async (k: string) => { const v = store.get(k); if (!v) return null; try { return JSON.parse(v); } catch { return null; } },
}));

process.env.REDIS_URL = 'redis://test';
const { readAllProfiles, readProfile, CREW_USERNAMES } = await import('@/lib/crew');
afterAll(() => { delete process.env.REDIS_URL; });

const entry = (id: string) => ({ id, text: id, photos: [], placeId: null, createdAt: '2026-01-01T00:00:00.000Z', lanterns: [], replies: [] });

beforeEach(() => {
  store.clear();
  mget.mockClear();
  failMget = false;
  store.set('crew:profile:joenana', JSON.stringify({ username: 'joenana', bio: 'hæ', entries: [entry('a')], coverPhotoId: null, bestDrawMs: 180 }));
  /* written before the wall existed: notes kept apart */
  store.set('crew:profile:stebbias', JSON.stringify({ username: 'stebbias', bio: '', posts: [{ id: 'p', text: 'gamalt', createdAt: '2025-01-01T00:00:00.000Z' }] }));
  store.set('crew:profile:ammagaur', '{"username":"AmmaGaur","entries":[');
});

describe('readAllProfiles', () => {
  it('reads every wall in one go, in the crew list order, as readProfile reads each', async () => {
    const all = await readAllProfiles();
    expect(mget).toHaveBeenCalledTimes(1);
    expect(all.map(p => p.username)).toEqual([...CREW_USERNAMES]);
    /* one at a time: the mocked module, imported by several reads at once, was sometimes the real one */
    const alone = [];
    for (const u of CREW_USERNAMES) alone.push(await readProfile(u));
    expect(all).toEqual(alone);
  });

  it('shows an unreadable wall as an empty one', async () => {
    const amma = (await readAllProfiles()).find(p => p.username === 'AmmaGaur')!;
    expect(amma.entries).toEqual([]);
  });

  it('shows every wall empty when the read fails', async () => {
    failMget = true;
    const said = vi.spyOn(console, 'error').mockImplementation(() => {});
    const all = await readAllProfiles();
    expect(said).toHaveBeenCalled();
    said.mockRestore();
    expect(all.map(p => p.username)).toEqual([...CREW_USERNAMES]);
    expect(all.every(p => p.entries.length === 0 && p.bio === '')).toBe(true);
  });
});

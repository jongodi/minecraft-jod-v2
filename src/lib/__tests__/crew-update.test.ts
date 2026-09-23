import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

/* An in-memory Redis with just what updateProfile uses: GET and the
   compare-and-set script, which it runs the way Redis would. `failNextGet`
   stands in for a timeout; `race` writes the key between a read and a set,
   the way a second member's request would. */
const store = new Map<string, string>();
let failNextGet = false;
let race: (() => void) | null = null;
const fake = {
  get: async (key: string) => {
    if (failNextGet) { failNextGet = false; throw new Error('timeout'); }
    return store.get(key) ?? null;
  },
  eval: async (_script: string, _n: number, key: string, expected: string, next: string) => {
    if (race) { const r = race; race = null; r(); }
    const cur = store.get(key);
    if ((cur === undefined && expected === '') || cur === expected) { store.set(key, next); return 1; }
    return 0;
  },
};
vi.mock('@/lib/redis', () => ({ getRedis: () => fake, rGet: async (k: string) => { const v = store.get(k); return v ? JSON.parse(v) : null; }, rSet: async (k: string, v: unknown) => { store.set(k, JSON.stringify(v)); } }));

const KEY = 'crew:profile:joenana';
const entry = (id: string) => ({ id, text: id, photos: [], placeId: null, createdAt: '2026-01-01T00:00:00.000Z', lanterns: [], replies: [] });

process.env.REDIS_URL = 'redis://test';
const { updateProfile } = await import('@/lib/crew');
afterAll(() => { delete process.env.REDIS_URL; });

beforeEach(() => {
  store.clear();
  store.set(KEY, JSON.stringify({ username: 'joenana', bio: 'hæ', entries: [entry('a')], coverPhotoId: null, bestDrawMs: null }));
  failNextGet = false;
  race = null;
});

describe('updateProfile', () => {
  it('never writes an empty wall over the real one when the read fails', async () => {
    failNextGet = true;
    await expect(updateProfile('joenana', p => { p.entries.unshift(entry('b')); })).rejects.toThrow(/lesa vegginn/);
    expect(JSON.parse(store.get(KEY)!).entries.map((e: { id: string }) => e.id)).toEqual(['a']);
  });

  it('refuses a stored value that does not parse instead of starting over', async () => {
    store.set(KEY, '{"username":"joenana","entries":[');
    await expect(updateProfile('joenana', p => { p.bio = 'nýtt'; })).rejects.toThrow(/lesa vegginn/);
    expect(store.get(KEY)).toBe('{"username":"joenana","entries":[');
  });

  it('makes the change again on the newer wall when another write got there first', async () => {
    race = () => {
      const cur = JSON.parse(store.get(KEY)!);
      cur.entries[0].lanterns = ['stebbias'];
      store.set(KEY, JSON.stringify(cur));
    };
    const runs = vi.fn();
    await updateProfile('joenana', p => { runs(); p.entries.unshift(entry('b')); });
    const saved = JSON.parse(store.get(KEY)!);
    expect(runs).toHaveBeenCalledTimes(2);
    expect(saved.entries.map((e: { id: string }) => e.id)).toEqual(['b', 'a']);
    expect(saved.entries[1].lanterns).toEqual(['stebbias']);
  });

  it('writes nothing when the change changes nothing', async () => {
    const before = store.get(KEY);
    const evalSpy = vi.spyOn(fake, 'eval');
    await updateProfile('joenana', p => { p.entries.find(e => e.id === 'gone'); });
    expect(evalSpy).not.toHaveBeenCalled();
    expect(store.get(KEY)).toBe(before);
    evalSpy.mockRestore();
  });

  it('lets a change refuse with its own message, leaving the wall alone', async () => {
    const before = store.get(KEY);
    await expect(updateProfile('joenana', () => { throw new Error('Myndin fannst ekki á veggnum.'); })).rejects.toThrow('Myndin fannst ekki á veggnum.');
    expect(store.get(KEY)).toBe(before);
  });
});

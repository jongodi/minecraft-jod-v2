import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

/* Items given to a sign, as the route keeps them: any member gives any item
   once and takes it back, the body saying which; nobody signed out, nothing
   that is not an item, and nothing kept once nobody gives anything. */
const store = new Map<string, string>();
const fake = {
  get: async (key: string) => store.get(key) ?? null,
  eval: async (_script: string, _n: number, key: string, expected: string, next: string) => {
    const cur = store.get(key);
    if ((cur === undefined && expected === '') || cur === expected) { store.set(key, next); return 1; }
    return 0;
  },
};
let me: string | null = 'joenana';
vi.mock('@/lib/redis', () => ({ getRedis: () => fake, rGet: async (k: string) => { const v = store.get(k); return v ? JSON.parse(v) : null; } }));
vi.mock('@/lib/crew', async (orig) => ({
  ...(await orig<typeof import('@/lib/crew')>()),
  getCrewSession: async () => (me ? { username: me } : null),
}));

process.env.REDIS_URL = 'redis://test';
const { POST: react } = await import('../../app/api/crew/[username]/entries/[id]/react/route');
afterAll(() => { delete process.env.REDIS_URL; });

const KEY = 'crew:profile:stebbias';
const req = (body: unknown) => new NextRequest('https://jod.test/x', { method: 'POST', body: typeof body === 'string' ? body : JSON.stringify(body), headers: { 'content-type': 'application/json' } });
const on = (id: string, username = 'stebbias') => ({ params: Promise.resolve({ username, id }) });
const stored = () => JSON.parse(store.get(KEY)!) as { entries: Array<Record<string, any>> };

beforeEach(() => {
  me = 'joenana';
  store.clear();
  store.set(KEY, JSON.stringify({ username: 'stebbias', bio: '', coverPhotoId: null, bestDrawMs: null, entries: [
    { id: 'e', text: 'Brúin er komin', photos: [], placeId: null, createdAt: '2026-10-01T00:00:00.000Z', lanterns: [], replies: [] },
  ] }));
});

describe('giving an item', () => {
  it('gives it, once, and answers with everything given', async () => {
    const res = await react(req({ item: 'cake', given: true }), on('e'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ reactions: { cake: ['joenana'] } });
    await react(req({ item: 'cake', given: true }), on('e'));
    expect(stored().entries[0].reactions).toEqual({ cake: ['joenana'] });
  });

  it('keeps each member\'s gift, in the order the items came, and the owner may give too', async () => {
    await react(req({ item: 'skull', given: true }), on('e'));
    me = 'stebbias';
    await react(req({ item: 'cake', given: true }), on('e'));
    await react(req({ item: 'skull', given: true }), on('e'));
    expect(stored().entries[0].reactions).toEqual({ skull: ['joenana', 'stebbias'], cake: ['stebbias'] });
    expect(Object.keys(stored().entries[0].reactions)).toEqual(['skull', 'cake']);
  });

  it('takes it back, and keeps nothing once nobody gives anything', async () => {
    await react(req({ item: 'heart', given: true }), on('e'));
    const res = await react(req({ item: 'heart', given: false }), on('e'));
    expect(await res.json()).toEqual({ reactions: {} });
    expect('reactions' in stored().entries[0]).toBe(false);
  });

  it('flips the item when the body does not say which', async () => {
    await react(req({ item: 'poppy' }), on('e'));
    expect(stored().entries[0].reactions).toEqual({ poppy: ['joenana'] });
    await react(req({ item: 'poppy' }), on('e'));
    expect('reactions' in stored().entries[0]).toBe(false);
  });

  it('turns away the signed out, what is not an item, a sign that is not there, and a wall nobody has', async () => {
    expect((await react(req({ item: 'sword', given: true }), on('e'))).status).toBe(400);
    expect((await react(req({ item: '__proto__', given: true }), on('e'))).status).toBe(400);
    expect((await react(req('not json'), on('e'))).status).toBe(400);
    expect((await react(req({ item: 'cake', given: true }), on('gone'))).status).toBe(404);
    expect((await react(req({ item: 'cake', given: true }), on('e', 'nobody'))).status).toBe(404);
    me = null;
    expect((await react(req({ item: 'cake', given: true }), on('e'))).status).toBe(401);
    expect('reactions' in stored().entries[0]).toBe(false);
  });

  it('keeps the lanterns, the replies and the words as they were', async () => {
    await react(req({ item: 'diamond', given: true }), on('e'));
    expect(stored().entries[0]).toMatchObject({ text: 'Brúin er komin', lanterns: [], replies: [] });
  });
});

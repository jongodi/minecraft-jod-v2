import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

/* The routes under an entry change it through updateProfile, which runs the
   change again when another write got there first. What the first run found
   must not outlive it: an entry taken down in between is gone, and the
   answer has to say so. */
const store = new Map<string, string>();
let race: (() => void) | null = null;
const fake = {
  get: async (key: string) => store.get(key) ?? null,
  eval: async (_script: string, _n: number, key: string, expected: string, next: string) => {
    if (race) { const r = race; race = null; r(); }
    const cur = store.get(key);
    if ((cur === undefined && expected === '') || cur === expected) { store.set(key, next); return 1; }
    return 0;
  },
};
vi.mock('@/lib/redis', () => ({ getRedis: () => fake, rGet: async (k: string) => { const v = store.get(k); return v ? JSON.parse(v) : null; }, rSet: async (k: string, v: unknown) => { store.set(k, JSON.stringify(v)); } }));
vi.mock('@/lib/crew', async (orig) => ({
  ...(await orig<typeof import('@/lib/crew')>()),
  getCrewSession: async () => ({ username: 'stebbias' }),
  requireOwner: async () => true,
}));

const KEY = 'crew:profile:joenana';
const entry = (id: string) => ({ id, text: id, photos: [], placeId: null, createdAt: '2026-01-01T00:00:00.000Z', lanterns: [], replies: [] });
/* the entry is taken down between the route's read and its write */
const takeDown = () => { const cur = JSON.parse(store.get(KEY)!); cur.entries = []; store.set(KEY, JSON.stringify(cur)); };

process.env.REDIS_URL = 'redis://test';
const { POST: reply } = await import('../../app/api/crew/[username]/entries/[id]/replies/route');
const { POST: lantern } = await import('../../app/api/crew/[username]/entries/[id]/lantern/route');
const { PATCH: edit } = await import('../../app/api/crew/[username]/entries/[id]/route');
afterAll(() => { delete process.env.REDIS_URL; });

const params = { params: Promise.resolve({ username: 'joenana', id: 'a' }) };
const req = (method: string, body?: unknown) => new NextRequest('https://jod.test/x', { method, body: body === undefined ? undefined : JSON.stringify(body), headers: { 'content-type': 'application/json' } });

beforeEach(() => {
  store.clear();
  store.set(KEY, JSON.stringify({ username: 'joenana', bio: '', entries: [entry('a')], coverPhotoId: null, bestDrawMs: null }));
  race = takeDown;
});

describe('an entry taken down while a change to it is on its way', () => {
  it('a reply says the entry is gone, not that it was posted', async () => {
    expect((await reply(req('POST', { text: 'flott' }), params)).status).toBe(404);
  });

  it('a lantern says the entry is gone', async () => {
    expect((await lantern(req('POST'), params)).status).toBe(404);
  });

  it('an edit says the entry is gone', async () => {
    expect((await edit(req('PATCH', { text: 'nýtt' }), params)).status).toBe(404);
  });
});

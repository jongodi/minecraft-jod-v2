import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

/* A wall's store failing is not something the member did: every change to a
   wall answers it with the store's own Icelandic words and a 503, never an
   empty 500, a 400 or "not found". And a lantern does what its button showed,
   whatever another tab did in the meantime. */
const store = new Map<string, string>();
let down = false;
const fake = {
  get: async (key: string) => { if (down) throw new Error('ECONNRESET'); return store.get(key) ?? null; },
  eval: async (_script: string, _n: number, key: string, expected: string, next: string) => {
    const cur = store.get(key);
    if ((cur === undefined && expected === '') || cur === expected) { store.set(key, next); return 1; }
    return 0;
  },
};
vi.mock('@/lib/redis', () => ({ getRedis: () => fake, rGet: async (k: string) => { const v = store.get(k); return v ? JSON.parse(v) : null; } }));
vi.mock('@/lib/crew', async (orig) => ({
  ...(await orig<typeof import('@/lib/crew')>()),
  requireOwner: async () => ({ username: 'joenana' }),
  getCrewSession: async () => ({ username: 'stebbias' }),
}));
vi.mock('@/lib/crew-photos', async (orig) => ({ ...(await orig<typeof import('@/lib/crew-photos')>()), removePhotos: async () => {} }));

process.env.REDIS_URL = 'redis://test';
const { PATCH: edit, DELETE: takeDown } = await import('../../app/api/crew/[username]/entries/[id]/route');
const { POST: lantern } = await import('../../app/api/crew/[username]/entries/[id]/lantern/route');
const { POST: reply } = await import('../../app/api/crew/[username]/entries/[id]/replies/route');
afterAll(() => { delete process.env.REDIS_URL; });

const KEY = 'crew:profile:joenana';
const req = (method: string, body?: unknown) => new NextRequest('https://jod.test/x', { method, ...(body !== undefined && { body: JSON.stringify(body), headers: { 'content-type': 'application/json' } }) });
const onEntry = { params: Promise.resolve({ username: 'joenana', id: 'a' }) };
const READ_ERROR = 'Ekki tókst að lesa vegginn úr geymslunni; reyndu aftur.';

beforeEach(() => {
  down = false;
  store.clear();
  store.set(KEY, JSON.stringify({ username: 'joenana', bio: '', coverPhotoId: null, bestDrawMs: null,
    entries: [{ id: 'a', text: 'brúin', photos: [], placeId: null, createdAt: '2026-01-01T00:00:00.000Z', lanterns: ['stebbias'], replies: [] }] }));
});

describe('a wall whose store is down', () => {
  it.each([
    ['a lantern', () => lantern(req('POST', { lit: true }), onEntry)],
    ['a reply', () => reply(req('POST', { text: 'flott' }), onEntry)],
    ['an edit', () => edit(req('PATCH', { text: 'brúin mikla' }), onEntry)],
    ['taking it down', () => takeDown(req('DELETE'), onEntry)],
  ])('answers %s with the store\'s own words and a 503', async (_what, run) => {
    down = true;
    const res = await run();
    expect(res.status).toBe(503);
    expect((await res.json()).error).toBe(READ_ERROR);
  });

  it('skips a print that is not an object instead of throwing on it', async () => {
    const w = JSON.parse(store.get(KEY)!);
    w.entries[0].photos = [{ id: 'p1', filename: '/screenshots/the-hall.webp', caption: '', uploadedAt: '2026-01-01T00:00:00.000Z', takenAt: null }];
    store.set(KEY, JSON.stringify(w));
    const res = await edit(req('PATCH', { photos: [null, 3, { id: 'p1', caption: 'salurinn' }] }), onEntry);
    expect(res.status).toBe(200);
    expect((await res.json()).photos).toMatchObject([{ id: 'p1', caption: 'salurinn' }]);
  });
});

describe('a lantern', () => {
  it('stays lit when asked to light it, though another tab already had', async () => {
    const res = await lantern(req('POST', { lit: true }), onEntry);
    expect((await res.json()).lanterns).toEqual(['stebbias']);
  });

  it('goes out when asked to, and stays out when asked again', async () => {
    await lantern(req('POST', { lit: false }), onEntry);
    const res = await lantern(req('POST', { lit: false }), onEntry);
    expect((await res.json()).lanterns).toEqual([]);
  });

  it('flips when the body does not say which', async () => {
    const res = await lantern(req('POST'), onEntry);
    expect((await res.json()).lanterns).toEqual([]);
  });
});

import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

/* An entry's place is one on the map. A made-up id was stored and counted
   under a place nobody can open; it is turned away now, but a place the
   entry already has is kept even after it comes off the map, and with no map
   to check against a place is taken as given. */
const store = new Map<string, string>();
const fake = {
  get: async (key: string) => store.get(key) ?? null,
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
}));
let mapDown = false;
vi.mock('@/lib/map', () => ({
  readMap: async () => {
    if (mapDown) throw new Error('Ekki tókst að lesa kortið úr geymslunni; ekkert var vistað.');
    return { locations: [{ id: 3 }, { id: 7 }], zones: [], paths: [] };
  },
}));

process.env.REDIS_URL = 'redis://test';
const { POST: pin } = await import('../../app/api/crew/[username]/entries/route');
const { PATCH: edit } = await import('../../app/api/crew/[username]/entries/[id]/route');
afterAll(() => { delete process.env.REDIS_URL; });

const KEY = 'crew:profile:joenana';
const entry = (id: string, placeId: number | null) => ({ id, text: id, photos: [], placeId, createdAt: '2026-01-01T00:00:00.000Z', lanterns: [], replies: [] });
const wall = () => JSON.parse(store.get(KEY)!) as { entries: Array<{ id: string; text: string; placeId: number | null }> };
const req = (method: string, body: unknown) => new NextRequest('https://jod.test/x', { method, body: JSON.stringify(body), headers: { 'content-type': 'application/json' } });
const onWall = { params: Promise.resolve({ username: 'joenana' }) };
const onEntry = (id: string) => ({ params: Promise.resolve({ username: 'joenana', id }) });

beforeEach(() => {
  mapDown = false;
  store.clear();
  /* "gone" was pinned at a place that has since come off the map */
  store.set(KEY, JSON.stringify({ username: 'joenana', bio: '', entries: [entry('a', 3), entry('gone', 42)], coverPhotoId: null, bestDrawMs: null }));
});

describe('pinning at a place', () => {
  it('turns away a place that is not on the map, and keeps nothing', async () => {
    const res = await pin(req('POST', { text: 'hæ', placeId: 99 }), onWall);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('Þessi staður er ekki á kortinu.');
    expect(wall().entries).toHaveLength(2);
  });

  it('pins at a place that is on the map', async () => {
    const res = await pin(req('POST', { text: 'hæ', placeId: 7 }), onWall);
    expect(res.status).toBe(201);
    expect(wall().entries[0].placeId).toBe(7);
  });

  it('takes the place as given when the map cannot be read', async () => {
    mapDown = true;
    expect((await pin(req('POST', { text: 'hæ', placeId: 99 }), onWall)).status).toBe(201);
  });
});

describe('moving an entry', () => {
  it('turns away a move to a place that is not on the map', async () => {
    const res = await edit(req('PATCH', { text: 'a', placeId: 99 }), onEntry('a'));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('Þessi staður er ekki á kortinu.');
    expect(wall().entries.find(e => e.id === 'a')!.placeId).toBe(3);
  });

  it('moves it to a place on the map, or off every place', async () => {
    expect((await edit(req('PATCH', { placeId: 7 }), onEntry('a'))).status).toBe(200);
    expect(wall().entries.find(e => e.id === 'a')!.placeId).toBe(7);
    expect((await edit(req('PATCH', { placeId: null }), onEntry('a'))).status).toBe(200);
    expect(wall().entries.find(e => e.id === 'a')!.placeId).toBeNull();
  });

  it('lets the words change on an entry whose place has come off the map', async () => {
    const res = await edit(req('PATCH', { text: 'nýtt', placeId: 42 }), onEntry('gone'));
    expect(res.status).toBe(200);
    expect(wall().entries.find(e => e.id === 'gone')).toMatchObject({ text: 'nýtt', placeId: 42 });
  });
});

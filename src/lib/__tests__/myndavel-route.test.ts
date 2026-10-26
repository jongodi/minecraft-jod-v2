import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { createHmac, randomUUID } from 'crypto';

/* A photo from the Myndavél, as Framköllun posts it: signed, pinned once to
   the photographer's wall however often it comes, turned away for anyone
   outside the crew or a full wall, and taken down by its writer like any print. */
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

const JOENANA = '5e7a1c3f-2b4d-4e6f-8a9b-0c1d2e3f4a5b';
let mojang: Record<string, string> = {};
vi.mock('@/lib/stats', () => ({ crewUuids: async () => mojang }));

const stored: string[] = [];
const deleted: string[] = [];
vi.mock('@/lib/blob-store', async (orig) => ({
  ...(await orig<typeof import('@/lib/blob-store')>()),
  storeImage: async (pathname: string) => { stored.push(pathname); return `/screenshots/upload-${pathname.split('/').pop()}`; },
  deleteStoredImage: async (url: string) => { deleted.push(url); },
}));
let owner: string | null = 'joenana';
vi.mock('@/lib/crew', async (orig) => ({
  ...(await orig<typeof import('@/lib/crew')>()),
  requireOwner: async (u: string) => (owner && owner === u.toLowerCase() ? { username: owner } : null),
}));

process.env.REDIS_URL = 'redis://test';
process.env.MYNDAVEL_INGEST_SECRET = 'leyndo';
const { POST: ingest } = await import('../../app/api/myndavel/route');
const { DELETE: takeDown } = await import('../../app/api/crew/[username]/entries/[id]/route');
const { offlineUuid, onMap } = await import('@/lib/myndavel');
afterAll(() => { delete process.env.REDIS_URL; delete process.env.MYNDAVEL_INGEST_SECRET; delete process.env.MYNDAVEL_OFFLINE_UUIDS; });

const KEY = 'crew:profile:joenana';
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4]).toString('base64');
/* tile x -201, z -263 is in the map's copy (src/lib/bluemap-snapshot.json) */
const MAPPED = { dim: 'minecraft:overworld', x: -6420, y: 70, z: -8410 };

type Wall = { entries: Array<{ id: string; text: string; photos: Array<{ id: string; filename: string; takenAt: string | null }>; shot?: { job: string; spot: unknown } }> };
const wall = () => JSON.parse(store.get(KEY) ?? '{"entries":[]}') as Wall;

function post(body: Record<string, unknown>, { secret = 'leyndo', time = Math.floor(Date.now() / 1000) } = {}) {
  const text = JSON.stringify(body);
  const sig = `sha256=${createHmac('sha256', secret).update(`${time}.${text}`).digest('hex')}`;
  return new NextRequest('https://jod.test/api/myndavel', {
    method: 'POST', body: text,
    headers: { 'content-type': 'application/json', 'x-myndavel-time': String(time), 'x-myndavel-signature': sig },
  });
}
const photo = (over: Record<string, unknown> = {}) => ({
  job: randomUUID(), author: { uuid: JOENANA, name: 'joenana' }, caption: 'Kvöld við vatnið',
  takenAt: '2026-10-25T21:03:11.402Z', spot: MAPPED, photo: JPEG, ...over,
});

beforeEach(() => {
  store.clear();
  stored.length = 0;
  deleted.length = 0;
  owner = 'joenana';
  mojang = { [JOENANA]: 'joenana', ...Object.fromEntries(['a', 'b', 'c', 'd', 'e', 'f', 'g'].map((c, i) => [`00000000-0000-4000-8000-00000000000${i}`, c])) };
  delete process.env.MYNDAVEL_OFFLINE_UUIDS;
});

describe('a photo from the Myndavél', () => {
  it('is pinned to the photographer\'s wall with its print, caption, time and spot', async () => {
    const p = photo();
    const res = await ingest(post(p));
    expect(res.status).toBe(201);
    const { url, entryId } = await res.json();
    const [e] = wall().entries;
    expect(url).toBe(`/crew/joenana#${e.id}`);
    expect(entryId).toBe(e.id);
    expect(e.text).toBe('Kvöld við vatnið');
    expect(e.photos).toHaveLength(1);
    expect(e.photos[0].id).toBe(p.job);
    expect(e.photos[0].takenAt).toBe('2026-10-25T21:03:11.402Z');
    expect(e.shot).toEqual({ job: p.job, spot: { x: -6420, y: 70, z: -8410 } });
    expect(stored).toEqual([`crew/joenana/${p.job}.jpg`]);
  });

  it('goes up once however often it is sent', async () => {
    const p = photo();
    const first = await (await ingest(post(p))).json();
    const again = await ingest(post(p));
    expect(again.status).toBe(200);
    expect((await again.json()).entryId).toBe(first.entryId);
    expect(wall().entries).toHaveLength(1);
  });

  it('keeps no spot when the photographer did not show it, or the map does not reach it', async () => {
    await ingest(post(photo({ spot: null })));
    await ingest(post(photo({ spot: { dim: 'minecraft:overworld', x: 900000, y: 64, z: 900000 } })));
    await ingest(post(photo({ spot: { ...MAPPED, dim: 'minecraft:the_nether' } })));
    expect(wall().entries.map(e => e.shot?.spot)).toEqual([null, null, null]);
  });

  it('may come without a caption', async () => {
    expect((await ingest(post(photo({ caption: null })))).status).toBe(201);
    expect(wall().entries[0].text).toBe('');
  });

  it('is turned away when someone outside the crew took it', async () => {
    const res = await ingest(post(photo({ author: { uuid: '11111111-2222-4333-8444-555555555555', name: 'gestur' } })));
    expect(res.status).toBe(403);
    expect((await res.json()).reason).toBe('notcrew');
    expect(store.size).toBe(0);
  });

  it('waits when Mojang could not say who is who', async () => {
    mojang = {};
    const res = await ingest(post(photo({ author: { uuid: '11111111-2222-4333-8444-555555555555', name: 'gestur' } })));
    expect(res.status).toBe(503);
  });

  it('is turned away from a full wall, and its print with it', async () => {
    store.set(KEY, JSON.stringify({ username: 'joenana', bio: '', coverPhotoId: null, bestDrawMs: null,
      entries: Array.from({ length: 400 }, (_, i) => ({ id: `n${i}`, text: `miði ${i}`, photos: [], placeId: null, createdAt: '2026-01-01T00:00:00.000Z', lanterns: [], replies: [] })) }));
    const p = photo();
    const res = await ingest(post(p));
    expect(res.status).toBe(409);
    expect((await res.json()).reason).toBe('full');
    expect(deleted).toEqual([`/screenshots/upload-${p.job}.jpg`]);
  });

  it('takes the smoke server\'s offline players only when told to', async () => {
    const bot = { uuid: offlineUuid('joenana'), name: 'joenana' };
    expect((await ingest(post(photo({ author: bot })))).status).toBe(403);
    process.env.MYNDAVEL_OFFLINE_UUIDS = '1';
    expect((await ingest(post(photo({ author: bot })))).status).toBe(201);
  });
});

describe('only Framköllun can post', () => {
  it('turns away a wrong signature, an old one, and none', async () => {
    expect((await ingest(post(photo(), { secret: 'annað' }))).status).toBe(401);
    expect((await ingest(post(photo(), { time: Math.floor(Date.now() / 1000) - 3600 }))).status).toBe(401);
    const bare = new NextRequest('https://jod.test/api/myndavel', { method: 'POST', body: JSON.stringify(photo()) });
    expect((await ingest(bare)).status).toBe(401);
    expect(store.size).toBe(0);
  });

  it('turns away a body that is not a JPEG photo', async () => {
    expect((await ingest(post(photo({ photo: Buffer.from('<svg/>').toString('base64') })))).status).toBe(400);
    expect((await ingest(post(photo({ job: 'nope' })))).status).toBe(400);
  });

  it('says so when the secret is not set', async () => {
    delete process.env.MYNDAVEL_INGEST_SECRET;
    try { expect((await ingest(post(photo()))).status).toBe(503); }
    finally { process.env.MYNDAVEL_INGEST_SECRET = 'leyndo'; }
  });
});

describe('taking it down', () => {
  it('is the writer\'s, and the print goes with it', async () => {
    const p = photo();
    const { entryId } = await (await ingest(post(p))).json();
    owner = 'stebbias';
    expect((await takeDown(new NextRequest('https://jod.test/x', { method: 'DELETE' }), { params: Promise.resolve({ username: 'joenana', id: entryId }) })).status).toBe(401);
    owner = 'joenana';
    expect((await takeDown(new NextRequest('https://jod.test/x', { method: 'DELETE' }), { params: Promise.resolve({ username: 'joenana', id: entryId }) })).status).toBe(200);
    expect(wall().entries).toHaveLength(0);
    expect(deleted).toEqual([`/screenshots/upload-${p.job}.jpg`]);
  });
});

describe('the map', () => {
  it('reaches a spot whose hires tile is in its copy', () => {
    expect(onMap('minecraft:overworld', { x: -6420, y: 70, z: -8410 })).toBe(true);
    expect(onMap('minecraft:overworld', { x: 900000, y: 70, z: 900000 })).toBe(false);
  });
});

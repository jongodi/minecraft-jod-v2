import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

/* The gallery is read for show with old English titles put into Icelandic.
   Anything that writes it back must start from what is stored, or one edit
   saves the shown text over every photo's typed one. */
const store = new Map<string, unknown>();
vi.mock('@/lib/redis', () => ({
  rGet: async (k: string) => store.get(k) ?? null,
  rSet: async (k: string, v: unknown) => { store.set(k, structuredClone(v)); },
}));
vi.mock('@/lib/auth', () => ({ requireAdmin: async () => true, unauthorizedResponse: () => new Response(null, { status: 401 }) }));
vi.mock('@/lib/map', () => ({ linkPhotoToLocation: async () => null, unlinkPhoto: async () => {} }));
vi.mock('@/lib/blob-store', () => ({ deleteStoredImage: async () => {} }));

process.env.REDIS_URL = 'redis://test';
const { PATCH, DELETE } = await import('../../app/api/admin/gallery/[id]/route');
const { POST: reorder } = await import('../../app/api/admin/gallery/reorder/route');
afterAll(() => { delete process.env.REDIS_URL; });

const photo = (id: string, title: string, order: number) => ({ id, filename: `/screenshots/${id}.webp`, title, sublabel: '', active: true, order });
const stored = () => store.get('gallery:photos') as ReturnType<typeof photo>[];
const json = (method: string, body: unknown) => new NextRequest('https://jod.test/x', { method, body: JSON.stringify(body), headers: { 'content-type': 'application/json' } });

beforeEach(() => {
  store.clear();
  store.set('gallery:photos', [photo('a', 'CITY HALL', 1), photo('b', 'Kastalinn', 2), photo('c', 'Brúin', 3)]);
});

describe('writing the gallery back', () => {
  it('an edit to one photo leaves the others as they were typed', async () => {
    expect((await PATCH(json('PATCH', { active: false }), { params: Promise.resolve({ id: 'b' }) })).status).toBe(200);
    expect(stored().find(p => p.id === 'a')?.title).toBe('CITY HALL');
  });

  it('answers with the photo as the admin panel shows it', async () => {
    const res = await PATCH(json('PATCH', { active: false }), { params: Promise.resolve({ id: 'a' }) });
    expect((await res.json()).title).toBe('Ráðhúsið');
    expect(stored().find(p => p.id === 'a')?.title).toBe('CITY HALL');
  });

  it('a photo taken down leaves the others as they were typed', async () => {
    await DELETE(new NextRequest('https://jod.test/x', { method: 'DELETE' }), { params: Promise.resolve({ id: 'c' }) });
    expect(stored().map(p => p.title)).toEqual(['CITY HALL', 'Kastalinn']);
  });

  it('a new order leaves the titles as they were typed', async () => {
    expect((await reorder(json('POST', { ids: ['c', 'b', 'a'] }))).status).toBe(200);
    expect(stored().find(p => p.id === 'a')?.title).toBe('CITY HALL');
  });
});

import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

/* Linking a photo to a place reads the whole map and writes it back. If the
   gallery can't be read at that moment, every pin's photo would resolve to
   nothing, and writing that back would unlink them all. */
const store = new Map<string, unknown>();
const writes: unknown[] = [];
let galleryDown = false;
vi.mock('@/lib/redis', () => ({
  rGet: async (k: string) => store.get(k) ?? null,
  rGetStrict: async (k: string) => store.get(k) ?? null,
  rSet: async (k: string, v: unknown) => { writes.push(v); store.set(k, structuredClone(v)); },
}));
vi.mock('@/lib/map-history', () => ({ recordVersion: async () => {} }));
vi.mock('@/lib/gallery', () => ({
  readGallery: async () => { if (galleryDown) throw new Error('Redis timeout'); return [{ id: 'p1' }, { id: 'p2' }]; },
}));

process.env.REDIS_URL = 'redis://test';
const { linkPhotoToLocation, readMap } = await import('@/lib/map');
const { DEFAULT_LOCATIONS } = await import('@/lib/map-types');
afterAll(() => { delete process.env.REDIS_URL; });

beforeEach(() => {
  store.clear(); writes.length = 0; galleryDown = false;
  const [a, b, ...rest] = DEFAULT_LOCATIONS;
  store.set('map:config', { locations: [{ ...a, photoId: 'p1' }, { ...b, photoId: 'p2' }, ...rest], zones: [] });
});

describe('linking a photo to a place', () => {
  it('moves the one link and keeps the others', async () => {
    await linkPhotoToLocation('p1', DEFAULT_LOCATIONS[2].id);
    const map = await readMap();
    expect(map.locations.map(l => l.photoId).slice(0, 3)).toEqual([null, 'p2', 'p1']);
  });

  it('writes nothing when the gallery cannot be read', async () => {
    galleryDown = true;
    await expect(linkPhotoToLocation('p1', DEFAULT_LOCATIONS[2].id)).rejects.toThrow();
    expect(writes).toEqual([]);
  });

  it('still shows the map, unlinked, when only showing it', async () => {
    galleryDown = true;
    expect((await readMap()).locations[0].photoId).toBeNull();
  });
});

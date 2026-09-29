import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import type { MapConfig } from '@/lib/map-types';

/* Redis, in memory: strings and one list */
const kv = new Map<string, string>();
let list: string[] = [];
vi.mock('@/lib/redis', () => ({
  getRedis: () => ({
    llen: async () => list.length,
    lpush: async (_k: string, ...v: string[]) => { list = [...v.reverse(), ...list]; return list.length; },
    ltrim: async (_k: string, a: number, b: number) => { list = list.slice(a, b + 1); return 'OK'; },
    lrange: async (_k: string, a: number, b: number) => list.slice(a, b + 1),
  }),
  rGet: async (k: string) => (kv.has(k) ? JSON.parse(kv.get(k)!) : null),
  rSet: async (k: string, v: unknown) => { kv.set(k, JSON.stringify(v)); },
  rGetStrict: async (k: string) => (kv.has(k) ? JSON.parse(kv.get(k)!) : null),
}));
vi.mock('@/lib/auth', () => ({ requireAdmin: async () => true, unauthorizedResponse: () => new Response(null, { status: 401 }) }));
vi.mock('@/lib/gallery', () => ({ readGallery: async () => [] }));

const { summarize, readHistory, HISTORY_SIZE } = await import('@/lib/map-history');
const { writeMap } = await import('@/lib/map');
const route = await import('../../app/api/admin/map/history/route');

const loc = (id: number, over: Partial<MapConfig['locations'][number]> = {}) => ({
  id, label: `Staður ${id}`, sublabel: '', x: 10 * id, y: 10 * id, type: 'surface' as const, photoId: null, builders: [], world: null, ...over,
});
const map = (locations: MapConfig['locations'], over: Partial<MapConfig> = {}): MapConfig => ({ locations, zones: [], paths: [], ...over });

describe('summarize', () => {
  const base = map([loc(1, { label: 'Feneyjar' }), loc(2, { label: 'Vitinn' })]);

  it('names one place and counts several', () => {
    expect(summarize(base, map([loc(1, { label: 'Feneyjar', x: 99 }), loc(2, { label: 'Vitinn' })]))).toBe('Staður færður: Feneyjar');
    expect(summarize(base, map([loc(1, { label: 'Feneyjar', x: 99 }), loc(2, { label: 'Vitinn', y: 99 })]))).toBe('2 staðir færðir');
  });

  it('says what else changed, in one line', () => {
    const next = map([loc(1, { label: 'Feneyjar', world: { x: -6781, y: 84, z: -8842 } }), loc(3, { label: 'Bankinn' })], { terrain: ['~~'] });
    expect(summarize(base, next)).toBe('Nýr staður: Bankinn, eytt: Vitinn, hnit í heiminum: Feneyjar, landslag málað');
  });

  it('says so when nothing changed', () => {
    expect(summarize(base, base)).toBe('Vistað án breytinga');
    expect(summarize(null, base)).toBe('Kortið eins og það var');
  });
});

describe('the map history', () => {
  beforeEach(() => {
    kv.clear();
    list = [];
    vi.stubEnv('REDIS_URL', 'redis://test');
  });
  afterEach(() => vi.unstubAllEnvs());

  it('keeps the map as it was before the first recorded save, and at most 30', async () => {
    kv.set('map:config', JSON.stringify(map([loc(1)])));
    await writeMap(map([loc(1, { x: 55 })]));
    let h = await readHistory();
    expect(h.map(v => v.summary)).toEqual(['Staður færður: Staður 1', 'Kortið eins og það var']);

    for (let i = 0; i < 40; i++) await writeMap(map([loc(1, { x: i })]));
    h = await readHistory();
    expect(h).toHaveLength(HISTORY_SIZE);
  });

  it('restores a version as a new save, which can itself be undone', async () => {
    kv.set('map:config', JSON.stringify(map([loc(1)])));
    await writeMap(map([loc(1), loc(2)]));
    const [added, original] = await readHistory();
    expect(added.summary).toBe('Nýr staður: Staður 2');

    const res = await route.POST(new NextRequest('https://jod.test/api/admin/map/history', { method: 'POST', body: JSON.stringify({ id: original.id }) }));
    expect(res.status).toBe(200);
    expect(JSON.parse(kv.get('map:config')!).locations.map((l: { id: number }) => l.id)).toEqual([1]);

    const newest = (await readHistory())[0];
    expect(newest.summary).toMatch(/^Endurheimt frá .+: eytt: Staður 2$/);

    const list = await (await route.GET()).json();
    expect(list.versions[0]).not.toHaveProperty('config');
  });

  it('turns away a version it does not have', async () => {
    const res = await route.POST(new NextRequest('https://jod.test/api/admin/map/history', { method: 'POST', body: JSON.stringify({ id: 'nope' }) }));
    expect(res.status).toBe(404);
  });
});

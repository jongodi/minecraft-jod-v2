import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

/* The server's own news: a new version of the game, packs put on the shelf
   or updated there. Each change told once, however many look at once; the
   first look only remembers; and the board puts a day's shelf on one slip. */
const store = new Map<string, string>();
const lists = new Map<string, string[]>();
const fake = {
  get: async (k: string) => store.get(k) ?? null,
  getset: async (k: string, v: string) => { const old = store.get(k) ?? null; store.set(k, v); return old; },
  lpush: async (k: string, ...v: string[]) => { const l = lists.get(k) ?? []; lists.set(k, [...[...v].reverse(), ...l]); return l.length + v.length; },
  ltrim: async (k: string, a: number, b: number) => { lists.set(k, (lists.get(k) ?? []).slice(a, b + 1)); return 'OK'; },
  lrange: async (k: string, a: number, b: number) => (lists.get(k) ?? []).slice(a, b + 1),
};
let shelf: Array<{ id: number; name: string; currentVersion?: string; glyph: string | null; category: string }> = [];
vi.mock('@/lib/redis', () => ({ getRedis: () => fake }));
vi.mock('@/lib/datapacks-store', () => ({ getPublicPacks: async () => shelf }));

process.env.REDIS_URL = 'redis://test';
const { noteServerVersion, noteShelf, readServerNews, shelfNews, versionNews } = await import('@/lib/server-news');
const { boardItems } = await import('@/lib/board');
const { inFilter } = await import('@/lib/board-types');
afterAll(() => { delete process.env.REDIS_URL; });

const pack = (id: number, name: string, currentVersion?: string) => ({ id, name, currentVersion, glyph: null, category: 'BUILD' });

beforeEach(() => { store.clear(); lists.clear(); shelf = []; });

describe('what changed', () => {
  it('tells a pack new to the shelf and a pack whose version moved, and nothing else', () => {
    const p = (name: string, version: string | null, glyph: string | null = null) => ({ name, version, glyph, category: 'BUILD' });
    const news = shelfNews({ 1: p('MVP', '1.0'), 2: p('Gönguleiðir', '2.1'), 3: p('Ljós', '1.0') }, { 1: p('MVP', '1.1'), 2: p('Gönguleiðir II', '2.1', 'tree'), 4: p('Nýr', null), 3: p('Ljós', null) }, 'T');
    expect(news).toEqual([
      { kind: 'pack', at: 'T', packId: 1, name: 'MVP', version: '1.1', was: '1.0', added: false, glyph: null, category: 'BUILD' },
      { kind: 'pack', at: 'T', packId: 4, name: 'Nýr', version: null, was: null, added: true, glyph: null, category: 'BUILD' },
    ]);
  });

  it('only remembers the first version it sees', () => {
    expect(versionNews(null, '26.3', 'T')).toEqual([]);
    expect(versionNews('26.3', '26.3', 'T')).toEqual([]);
    expect(versionNews('26.3', '26.4', 'T')).toEqual([{ kind: 'version', at: 'T', from: '26.3', to: '26.4' }]);
  });
});

describe('the version', () => {
  it('is remembered at first, told when it moves, and told once by two readers at once', async () => {
    await noteServerVersion({ source: 'exaroton', version: '26.3' });
    expect(await readServerNews()).toEqual([]);
    await noteServerVersion({ source: 'exaroton', version: '26.4' });
    expect((await readServerNews()).map(n => n.kind === 'version' && `${n.from}>${n.to}`)).toEqual(['26.3>26.4']);
    await Promise.all([noteServerVersion({ source: 'exaroton', version: '26.5' }), noteServerVersion({ source: 'exaroton', version: '26.5' })]);
    expect((await readServerNews()).map(n => n.kind === 'version' && `${n.from}>${n.to}`)).toEqual(['26.4>26.5', '26.3>26.4']);
  });

  it('is never taken from the public lookup, which writes it its own way', async () => {
    store.set('server:version', '26.5');
    await noteServerVersion({ source: 'mcsrvstat', version: 'Paper 26.5' });
    await noteServerVersion({ source: 'exaroton' });
    expect(store.get('server:version')).toBe('26.5');
    expect(await readServerNews()).toEqual([]);
  });
});

describe('the shelf', () => {
  it('is remembered at first, then tells what was put up and what moved', async () => {
    shelf = [pack(1, 'MVP', '1.0'), pack(2, 'Gönguleiðir', '2.1')];
    await noteShelf();
    expect(await readServerNews()).toEqual([]);
    shelf = [pack(1, 'MVP', '1.1'), pack(2, 'Gönguleiðir', '2.1'), pack(1001, 'Ljós')];
    await noteShelf();
    expect((await readServerNews()).map(n => n.kind === 'pack' && `${n.name}:${n.added ? 'new' : `${n.was}>${n.version}`}`)).toEqual(['MVP:1.0>1.1', 'Ljós:new']);
    await noteShelf();
    expect(await readServerNews()).toHaveLength(2);
  });
});

describe('on the board', () => {
  const NOW = Date.parse('2026-10-24T18:00:00.000Z');
  const base = { walls: [], map: null, gallery: [], nights: [], past: [], advancements: null, news: [], syncedAt: null, now: NOW };
  const at = (h: number) => new Date(NOW - h * 3600_000).toISOString();
  const p = (h: number, packId: number, name: string, version: string | null, was: string | null, added = false) =>
    ({ kind: 'pack' as const, at: at(h), packId, name, version, was, added, glyph: null, category: 'BUILD' });

  it('tells a version on a slip of its own, and a day of the shelf on one', () => {
    const items = boardItems({ ...base, server: [
      { kind: 'version', at: at(1), from: '26.3', to: '26.4' },
      p(2, 1, 'MVP', '1.2', '1.1'),
      p(3, 1, 'MVP', '1.1', '1.0'),
      p(4, 2, 'Ljós', '1.1', '1.0', false),
      p(5, 2, 'Ljós', '1.0', '1.1', false),
      p(6, 3, 'Nýr', '0.2', '0.1'),
      p(7, 3, 'Nýr', '0.1', null, true),
      p(40, 4, 'Gamall', '3.0', '2.0'),
    ] });
    expect(items.map(i => i.kind)).toEqual(['version', 'shelf', 'shelf']);
    const today = items[1];
    expect(today.kind === 'shelf' && today.packs.map(x => `${x.name}:${x.added ? `new ${x.version}` : `${x.was}>${x.version}`}`)).toEqual(['Nýr:new 0.2', 'MVP:1.0>1.2']);
    expect(today.kind === 'shelf' && today.packs[0].glyph).toHaveLength(12);
    expect(items.every(i => inFilter(i, 'vidburdir') && !inFilter(i, 'kortid'))).toBe(true);
  });
});

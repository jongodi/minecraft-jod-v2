import { describe, expect, it } from 'vitest';
import { boardItems, POSTS_KEEP, type BoardSources } from '@/lib/board';
import { newsOf } from '@/lib/map-news';
import { byDay, countNew, dayLabel, inFilter, isNew, newReplies, newestAt, replay, stampOf, stampsOf, type BoardItem } from '@/lib/board-types';
import { normalizeProfile } from '@/lib/crew-types';
import type { MapConfig } from '@/lib/map-types';
import type { Night } from '@/lib/play-night';

const NOW = Date.parse('2026-10-22T12:00:00.000Z');
const ago = (h: number) => new Date(NOW - h * 3600_000).toISOString();
const place = (id: number, extra: Partial<MapConfig['locations'][number]> = {}) => ({ id, label: `Staður ${id}`, sublabel: '', x: 0, y: 0, type: 'surface' as const, ...extra });
const map: MapConfig = { locations: [place(1, { photoId: 'g1', wood: 'cherry' }), place(2, { photoId: 'g2' })], zones: [], paths: [] };
const gallery = [
  { id: 'g1', filename: '/screenshots/a.webp', title: 'mynd eitt', sublabel: '', active: true, order: 1 },
  { id: 'g2', filename: '/screenshots/b.webp', title: 'mynd tvö', sublabel: '', active: true, order: 2 },
  { id: 'g3', filename: '/screenshots/c.webp', title: 'falin', sublabel: '', active: false, order: 3 },
];
const base: BoardSources = { walls: [], map, gallery, nights: [], past: [], advancements: null, news: [], syncedAt: null, now: NOW };
const kinds = (items: BoardItem[]) => items.map(i => i.kind);

describe('what the map news says', () => {
  it('tells a new place, a picture given to a place, and painting', () => {
    const prev: MapConfig = { locations: [place(1)], zones: [], paths: [], terrain: ['aa'] };
    const next: MapConfig = { locations: [place(1, { photoId: 'g1' }), place(2)], zones: [], paths: [], terrain: ['ab'] };
    expect(newsOf(prev, next, 'T')).toEqual([
      { kind: 'photo', at: 'T', photoId: 'g1', placeId: 1 },
      { kind: 'place', at: 'T', placeId: 2, photoId: null },
      { kind: 'painted', at: 'T', what: ['land'] },
    ]);
  });

  it('tells nothing of a save that only moved or removed things', () => {
    const prev: MapConfig = { locations: [place(1), place(2)], zones: [], paths: [] };
    expect(newsOf(prev, { locations: [place(1, { x: 9 })], zones: [], paths: [] }, 'T')).toEqual([]);
  });
});

describe('the board', () => {
  it('puts the crew\'s posts with the wood of their place, newest first', () => {
    const walls = [normalizeProfile({ entries: [
      { id: 'old', text: 'gamalt', photos: [], placeId: null, createdAt: ago(48) },
      { id: 'new', text: 'nýtt', photos: [], placeId: 1, createdAt: ago(1) },
    ] }, 'stebbias')];
    const items = boardItems({ ...base, walls });
    expect(items.map(i => i.id)).toEqual(['p-new', 'p-old']);
    expect(items[0]).toMatchObject({ kind: 'post', who: 'stebbias', wood: 'cherry' });
  });

  it('keeps the newest posts however old, and an old call still open', () => {
    const many = Array.from({ length: POSTS_KEEP + 5 }, (_, i) => ({ id: `e${i}`, text: 'x', photos: [], placeId: null, createdAt: ago(24 * 100 + i) }));
    const call = { id: 'call', text: 'vantar', photos: [], placeId: null, createdAt: ago(24 * 400), bounty: { reward: '1' } };
    const items = boardItems({ ...base, walls: [normalizeProfile({ entries: [...many, call] }, 'joenana')] });
    expect(items.filter(i => i.kind === 'post')).toHaveLength(POSTS_KEEP + 1);
    expect(items.some(i => i.id === 'p-call')).toBe(true);
  });

  it('tells a fire lit, a night decided and a night held', () => {
    const night: Night = {
      id: 'n1', by: 'AmmaGaur', createdAt: ago(30), note: 'Endinn', options: [{ id: 'a', at: ago(-48) }, { id: 'b', at: ago(-72) }],
      chosen: 'a', chosenBy: 'AmmaGaur', chosenAt: ago(5), cancelled: false, startedBy: null, outcome: null,
    };
    const out = { ...night, id: 'n2', cancelled: true };
    const past = [{ id: 'n0', by: 'stebbias', note: 'Brúin', at: ago(30), yes: ['stebbias'], came: ['stebbias'], noShows: [], startedBy: null }];
    const items = boardItems({ ...base, nights: [night, out], past });
    expect(kinds(items)).toEqual(['decided', 'held', 'fire']);
    expect(items[0]).toMatchObject({ who: 'AmmaGaur', time: night.options[0].at });
    expect(items[1]).toMatchObject({ who: 'stebbias', came: ['stebbias'], at: ago(24) });
  });

  it('gathers a member\'s advancements of one day into one notice, the challenges first', () => {
    const advancements = { readAt: ago(0), players: { joenana: {
      'minecraft:story/mine_stone': ago(3), 'minecraft:nether/return_to_sender': ago(2), 'minecraft:story/smelt_iron': ago(80),
    } } };
    const items = boardItems({ ...base, advancements }).filter(i => i.kind === 'advancement');
    expect(items).toHaveLength(2);
    expect(items[0].kind === 'advancement' && items[0].list[0].frame).toBe('challenge');
  });

  it('tells a picture once, on its place, and not at all when its place is told drawn with it', () => {
    const news = [
      { kind: 'photo' as const, at: ago(10), photoId: 'g2', placeId: null },
      { kind: 'photo' as const, at: ago(9), photoId: 'g2', placeId: 2 },
      { kind: 'place' as const, at: ago(8), placeId: 1 },
      { kind: 'photo' as const, at: ago(7), photoId: 'g1', placeId: 1 },
      { kind: 'photo' as const, at: ago(6), photoId: 'g3', placeId: null },
      { kind: 'painted' as const, at: ago(5), what: ['zones' as const] },
      { kind: 'painted' as const, at: ago(4), what: ['land' as const] },
    ];
    const items = boardItems({ ...base, news });
    expect(kinds(items)).toEqual(['painted', 'place', 'photo']);
    expect(items[0]).toMatchObject({ what: ['land', 'zones'] });
    expect(items[1]).toMatchObject({ placeId: 1, photo: '/screenshots/a.webp' });
    expect(items[2]).toMatchObject({ placeId: 2, label: 'Staður 2', photo: '/screenshots/b.webp', title: 'Mynd tvö' });
  });

  it('tells a picture hung later on a place drawn without one', () => {
    const news = [
      { kind: 'place' as const, at: ago(30), placeId: 1, photoId: null },
      { kind: 'photo' as const, at: ago(5), photoId: 'g1', placeId: 1 },
    ];
    const items = boardItems({ ...base, news });
    expect(kinds(items)).toEqual(['photo', 'place']);
    expect(items[1]).toMatchObject({ kind: 'place', photo: null });
  });

  it('tells advancements as news from the copy that brought them, filed on the day they were done', () => {
    const advancements = { readAt: ago(1), players: { joenana: { 'minecraft:story/mine_stone': ago(20) } }, found: { joenana: { 'minecraft:story/mine_stone': ago(1) } } };
    const [item] = boardItems({ ...base, advancements });
    expect(item).toMatchObject({ kind: 'advancement', at: ago(20), arrived: ago(1) });
    expect(stampOf(item).at).toBe(ago(1));
    expect(isNew(stampOf(item), ago(10), 'stebbias', NOW)).toBe(true);
  });

  it('tells a fresh copy of the 3D map, and nothing older than the board reaches', () => {
    expect(kinds(boardItems({ ...base, syncedAt: ago(2) }))).toEqual(['synced']);
    expect(boardItems({ ...base, syncedAt: ago(24 * 90) })).toEqual([]);
  });
});

describe('what is new, and where it goes', () => {
  it('is what came after the last look and not by the one looking', () => {
    const stamps = [{ at: ago(1), who: 'stebbias' }, { at: ago(2), who: null }, { at: ago(10), who: 'joenana' }];
    expect(countNew(stamps, ago(5), 'stebbias', NOW)).toBe(1);
    expect(countNew(stamps, ago(5), null, NOW)).toBe(2);
    expect(isNew({ at: ago(24 * 2), who: null }, null, null, NOW)).toBe(true);
    expect(isNew({ at: ago(24 * 4), who: null }, null, null, NOW)).toBe(false);
    expect(newestAt(stamps)).toBe(ago(1));
  });

  it('counts a reply under something older as news, and not one of your own', () => {
    const post: BoardItem = { kind: 'post', id: 'p-e', at: ago(48), who: 'stebbias', wood: 'oak', entry: { id: 'e', text: 'gamalt', photos: [], placeId: null, createdAt: ago(48), lanterns: [], replies: [
      { id: 'r1', username: 'joenana', text: 'hæ', createdAt: ago(2) },
      { id: 'r2', username: 'stebbias', text: 'hæ sjálf', createdAt: ago(1) },
      { id: 'r3', username: 'AmmaGaur', text: 'gamalt svar', createdAt: ago(40) },
    ] } };
    expect(stampsOf([post])).toHaveLength(4);
    expect(newestAt(stampsOf([post]))).toBe(ago(1));
    expect(newReplies(post, ago(24), 'stebbias', NOW)).toBe(1);
    expect(newReplies(post, ago(24), 'joenana', NOW)).toBe(1);
    expect(countNew(stampsOf([post]), ago(24), 'stebbias', NOW)).toBe(1);
  });

  it('makes changes again on a board fetched before them, and never puts a post up twice', () => {
    const entry = (id: string) => ({ id, text: id, photos: [], placeId: null, createdAt: ago(1), lanterns: [], replies: [] });
    const post = (id: string): Extract<BoardItem, { kind: 'post' }> => ({ kind: 'post', id: `p-${id}`, at: ago(1), who: 'joenana', wood: 'oak', entry: entry(id) });
    const fetched: BoardItem[] = [post('a'), post('b')];
    const after = replay(fetched, [
      { pin: post('new') },
      { id: 'a', update: e => ({ ...e, lanterns: ['stebbias'] }) },
      { id: 'b', remove: true },
      { pin: post('new') },
    ]);
    expect(after.map(i => i.id)).toEqual(['p-new', 'p-a']);
    expect(after[1].kind === 'post' && after[1].entry.lanterns).toEqual(['stebbias']);
  });

  it('files a note with prints under both, and the map under its own', () => {
    const post = (photos: number, text: string): BoardItem => ({ kind: 'post', id: 'p', at: ago(1), who: 'x', wood: 'oak', entry: { id: 'e', text, photos: Array.from({ length: photos }, (_, i) => ({ id: `${i}`, filename: '', caption: '', uploadedAt: '', takenAt: null })), placeId: null, createdAt: ago(1), lanterns: [], replies: [] } });
    expect(inFilter(post(1, 'hæ'), 'myndir') && inFilter(post(1, 'hæ'), 'midar')).toBe(true);
    expect(inFilter(post(1, ''), 'midar')).toBe(false);
    expect(inFilter({ kind: 'synced', id: 's', at: ago(1), who: null }, 'kortid')).toBe(true);
    expect(inFilter({ kind: 'synced', id: 's', at: ago(1), who: null }, 'vidburdir')).toBe(false);
  });

  it('heads the days in Icelandic', () => {
    expect(dayLabel('2026-10-22', NOW)).toBe('Í dag');
    expect(dayLabel('2026-10-21', NOW)).toBe('Í gær');
    expect(dayLabel('2026-10-19', NOW)).toBe('Mánudagur');
    expect(dayLabel('2026-10-01', NOW)).toBe('Fimmtudagur 1. október');
    expect(dayLabel('2025-12-24', NOW)).toBe('Miðvikudagur 24. desember 2025');
    expect(byDay([{ at: ago(1) }, { at: ago(2) }, { at: ago(30) }]).map(d => d.items.length)).toEqual([2, 1]);
  });
});

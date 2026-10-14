import { describe, expect, it } from 'vitest';
import { comings, oneLine, unread, CHAT_KEEP } from '@/lib/chat';
import { chatLines } from '@/lib/chat-server';
import { normalizeProfile } from '@/lib/crew-types';
import type { Night } from '@/lib/play-night';

const NOW = Date.parse('2026-10-13T20:00:00.000Z');
const photo = (id: string, caption = '') => ({ id, filename: `/blob/${id}.webp`, caption, uploadedAt: '2026-10-12T00:00:00Z', takenAt: null });
const wall = (username: string, entries: { id: string; text?: string; placeId?: number | null; createdAt: string; photos?: ReturnType<typeof photo>[] }[]) =>
  normalizeProfile({ username, entries: entries.map(e => ({ text: '', placeId: null, photos: [], ...e })) }, username);
const night = (over: Partial<Night>): Night => ({
  id: 'n1', by: 'joenana', createdAt: '2026-10-12T12:00:00.000Z', note: 'Brúin yfir síkið', options: [], chosen: null,
  chosenBy: null, cancelled: false, startedBy: null, outcome: null, ...over,
});

describe('the chat', () => {
  const walls = [
    wall('stebbias', [
      { id: 'e1', text: 'Turninn á kastalanum er loksins kominn upp.\nGreni alla leið.', createdAt: '2026-10-11T21:00:00.000Z', photos: [photo('p1')] },
      { id: 'e2', createdAt: '2026-10-12T18:00:00.000Z', placeId: 4, photos: [photo('p2')] },
      { id: 'old', text: 'Löngu liðið', createdAt: '2026-08-01T12:00:00.000Z' },
    ]),
    wall('joenana', [{ id: 'e3', createdAt: '2026-10-10T18:00:00.000Z', photos: [photo('p3', 'Bleika setrið í kvöldsól')] }]),
  ];
  const advancements = { readAt: '2026-10-13T12:05:00.000Z', players: { eikibleiki: {
    'minecraft:story/mine_stone': '2026-10-12T20:30:00.000Z',
    'minecraft:nether/fast_travel': '2024-07-01T20:00:00.000Z',
    'minecraft:not/a_real_one': '2026-10-12T20:31:00.000Z',
  } } };

  it('says what the crew pinned in their own name, the advancements in the game\'s words, and the fires', () => {
    const lines = chatLines({ walls, advancements, nights: [night({})], places: new Map([[4, 'Kastali Goða']]), now: NOW });
    expect(lines.map(l => l.kind)).toEqual(['print', 'say', 'fire', 'print', 'advancement']);
    expect(lines[1]).toMatchObject({ name: 'stebbias', text: 'Turninn á kastalanum er loksins kominn upp.', prints: 1, href: '/crew/stebbias#e1' });
    expect(lines[0]).toMatchObject({ name: 'joenana', caption: 'Bleika setrið í kvöldsól' });
    expect(lines[3]).toMatchObject({ name: 'stebbias', caption: 'Kastali Goða' });
    expect(lines[4]).toMatchObject({ name: 'eikibleiki', title: 'Steinöld', frame: 'task', href: '/crew/eikibleiki#afrek' });
    expect(lines[2]).toMatchObject({ name: 'joenana', note: 'Brúin yfir síkið', href: '/kvold/n1#hopur' });
  });

  it('leaves out what is old, a fire put out, and advancements it has no name for', () => {
    const lines = chatLines({ walls, advancements, nights: [night({ cancelled: true })], now: NOW });
    expect(lines.some(l => l.kind === 'say' && l.text === 'Löngu liðið')).toBe(false);
    expect(lines.some(l => l.kind === 'fire')).toBe(false);
    expect(lines.filter(l => l.kind === 'advancement')).toHaveLength(1);
  });

  it('keeps the newest lines only', () => {
    const many = wall('Gamla123', Array.from({ length: 20 }, (_, i) => ({ id: `m${i}`, text: `Lína ${i}`, createdAt: new Date(NOW - (20 - i) * 60_000).toISOString() })));
    const lines = chatLines({ walls: [many], advancements: null, nights: [], now: NOW });
    expect(lines).toHaveLength(CHAT_KEEP);
    expect(lines.at(-1)).toMatchObject({ text: 'Lína 19' });
  });

  it('cuts a long note at a word', () => {
    const cut = oneLine('Við byggðum brú yfir síkið við ráðhúsið og hún er orðin svo löng að hún nær alla leið yfir á hinn bakkann', 60);
    expect(cut.endsWith('…')).toBe(true);
    expect(cut.length).toBeLessThanOrEqual(61);
    expect(cut).not.toMatch(/ …$/);
  });

  it('shows what is new since it was last read, or the newest few on a first visit', () => {
    const lines = chatLines({ walls, advancements, nights: [], now: NOW });
    expect(unread(lines, null)).toEqual(lines.slice(-3));
    expect(unread(lines, '2026-10-12T00:00:00.000Z').map(l => l.kind)).toEqual(['print', 'advancement']);
    expect(unread(lines, '2026-10-13T00:00:00.000Z')).toEqual([]);
  });

  it('says who came in and who went out', () => {
    const at = '2026-10-13T20:00:00.000Z';
    expect(comings(['stebbias', 'joenana'], ['joenana', 'eikibleiki'], at)).toEqual([
      { kind: 'left', at, name: 'stebbias', href: '/crew/stebbias' },
      { kind: 'joined', at, name: 'eikibleiki', href: '/crew/eikibleiki' },
    ]);
    expect(comings(['stebbias'], ['Stebbias'], at)).toEqual([]);
  });
});

import { describe, expect, it } from 'vitest';
import { HEADLINE, MOST_TOASTS, markerKey, toShow, type OwnAdvancement } from '../ownAdvancements';
import { ownRecent, type CrewAdvancements } from '@/lib/advancements';

const adv = (n: number, frame: OwnAdvancement['frame'] = 'task'): OwnAdvancement =>
  ({ id: `story/${n}`, title: `Afrek ${n}`, frame, seen: `2026-11-0${n}T12:05:00.000Z` });
const NOW = '2026-11-09T18:00:00.000Z';

describe('which of a member\'s advancements a device shows them', () => {
  it('shows nothing on a device\'s first visit, and remembers from then', () => {
    expect(toShow([adv(1), adv(2)], null, NOW)).toEqual({ toasts: [], marker: NOW });
  });

  it('shows what reached the site since the last it showed, oldest first, in the game\'s three headlines', () => {
    const shown = toShow([adv(3, 'challenge'), adv(1), adv(2, 'goal')], adv(1).seen, NOW);
    expect(shown.toasts).toEqual([{ title: 'Markmiði náð!', data: 'Afrek 2' }, { title: 'Áskorun lokið!', data: 'Afrek 3' }]);
    expect(shown.marker).toBe(adv(3).seen);
    expect(HEADLINE.task).toBe('Afrek unnið!');
  });

  it('shows nothing twice, and the marker never goes back', () => {
    const first = toShow([adv(1), adv(2)], '2026-10-31T00:00:00.000Z', NOW);
    expect(first.toasts).toHaveLength(2);
    expect(toShow([adv(1), adv(2)], first.marker, NOW)).toEqual({ toasts: [], marker: first.marker });
  });

  it('is a queue of three at most: the two newest and a count of the rest', () => {
    const shown = toShow([1, 2, 3, 4, 5, 6].map(n => adv(n)), '2026-10-31T00:00:00.000Z', NOW);
    expect(shown.toasts).toHaveLength(MOST_TOASTS);
    expect(shown.toasts.map(t => t.data)).toEqual(['Afrek 5', 'Afrek 6', 'á veggnum þínum']);
    expect(shown.toasts[2].title).toBe('Og 4 afrek til viðbótar');
    expect(shown.marker).toBe(adv(6).seen);
  });

  it('remembers per member, whatever the capitals', () => {
    expect(markerKey('IMlonely')).toBe(markerKey('imlonely'));
    expect(markerKey('stebbias')).not.toBe(markerKey('joenana'));
  });
});

describe('a member\'s own recent advancements', () => {
  const now = Date.parse(NOW);
  const crew: CrewAdvancements = {
    readAt: NOW,
    players: { stebbias: { 'minecraft:story/mine_stone': '2024-06-01T20:00:00.000Z', 'minecraft:story/upgrade_tools': '2026-11-07T21:00:00.000Z', 'jod/unknown': '2026-11-07T21:00:00.000Z' } },
    found: { stebbias: { 'minecraft:story/upgrade_tools': '2026-11-08T12:05:00.000Z', 'jod/unknown': '2026-11-08T12:05:00.000Z', 'minecraft:story/smelt_iron': '2026-10-01T12:05:00.000Z' } },
  };

  it('are those a daily copy found in the last two weeks that the site has a name for, dated by the copy', () => {
    const list = ownRecent('Stebbias', crew, now);
    expect(list.map(a => a.id)).toEqual(['minecraft:story/upgrade_tools']);
    expect(list[0].seen).toBe('2026-11-08T12:05:00.000Z');
    expect(list[0].title.length).toBeGreaterThan(0);
  });

  it('are none for a member with nothing found, at the first copy, or without a store', () => {
    expect(ownRecent('joenana', crew, now)).toEqual([]);
    expect(ownRecent('stebbias', { readAt: NOW, players: crew.players }, now)).toEqual([]);
    expect(ownRecent('stebbias', null, now)).toEqual([]);
  });
});

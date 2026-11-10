import { describe, expect, it } from 'vitest';
import type { PublicNight } from '@/lib/play-night-view';
import { fullHouse, subtitleOf, titleNight, titleState, TITLE_WINDOW_MS } from '../nightMoments';

const AT = '2026-11-14T20:00:00.000Z';
const night = (over: Partial<PublicNight> = {}): PublicNight => ({
  id: 'n1', by: 'stebbias', note: '', phase: 'soon', options: [{ id: 'o1', at: AT, yes: ['stebbias', 'joenana', 'AmmaGaur'] }],
  answered: [], chosen: 'o1', chosenBy: 'stebbias', decidesAt: AT, startedBy: null, came: [], numbers: null, ...over,
});

describe('the title when the night begins', () => {
  it('is for the night with an hour chosen, at that hour', () => {
    expect(titleNight([night({ chosen: null, phase: 'open' }), night({ id: 'n2' })])).toMatchObject({ id: 'n2', at: Date.parse(AT), yes: 3 });
    expect(titleNight([night({ phase: 'over' })])).toBeNull();
  });

  it('waits for the hour, comes up for a quarter of an hour, and only once', () => {
    const n = titleNight([night()]);
    const at = Date.parse(AT);
    expect(titleState(n, at - 60_000, false)).toEqual({ kind: 'wait', ms: 60_000 });
    expect(titleState(n, at, false)).toEqual({ kind: 'show' });
    expect(titleState(n, at + TITLE_WINDOW_MS - 1, false)).toEqual({ kind: 'show' });
    expect(titleState(n, at + TITLE_WINDOW_MS, false)).toEqual({ kind: 'none' });
    expect(titleState(n, at, true)).toEqual({ kind: 'none' });
    expect(titleState(null, at, false)).toEqual({ kind: 'none' });
  });

  it('says the night\'s note, or who lit it, and how many are in once anyone is', () => {
    expect(subtitleOf(titleNight([night({ note: 'Byggjum brúna yfir gilið' })])!)).toBe('„Byggjum brúna yfir gilið“');
    expect(subtitleOf(titleNight([night()])!)).toBe('stebbias kveikti bálið');
    expect(subtitleOf(titleNight([night({ came: ['stebbias'] })])!)).toBe('stebbias kveikti bálið · 1 af 3 mætt');
  });
});

describe('fireworks when everyone who said yes has come', () => {
  it('bursts on a live night once every yes is in, whatever the case of their names', () => {
    expect(fullHouse([night({ phase: 'live', came: ['STEBBIAS', 'joenana', 'ammagaur', 'eikibleiki'] })])).toBe(true);
    expect(fullHouse([night({ phase: 'live', came: ['stebbias', 'joenana'] })])).toBe(false);
  });

  it('waits for the night to be going, and needs two or more', () => {
    expect(fullHouse([night({ phase: 'soon', came: ['stebbias', 'joenana', 'AmmaGaur'] })])).toBe(false);
    expect(fullHouse([night({ phase: 'live', options: [{ id: 'o1', at: AT, yes: ['stebbias'] }], came: ['stebbias'] })])).toBe(false);
  });
});

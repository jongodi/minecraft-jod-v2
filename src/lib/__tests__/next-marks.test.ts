import { describe, expect, it } from 'vitest';
import { nextMark } from '@/lib/milestone-marks';
import { comingMarks, comingWords } from '@/components/wall/NextMarks';

describe('the mark a counter is on its way to', () => {
  it('is the next one listed, with what is left and the mark before it', () => {
    expect(nextMark('deaths', 93)).toEqual({ mark: 100, from: 50, left: 7 });
    expect(nextMark('deaths', 100)).toEqual({ mark: 250, from: 100, left: 150 });
    expect(nextMark('mobs', 0)).toEqual({ mark: 1000, from: 0, left: 1000 });
  });

  it('goes on every 500 hours past the listed ones, and ends for the rest', () => {
    expect(nextMark('hours', 1000)).toEqual({ mark: 1500, from: 1000, left: 500 });
    expect(nextMark('hours', 1730.5)).toEqual({ mark: 2000, from: 1500, left: 269.5 });
    expect(nextMark('km', 10_000)).toBeNull();
    expect(nextMark('deaths', Number.NaN)).toBeNull();
  });
});

describe('the marks coming on a poster', () => {
  const stats = { playTimeTicks: 488 * 72_000, deaths: 93, mobKills: 2100, travelCm: 40 * 100_000 };

  it('names the two nearest, by how much of the way is left', () => {
    /* 12 of 250 hours left, 7 of 50 deaths; the mobs and the kilometres are far off */
    expect(comingMarks(stats).map(c => c.what)).toEqual(['hours', 'deaths']);
    expect(comingMarks(stats, 4).map(c => c.what)).toEqual(['hours', 'deaths', 'km', 'mobs']);
  });

  it('says nothing of a counter nothing is counted on, or one past its last mark', () => {
    expect(comingMarks({ playTimeHours: 20 }).map(c => c.what)).toEqual(['hours']);
    expect(comingMarks({ travelCm: 12_000 * 100_000 })).toEqual([]);
    expect(comingMarks({})).toEqual([]);
  });

  it('says them in the poster\'s words, with what is left rounded up', () => {
    const [hours, deaths] = comingMarks(stats);
    expect(comingWords(hours)).toEqual({ goal: '500 klst. í heiminum', left: '12 klst.' });
    expect(comingWords(deaths)).toEqual({ goal: '100. dauðsfallið', left: '7' });
    expect(comingWords({ what: 'km', mark: 2500, left: 0.2, ahead: 0 })).toEqual({ goal: '2.500 km á eigin fótum', left: '1 km' });
    expect(comingWords({ what: 'mobs', mark: 10_000, left: 1312, ahead: 0 })).toEqual({ goal: '10.000 verur felldar', left: '1.312' });
  });
});

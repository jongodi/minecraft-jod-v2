import { describe, expect, it } from 'vitest';
import { outlaws } from '../outlaws';

describe('what each of the crew is wanted for', () => {
  const players = [
    { username: 'stebbias',   playTimeHours: 446, mobKills: 7727, deaths: 7, drawMs: 300 },
    { username: 'joenana',    playTimeHours: 167, mobKills: 2014, deaths: 40, drawMs: 246 },
    { username: 'eikibleiki', playTimeHours: 20,  mobKills: 900,  deaths: 25 },
    { username: 'Gamla123' },
  ];

  it('makes the one on top of a charge its outlaw, lower first where lower is better', () => {
    const { byName } = outlaws(players);
    expect(byName.get('stebbias')!.led).toEqual(['playTimeHours', 'mobKills']);
    expect(byName.get('joenana')!.led).toEqual(['deaths', 'drawMs']);
    expect(byName.get('eikibleiki')!.led).toEqual([]);
  });

  it('gives everyone the charge they stand highest on, and nothing to one with no numbers', () => {
    const { byName } = outlaws(players);
    expect(byName.get('stebbias')!.best).toEqual({ id: 'playTimeHours', rank: 1, value: 446 });
    expect(byName.get('eikibleiki')!.best).toEqual({ id: 'deaths', rank: 2, value: 25 });
    expect(byName.get('gamla123')!.best).toBeNull();
  });

  it('names as most wanted the outlaw of the most charges, then the most top-three places', () => {
    expect(outlaws(players).mostWanted).toBe('stebbias');
    const even = [
      { username: 'a', mobKills: 10, deaths: 1 },
      { username: 'b', mobKills: 5, deaths: 9, playTimeHours: 1 },
    ];
    expect(outlaws(even).mostWanted).toBe('b');
  });

  it('has nobody most wanted on an empty board', () => {
    expect(outlaws([{ username: 'a' }, { username: 'b' }]).mostWanted).toBeNull();
  });
});

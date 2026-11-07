import { describe, expect, it } from 'vitest';
import { outlaws } from '@/components/badlands/outlaws';
import { posted, standingOf, wallBounty } from '../bounty';

describe('what a wanted poster posts against a member', () => {
  const players = [
    { username: 'stebbias',   playTimeHours: 446, mobKills: 7727, deaths: 7, drawMs: 300 },
    { username: 'joenana',    playTimeHours: 167, mobKills: 2014, deaths: 40, drawMs: 246 },
    { username: 'eikibleiki', playTimeHours: 20,  mobKills: 900,  deaths: 25, raidWins: 4 },
    { username: 'fafnir1994', playTimeHours: 94,  mobKills: 300,  deaths: 3, noShows: 2 },
    /* one who leads nothing: second on deaths, fourth on play time */
    { username: 'IMlonely',   playTimeHours: 89,  mobKills: 120,  deaths: 30 },
    { username: 'Gamla123' },
  ];
  const { byName } = outlaws(players);

  it('prints the alias of a charge its outlaw leads, and the place of one who does not', () => {
    expect(posted({ id: 'noShows', rank: 1, value: 2 })).toEqual({ alias: 'Svikarinn', place: null, charge: 'Sagðist mæta en kom ekki', bounty: '2 kvöld' });
    expect(posted({ id: 'deaths', rank: 2, value: 25 })).toEqual({ alias: null, place: 2, charge: 'Dauðsföll', bounty: '25' });
  });

  it('reads where a member stands as the roll call reads it, whatever the case of the name', () => {
    for (const p of players) expect(standingOf(players, p.username)).toEqual(byName.get(p.username.toLowerCase()));
    expect(standingOf(players, 'imlonely')).toEqual(byName.get('imlonely'));
    expect(standingOf(players, 'nobody')).toBeUndefined();
  });

  it('posts the same bounty on a wall as on the roll call, and play time only with no standing in hand', () => {
    const fafnir = byName.get('fafnir1994')!;
    /* the roll call's bounty for him is the one he leads, not his 94 hours */
    expect(wallBounty(fafnir.best, 94)).toBe(posted(fafnir.best!).bounty);
    expect(wallBounty(standingOf(players, 'fafnir1994')!.best, 94)).toBe('2 kvöld');
    /* one who leads nothing is posted for their second place on deaths from
       the first paint, the server's standing, not for their 89 hours */
    const lonely = standingOf(players, 'IMlonely')!;
    expect(lonely.led).toEqual([]);
    expect(lonely.best).toEqual({ id: 'deaths', rank: 2, value: 30 });
    expect(wallBounty(lonely.best, 89)).toBe('30');
    /* no standing in hand: their play time, in its unit */
    expect(wallBounty(null, 20)).toBe('20 klst.');
    expect(wallBounty(null, 0)).toBeNull();
    expect(wallBounty(null, undefined)).toBeNull();
  });
});

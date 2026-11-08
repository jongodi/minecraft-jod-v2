import { describe, expect, it } from 'vitest';
import { outlaws } from '@/components/badlands/outlaws';
import { posted, standingOf, wallPosted } from '../bounty';

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

  it('posts the same lines on a wall as on the roll call, the charge always with its bounty', () => {
    const fafnir = byName.get('fafnir1994')!;
    /* the roll call's lines for him are the charge he leads, not his 94 hours */
    expect(wallPosted(fafnir.best, 94)).toEqual(posted(fafnir.best!));
    expect(wallPosted(standingOf(players, 'fafnir1994')!.best, 94)).toEqual({ alias: 'Svikarinn', place: null, charge: 'Sagðist mæta en kom ekki', bounty: '2 kvöld' });
    /* a bounty with no unit of its own stands under the charge it counts:
       4 raids driven off, never a bare 'Verðlaun 4' */
    expect(wallPosted(byName.get('eikibleiki')!.best, 20)).toEqual({ alias: 'Ræningja\u00ADbaninn', place: null, charge: 'Árásir hraktar', bounty: '4' });
    /* one who leads nothing is posted for their second place on deaths from
       the first paint, the server's standing, not for their 89 hours */
    const lonely = standingOf(players, 'IMlonely')!;
    expect(lonely.led).toEqual([]);
    expect(lonely.best).toEqual({ id: 'deaths', rank: 2, value: 30 });
    expect(wallPosted(lonely.best, 89)).toEqual({ alias: null, place: 2, charge: 'Dauðsföll', bounty: '30' });
    /* no standing in hand: their play time, under its own charge and in its unit */
    expect(wallPosted(null, 20)).toEqual({ alias: null, place: null, charge: 'Spilatími', bounty: '20 klst.' });
    expect(wallPosted(null, 0)).toBeNull();
    expect(wallPosted(null, undefined)).toBeNull();
  });
});

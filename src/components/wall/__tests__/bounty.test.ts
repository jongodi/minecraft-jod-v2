import { describe, expect, it } from 'vitest';
import { outlaws } from '@/components/badlands/outlaws';
import { bestOfLed, posted, wallBounty } from '../bounty';

describe('what a wanted poster posts against a member', () => {
  const players = [
    { username: 'stebbias',   playTimeHours: 446, mobKills: 7727, deaths: 7, drawMs: 300 },
    { username: 'joenana',    playTimeHours: 167, mobKills: 2014, deaths: 40, drawMs: 246 },
    { username: 'eikibleiki', playTimeHours: 20,  mobKills: 900,  deaths: 25, raidWins: 4 },
    { username: 'fafnir1994', playTimeHours: 94,  mobKills: 300,  deaths: 3, noShows: 2 },
    { username: 'Gamla123' },
  ];
  const { byName } = outlaws(players);

  it('prints the alias of a charge its outlaw leads, and the place of one who does not', () => {
    expect(posted({ id: 'noShows', rank: 1, value: 2 })).toEqual({ alias: 'Svikarinn', place: null, charge: 'Sagðist mæta en kom ekki', bounty: '2 kvöld' });
    expect(posted({ id: 'deaths', rank: 2, value: 25 })).toEqual({ alias: null, place: 2, charge: 'Dauðsföll', bounty: '25' });
  });

  it('knows the charge an outlaw stands highest on from what they lead, as the whole board ranks it', () => {
    for (const p of players) {
      const standing = byName.get(p.username.toLowerCase())!;
      if (standing.led.length) expect(bestOfLed(standing.led, p)).toEqual(standing.best);
      else expect(bestOfLed(standing.led, p)).toBeNull();
    }
    expect(bestOfLed(['noShows'], null)).toBeNull();
    expect(bestOfLed(['noShows'], { noShows: 0 })).toBeNull();
  });

  it('posts the same bounty on a wall as on the roll call, and play time only while the standing is unknown', () => {
    const fafnir = byName.get('fafnir1994')!;
    /* the roll call's bounty for him is the one he leads, not his 94 hours */
    expect(wallBounty(fafnir.best, 94)).toBe(posted(fafnir.best!).bounty);
    expect(wallBounty(bestOfLed(fafnir.led, players[3]), 94)).toBe('2 kvöld');
    /* the first paint of one who leads nothing, before the crew's numbers come */
    expect(wallBounty(null, 20)).toBe('20 klst.');
    expect(wallBounty(null, 0)).toBeNull();
    expect(wallBounty(null, undefined)).toBeNull();
  });
});

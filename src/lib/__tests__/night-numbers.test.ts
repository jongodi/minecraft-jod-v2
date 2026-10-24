import { describe, expect, it } from 'vitest';
import { eveningAdvancements, summaryOf, tallyOf, type NightNumbers } from '../night-numbers';

const H = 3600_000;
const tick = (hours: number) => hours * 72000;

describe('what the game counted of a play night', () => {
  it('counts what each one who came did between the copies, by the name the night spells them', () => {
    const before = { stebbias: { playTimeTicks: tick(10), deaths: 5, mobKills: 100, travelCm: 1_000_000 }, ammagaur: { playTimeTicks: 0, deaths: 0, mobKills: 0, travelCm: 0 } };
    const after = { stebbias: { playTimeTicks: tick(13), deaths: 9, mobKills: 160, travelCm: 3_500_000 }, AmmaGaur: { playTimeTicks: tick(2), deaths: 1, mobKills: 12, travelCm: 400_000 } };
    expect(tallyOf(['stebbias', 'AmmaGaur'], before, after)).toEqual({
      stebbias: { ticks: tick(3), deaths: 4, mobKills: 60, travelCm: 2_500_000 },
      AmmaGaur: { ticks: tick(2), deaths: 1, mobKills: 12, travelCm: 400_000 },
    });
  });

  it('leaves out anyone missing from a copy, or whose stats were started over', () => {
    const before = { stebbias: { playTimeTicks: tick(10), deaths: 5 }, joenana: { playTimeTicks: tick(1) } };
    const after = { stebbias: { playTimeTicks: tick(11), deaths: 2 }, joenana: { playTimeTicks: tick(2) } };
    expect(tallyOf(['stebbias', 'joenana', 'eikibleiki'], before, after)).toEqual({ joenana: { ticks: tick(1), deaths: 0, mobKills: 0, travelCm: 0 } });
    expect(tallyOf(['stebbias'], null, after)).toEqual({});
  });

  it('takes the advancements those who came were given during the evening, in the order they came', () => {
    const players = {
      stebbias: { 'minecraft:story/mine_diamond': '2026-10-01T21:30:00.000Z', 'minecraft:story/smelt_iron': '2026-09-20T18:00:00.000Z' },
      AmmaGaur: { 'minecraft:nether/return_to_sender': '2026-10-01T20:10:00.000Z' },
      joenana:  { 'minecraft:story/mine_diamond': '2026-10-01T21:00:00.000Z' },
    };
    const from = Date.parse('2026-10-01T19:30:00Z');
    expect(eveningAdvancements(['stebbias', 'ammagaur'], players, from, from + 6.5 * H)).toEqual([
      { username: 'ammagaur', id: 'minecraft:nether/return_to_sender', at: '2026-10-01T20:10:00.000Z' },
      { username: 'stebbias', id: 'minecraft:story/mine_diamond', at: '2026-10-01T21:30:00.000Z' },
    ]);
    expect(eveningAdvancements(['stebbias'], null, from, from + H)).toEqual([]);
  });

  it('sums the evening, names an outlaw only where one led outright, and titles the advancements', () => {
    const numbers: NightNumbers = {
      by: {
        stebbias: { ticks: tick(3), deaths: 4, mobKills: 60, travelCm: 2_500_000 },
        AmmaGaur: { ticks: tick(2.5), deaths: 4, mobKills: 12, travelCm: 400_000 },
        joenana:  { ticks: tick(1), deaths: 1, mobKills: 0, travelCm: 0 },
      },
      advancements: [
        { username: 'AmmaGaur', id: 'minecraft:nether/return_to_sender', at: '2026-10-01T20:10:00.000Z' },
        { username: 'stebbias', id: 'minecraft:gone/from_the_game', at: '2026-10-01T21:00:00.000Z' },
      ],
    };
    expect(summaryOf(numbers)).toEqual({
      hours: 6.5, deaths: 9, mobKills: 72, travelCm: 2_900_000,
      /* two died four times each: no ghost of the night */
      outlaws: [
        { nick: 'Slátrari kvöldsins', charge: 'mobKills', username: 'stebbias', value: 60 },
        { nick: 'Flakkari kvöldsins', charge: 'travelCm', username: 'stebbias', value: 2_500_000 },
      ],
      /* one the site has no name for is left out */
      advancements: [{ username: 'AmmaGaur', title: 'Fallinn á eigin bragði', description: 'Drepa vom með eldhnetti', frame: 'challenge' }],
    });
  });

  it('names no outlaw of one, and tells nothing of a night where nothing was counted', () => {
    const alone: NightNumbers = { by: { stebbias: { ticks: tick(2), deaths: 3, mobKills: 9, travelCm: 100_000 } }, advancements: [] };
    expect(summaryOf(alone)?.outlaws).toEqual([]);
    expect(summaryOf({ by: {}, advancements: [] })).toBeNull();
    expect(summaryOf({ by: { stebbias: { ticks: 0, deaths: 0, mobKills: 0, travelCm: 0 } }, advancements: [] })).toBeNull();
    expect(summaryOf(undefined)).toBeNull();
  });
});

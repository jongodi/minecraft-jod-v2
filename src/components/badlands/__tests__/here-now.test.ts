import { describe, expect, it } from 'vitest';
import { crewAtPlaces, hereLine, railReveal, HERE_REACH } from '../hereNow';

const place = (id: number, x: number, z: number) => ({ id, world: { x, z } });
const at = (name: string, x: number, z: number) => ({ name, x, z });

describe('who of the crew stands at which place', () => {
  const places = [place(1, -7000, -9000), place(2, -6900, -9000), place(3, -6600, -8500)];

  it('puts a player at a place within reach, along the ground', () => {
    const m = crewAtPlaces([at('joenana', -7030, -9030)], places);
    expect([...m]).toEqual([[1, ['joenana']]]);
  });
  it('leaves out a player farther than the reach from every place', () => {
    expect(crewAtPlaces([at('stebbias', -7000, -9000 + HERE_REACH + 1)], places).size).toBe(0);
    expect(crewAtPlaces([at('stebbias', -7000, -9000 + HERE_REACH)], places).get(1)).toEqual(['stebbias']);
  });
  it('puts a player between two places at the nearer one only', () => {
    const m = crewAtPlaces([at('eikibleiki', -6940, -9000)], places);
    expect(m.get(2)).toEqual(['eikibleiki']);
    expect(m.has(1)).toBe(false);
  });
  it('keeps the players at one place in the order they came', () => {
    const m = crewAtPlaces([at('joenana', -7001, -9001), at('AmmaGaur', -6600, -8510), at('stebbias', -6999, -8990)], places);
    expect(m.get(1)).toEqual(['joenana', 'stebbias']);
    expect(m.get(3)).toEqual(['AmmaGaur']);
  });
  it('has nobody anywhere with nobody on, or no places in the world', () => {
    expect(crewAtPlaces([], places).size).toBe(0);
    expect(crewAtPlaces([at('joenana', 0, 0)], []).size).toBe(0);
  });
});

describe('what the postcard says of them', () => {
  it('says one, two and more in Icelandic', () => {
    expect(hereLine(['joenana'])).toBe('joenana er hérna');
    expect(hereLine(['joenana', 'stebbias'])).toBe('joenana og stebbias eru hérna');
    expect(hereLine(['joenana', 'stebbias', 'eikibleiki'])).toBe('joenana, stebbias og eikibleiki eru hérna');
  });
  it('says it for the rail with its own word for here, and nothing for nobody', () => {
    expect(hereLine(['joenana'], 'hér núna')).toBe('joenana er hér núna');
    expect(hereLine([])).toBe('');
  });
});

describe("the rail's one reveal of who is where", () => {
  it('waits for the first answer of where the crew stand', () => {
    expect(railReveal(null, false, null)).toBe('wait');
  });
  it('brings the first place with someone at it into view', () => {
    expect(railReveal(null, true, 4)).toBe(4);
  });
  it('is spent by a first answer with nobody at a place, so nobody walking in later moves the rail', () => {
    expect(railReveal(null, true, null)).toBeNull();
  });
  it('leaves the rail on a place a link has chosen, answer or none', () => {
    expect(railReveal(7, false, null)).toBeNull();
    expect(railReveal(7, true, 4)).toBeNull();
  });
});

import { describe, expect, it } from 'vitest';
import { keySky } from '../../../scripts/sky-key.mjs';

const MAGENTA = [255, 0, 255];
const GREEN = [0, 255, 0];

/** A pixel of `colour` that is `land` land and the rest sky, as drawn over a sky of `key`. */
const over = (colour: number[], land: number, key: number[]) =>
  [...colour.map((c, k) => Math.round(c * land + key[k] * (1 - land))), 255];

/** A row of pixels, each [colour, how much of it is land], cut out and read back as [r, g, b, a] each. */
function row(...pixels: [number[], number][]) {
  const onMagenta = new Uint8ClampedArray(pixels.flatMap(([c, l]) => over(c, l, MAGENTA)));
  const onGreen = new Uint8ClampedArray(pixels.flatMap(([c, l]) => over(c, l, GREEN)));
  const out = keySky(onMagenta, onGreen, pixels.length, 1) as Uint8ClampedArray;
  return pixels.map((_, k) => Array.from(out.slice(k * 4, k * 4 + 4)));
}

const LAND = [30, 40, 20];

describe('the sky cut out of a still drawn over two skies', () => {
  it('takes the painted sky away entirely', () => {
    expect(row([LAND, 0], [LAND, 0])).toEqual([[0, 0, 0, 0], [0, 0, 0, 0]]);
  });

  it('leaves the land as it is, beside the sky or away from it', () => {
    expect(row([LAND, 0], [[180, 160, 120], 1], [LAND, 1], [[2, 2, 2], 1])).toEqual(
      [[0, 0, 0, 0], [180, 160, 120, 255], [...LAND, 255], [2, 2, 2, 255]]);
  });

  it('never cuts a magenta or green block, however much it looks like the sky', () => {
    /* magenta wool, magenta concrete, amethyst, purple concrete at night, lime wool */
    for (const block of [[255, 0, 255], [189, 68, 179], [169, 48, 159], [150, 90, 200], [20, 6, 31], [0, 255, 0], [112, 185, 25]]) {
      expect(row([LAND, 0], [block, 1])[1]).toEqual([...block, 255]);
    }
  });

  it('makes an edge pixel half sky half land, in the land\'s own colour', () => {
    const [r, g, b, a] = row([LAND, 0.5])[0];
    expect(a).toBeGreaterThan(125);
    expect(a).toBeLessThan(131);
    for (const [got, was] of [[r, 30], [g, 40], [b, 20]]) expect(Math.abs(got - was)).toBeLessThanOrEqual(2);
  });

  it('lets the night through water the void shows under, and the fading edge of the world', () => {
    for (const [colour, land] of [[[24, 48, 96], 0.6], [[30, 40, 20], 0.15], [[60, 70, 50], 0.85]] as [number[], number][]) {
      const [r, g, b, a] = row([colour, land])[0];
      expect(Math.abs(a - land * 255)).toBeLessThanOrEqual(2);
      for (const [got, was] of [[r, colour[0]], [g, colour[1]], [b, colour[2]]]) expect(Math.abs(got - was)).toBeLessThanOrEqual(6);
    }
  });
});

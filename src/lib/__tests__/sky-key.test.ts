import { describe, expect, it } from 'vitest';
import { keySky } from '../../../scripts/sky-key.mjs';

const SKY = [255, 0, 255, 255];
const LAND = [30, 40, 20, 255];

/** A row of pixels, keyed, read back as [r, g, b, a] each. */
function row(...pixels: number[][]) {
  const out = keySky(new Uint8ClampedArray(pixels.flat()), pixels.length, 1);
  return pixels.map((_, k) => Array.from(out.slice(k * 4, k * 4 + 4)));
}

describe('the sky cut out of a still of the flight', () => {
  it('takes the painted sky away entirely', () => {
    expect(row(SKY, SKY)).toEqual([[0, 0, 0, 0], [0, 0, 0, 0]]);
  });

  it('leaves the land as it is, beside the sky or away from it', () => {
    expect(row(SKY, [180, 160, 120, 255], LAND, LAND, LAND, [2, 2, 2, 255])).toEqual(
      [[0, 0, 0, 0], [180, 160, 120, 255], LAND, LAND, LAND, [2, 2, 2, 255]]);
  });

  it('never cuts a magenta or purple block inside the land', () => {
    /* magenta wool by day, magenta concrete, amethyst, purple concrete at night */
    for (const block of [[189, 68, 179], [169, 48, 159], [150, 90, 200], [20, 6, 31]]) {
      expect(row(SKY, LAND, LAND, LAND, [...block, 255])[4]).toEqual([...block, 255]);
    }
  });

  it('makes an edge pixel half sky half land, and takes the pink back out of it', () => {
    /* (30, 40, 20) land with the sky mixed in half and half, beside the sky */
    const [, [r, g, b, a]] = row(SKY, [143, 20, 138, 255], LAND);
    expect(a).toBeGreaterThan(90);
    expect(a).toBeLessThan(180);
    /* no longer magenta: green has come back up towards red and blue */
    expect(Math.min(r, b) - g).toBeLessThan(40);
  });
});

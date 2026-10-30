import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { MOON_COLUMNS, MOON_CRATERS, NEW_MOON, SYNODIC } from '@/lib/moon';

/* The 3D map's sky (public/bluemap-jod/jod.js) draws the page's night over
   the world: tonight's moon as Bits.tsx draws it, in the phase src/lib/moon.ts
   counts, under the top of the page's sky (tokens.css). The script is plain
   JavaScript served as it is and carries its own copies of those tables and
   colours, so this holds them to the page's. */
const jod = readFileSync('public/bluemap-jod/jod.js', 'utf8');
const tokens = readFileSync('src/app/tokens.css', 'utf8');

/* a `const NAME = …;` statement's right-hand side, as the script writes it */
const literal = (name: string): string => {
  const m = jod.match(new RegExp(`const ${name} = ([^;]+);`));
  if (!m) throw new Error(`${name} is not in jod.js`);
  return m[1];
};

/* the script's five column shapes, as JSON, read in place of their names */
const SHAPES: Record<string, string> = { D: '[]', F: '[[1,10]]', MID: '[[4,7]]', TALL: '[[2,9]]', ENDS: '[[1,2],[9,10]]' };

describe("the 3D map's sky", () => {
  it('draws the moon in the phases Bits.tsx draws, column for column', () => {
    expect(jod).toContain('const D = [], F = [[1, 10]], MID = [[4, 7]], TALL = [[2, 9]], ENDS = [[1, 2], [9, 10]];');
    /* the names read as their shapes, and the trailing comma the script may write before the closing bracket dropped */
    const columns = JSON.parse(literal('MOON_COLUMNS').replace(/\b(D|F|MID|TALL|ENDS)\b/g, m => SHAPES[m]).replace(/,\s*\]/g, ']')) as unknown;
    expect(columns).toEqual(MOON_COLUMNS);
  });

  it('draws the same craters, where the light reaches all of them', () => {
    const craters = [...jod.matchAll(/craterAt\(cx, cy, (\d+), (\d+), (\d+), (\d+)\)/g)].map(m => m.slice(1, 5).map(Number));
    expect(craters).toEqual(MOON_CRATERS.map(c => [...c]));
  });

  it("counts the moon's age from the same new moon, in the same month", () => {
    expect(Number(literal('SYNODIC'))).toBe(SYNODIC);
    const utc = literal('NEW_MOON').match(/^Date\.UTC\((\d+), (\d+), (\d+), (\d+), (\d+)\)$/);
    expect(utc).not.toBeNull();
    const [y, mo, d, h, mi] = utc!.slice(1, 6).map(Number);
    expect(Date.UTC(y, mo, d, h, mi)).toBe(NEW_MOON);
  });

  it("puts the top of the page's sky at the zenith", () => {
    const top = tokens.match(/--sky-night-top:\s*#([0-9A-Fa-f]{6})/)?.[1];
    expect(top).toBeDefined();
    const want = [0, 2, 4].map(i => parseInt(top!.slice(i, i + 2), 16));
    const have = jod.match(/jodZenith: \{ value: \[0x([0-9a-f]{2}) \/ 255, 0x([0-9a-f]{2}) \/ 255, 0x([0-9a-f]{2}) \/ 255\] \}/);
    expect(have).not.toBeNull();
    expect(have!.slice(1, 4).map(h => parseInt(h, 16))).toEqual(want);
  });

  it('keeps the flat sky for a recording, which the stills key out and the poster hands over from', () => {
    expect(jod).toMatch(/!params\.has\('upptaka'\) && nightSky\(viewer\)/);
    expect(readFileSync('scripts/map-poster.mjs', 'utf8')).toMatch(/bluemap\/index\.html\?upptaka#/);
    expect(readFileSync('scripts/map-flight.mjs', 'utf8')).toMatch(/bluemap\/index\.html\?upptaka#/);
  });
});

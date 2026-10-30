/* The moon over the evening: the game's square moon, in the phase the real
   one is in tonight. Minecraft draws eight phases, and so does the site, so a
   regular visitor sees it fill and wane across a fortnight the way the season
   (src/lib/season.ts) changes the page across a year.

   The phase is the moon's age in the synodic month, counted from a known new
   moon. The month varies by up to about seven hours around its mean, so a
   phase can turn half a day early or late; at one eighth of a month per phase
   that is a guess of the night's moon, not an almanac, and that is all the
   sky needs. */

/** A new moon: 6 January 2000, 18:14 UTC. */
export const NEW_MOON = Date.UTC(2000, 0, 6, 18, 14);
/** The mean synodic month, in days. */
export const SYNODIC = 29.530588853;
const DAY = 86_400_000;

/** 0 new, 1 waxing crescent, 2 first quarter, 3 waxing gibbous, 4 full,
    5 waning gibbous, 6 last quarter, 7 waning crescent. */
export type MoonPhase = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

/** The moon's age in days at `d`, from 0 (new) to just under a month. */
export function moonAge(d: Date): number {
  const days = (d.getTime() - NEW_MOON) / DAY;
  return ((days % SYNODIC) + SYNODIC) % SYNODIC;
}

/** Which of the game's eight phases the moon is nearest at `d`. */
export function moonPhase(d: Date): MoonPhase {
  return (Math.round((moonAge(d) / SYNODIC) * 8) % 8) as MoonPhase;
}

/** ?tungl=0 … 7 shows a phase on any night, the way ?arstid= shows a season. */
export function moonFromParam(v: string | null): MoonPhase | null {
  if (v === null || !/^[0-7]$/.test(v)) return null;
  return Number(v) as MoonPhase;
}

/* The moon as the game draws it: a square of ten by ten with craters, lit
   in one of the eight phases. Drawn by Bits.tsx on the page and by the 3D
   map's sky (public/bluemap-jod/jod.js, which carries its own copy of these
   tables, checked against this one by a test). The lit share of its face in
   each phase: the rows lit in each of the ten columns of its body, left to
   right, as [first, last] runs. Waxing from the right, waning from the left,
   as it is seen from the north. The terminator bows: a crescent is thickest
   across its middle, and a gibbous moon's dark share is too, so neither
   reads as a bar (a three-column bar with a crater in it read as an
   exclamation mark). */
export type MoonColumn = ReadonlyArray<readonly [number, number]>;
const D: MoonColumn = [];
const F: MoonColumn = [[1, 10]];
const MID: MoonColumn = [[4, 7]];
const TALL: MoonColumn = [[2, 9]];
const ENDS: MoonColumn = [[1, 2], [9, 10]];
export const MOON_COLUMNS: ReadonlyArray<ReadonlyArray<MoonColumn>> = [
  [D, D, D, D, D, D, D, D, D, D],
  [D, D, D, D, D, D, MID, TALL, F, F],
  [D, D, D, D, D, F, F, F, F, F],
  [D, D, ENDS, F, F, F, F, F, F, F],
  [F, F, F, F, F, F, F, F, F, F],
  [F, F, F, F, F, F, F, ENDS, D, D],
  [F, F, F, F, F, D, D, D, D, D],
  [F, F, TALL, MID, D, D, D, D, D, D],
];
/** The craters on its face, [x, y, w, h] on the 12 grid, drawn where the light reaches all of them. */
export const MOON_CRATERS: ReadonlyArray<readonly [number, number, number, number]> = [[3, 3, 2, 2], [7, 2, 1, 1], [6, 6, 2, 1], [8, 8, 2, 1], [2, 8, 1, 1], [4, 9, 1, 1]];

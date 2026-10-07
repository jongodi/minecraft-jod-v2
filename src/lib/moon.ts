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
const NEW_MOON = Date.UTC(2000, 0, 6, 18, 14);
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

/* The round numbers a counter passes (src/lib/milestones.ts), on their own:
   no server imports, so the board's slips and a wall read the same marks. */

export type MilestoneKind = 'hours' | 'deaths' | 'mobs' | 'km';

/** The marks worth a slip, low to high. Past the last, hours go on every 500. */
export const MARKS: Record<MilestoneKind, readonly number[]> = {
  hours:  [50, 100, 250, 500, 750, 1000],
  deaths: [50, 100, 250, 500, 1000],
  mobs:   [1000, 5000, 10_000, 25_000, 50_000, 100_000],
  km:     [100, 500, 1000, 2500, 5000, 10_000],
};
const HOURS_ON = 500;

/** The highest mark with `before` under it and `after` at or over it; null when none was passed. */
export function passed(what: MilestoneKind, before: number, after: number): number | null {
  if (!Number.isFinite(before) || !Number.isFinite(after) || after <= before) return null;
  let top: number | null = null;
  for (const m of MARKS[what]) if (before < m && m <= after) top = m;
  if (what === 'hours') {
    /* every 500 past the listed marks: 1500, 2000, … */
    const last = MARKS.hours[MARKS.hours.length - 1];
    const on = Math.floor(after / HOURS_ON) * HOURS_ON;
    if (on > last && before < on) top = on;
  }
  return top;
}

/** The mark a counter is on its way to, and how far off it is; null past the last one. */
export function nextMark(what: MilestoneKind, value: number): { mark: number; from: number; left: number } | null {
  if (!Number.isFinite(value) || value < 0) return null;
  const listed = MARKS[what];
  let mark = listed.find(m => m > value) ?? null;
  if (mark === null && what === 'hours') mark = (Math.floor(value / HOURS_ON) + 1) * HOURS_ON;
  if (mark === null) return null;
  /* the mark before it, to tell how much of the way is behind */
  const before = [...listed].reverse().find(m => m <= value) ?? 0;
  const from = what === 'hours' && mark > listed[listed.length - 1] ? mark - HOURS_ON : before;
  return { mark, from, left: mark - value };
}


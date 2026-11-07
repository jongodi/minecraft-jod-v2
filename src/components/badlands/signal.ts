/* Reykmerki: on the day a fire is lit for, a campfire on a hay bale, the
   game's signal fire, stands on the far ridge behind the name and sends its
   column up, and the footer's fire stands on a bale too. Kept apart from the
   components so the day and the place it stands can be tested without a
   browser. */
import type { PublicNight } from '@/app/api/playnight/route';

/** A plateau of a ridge's drawing: [width, height] in its 480 by 120 grid (Mesa.tsx). */
export type Plateau = readonly [number, number];

const GRID_W = 480;
const GRID_H = 120;
const DAY_MS = 86_400_000;
/* Iceland keeps UTC all year, so the day is the UTC day */
const dayOf = (ms: number) => Math.floor(ms / DAY_MS);

/** Whether the signal stands now: a night chosen for today, a fire about to
    be lit, or an evening under way, which may have begun before midnight.
    Once the evening is over, it is gone. */
export function signalOf(nights: readonly PublicNight[], now = Date.now()): boolean {
  return nights.some(n => {
    if (n.phase === 'soon' || n.phase === 'live') return true;
    if (n.phase !== 'chosen') return false;
    const at = n.options.find(o => o.id === n.chosen)?.at;
    return !!at && dayOf(Date.parse(at)) === dayOf(now);
  });
}

export interface SignalLand {
  /** the far ridge, whose plateaus the fire may stand on */
  far: readonly Plateau[];
  /** the ridges drawn in front of it, which must not hide its foot */
  front: readonly (readonly Plateau[])[];
  /** the ridges' box on the screen, in pixels; the drawing covers it from its foot and is centred (xMidYMax slice) */
  width: number;
  height: number;
  /** how far from the box's left edge the land is clear of the name, in pixels */
  clear: number;
  /** the fire's width, in the drawing's units */
  fire: number;
}

/** Where the signal fire stands: its middle, in the drawing's units, and the
    height of the plateau under it. Between the screen's left edge and the
    name, so neither it nor its column crosses a letter; on a plateau wide
    enough to hold it whole, standing clear of the ridges in front; as near
    the middle of that clear stretch as a plateau allows. Null when no
    plateau there will do. */
export function signalSpot(land: SignalLand): { x: number; h: number } | null {
  const { far, front, width, height, clear, fire } = land;
  const u = Math.max(width / GRID_W, height / GRID_H);
  const screen = (unit: number) => width / 2 + (unit - GRID_W / 2) * u;
  const unitAt = (px: number) => GRID_W / 2 + (px - width / 2) / u;
  const half = (fire * u) / 2;
  const target = clear / 2;
  /* the tallest of a ridge between two points of the grid */
  const tallest = (ridge: readonly Plateau[], a: number, b: number) => {
    let x = 0;
    let top = 0;
    for (const [w, h] of ridge) { if (x < b && x + w > a) top = Math.max(top, h); x += w; }
    return top;
  };
  let best: { x: number; h: number; off: number } | null = null;
  let x0 = 0;
  for (const [w, h] of far) {
    const lo = Math.max(screen(x0), 0) + half;
    const hi = Math.min(screen(x0 + w), clear) - half;
    x0 += w;
    if (lo > hi) continue;
    const mid = Math.min(hi, Math.max(lo, target));
    const x = unitAt(mid);
    if (front.some(r => tallest(r, x - fire / 2, x + fire / 2) >= h)) continue;
    const off = Math.abs(mid - target);
    if (!best || off < best.off) best = { x, h, off };
  }
  return best && { x: best.x, h: best.h };
}

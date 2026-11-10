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

/** Who of those who said yes to a night has come: noted by the server
    during the evening (`came`), or in the game right now (`inGame`, the live
    list, where the caller has one). The server notes who it sees every five
    minutes, so its note alone trails the lantern; the hero's line counted by
    it said "2 af 3 komin" beside a room that said three. Names are matched
    as the game matches them, whatever their capitals. */
export function cameOf(night: PublicNight, inGame: readonly string[] = []): string[] {
  const here = new Set([...night.came, ...inGame].map(n => n.toLowerCase()));
  const yes = night.options.find(o => o.id === night.chosen)?.yes ?? [];
  return yes.filter(y => here.has(y.toLowerCase()));
}

/** Fullt hús: an evening under way that everyone who said they would come
    has come to (cameOf), when two or more said so. The fireworks of
    gamlárskvöld go up over the fire then (NightParticles in
    BadlandsHome.tsx, Particles.tsx) and the hero's line says it in words.
    Over with the evening. */
export function fullHouseOf(nights: readonly PublicNight[], inGame: readonly string[] = []): boolean {
  return nights.some(n => {
    if (n.phase !== 'live') return false;
    const yes = n.options.find(o => o.id === n.chosen)?.yes ?? [];
    return yes.length >= 2 && cameOf(n, inGame).length === yes.length;
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
  /** the fire's width, in the drawing's units: as wide as it is drawn where there is room */
  fire: number;
  /** The clear stretch is only a gutter wide (a phone's, where the J stands
      at the screen's edge): the fire is narrowed to the room there is, and
      where no one plateau holds it whole it stands across a step of the
      ridge. Held to the full width and to one plateau, it stood on a phone
      only when a few pixels of the screen's height happened to suit it. */
  narrow?: boolean;
}

/** The narrowest the fire is drawn, in the drawing's units: any less is a smudge, not a fire. */
export const SIGNAL_LEAST = 4;

/** Where the signal fire stands: its middle, in the drawing's units, the
    height of the plateau under it, and its width in the same units.
    Between the screen's left edge and the name, so neither it nor its
    column crosses a letter; on a plateau wide enough to hold it whole,
    standing clear of the ridges in front; as near the middle of that clear
    stretch as a plateau allows. On a `narrow` stretch, failing that, across
    the step under the stretch's middle, on the taller side, so the bale
    overhangs the lower by a pixel or two. Null when nowhere there will do. */
export function signalSpot(land: SignalLand): { x: number; h: number; fw: number } | null {
  const { far, front, width, height, clear, narrow = false } = land;
  const u = Math.max(width / GRID_W, height / GRID_H);
  const screen = (unit: number) => width / 2 + (unit - GRID_W / 2) * u;
  const unitAt = (px: number) => GRID_W / 2 + (px - width / 2) / u;
  /* floored to a hundredth, so a fire as wide as the stretch is not a rounding error wider */
  const fw = narrow ? Math.floor(Math.min(land.fire, clear / u) * 100) / 100 : land.fire;
  if (fw < SIGNAL_LEAST) return null;
  const half = (fw * u) / 2;
  const target = clear / 2;
  /* the tallest of a ridge between two points of the grid */
  const tallest = (ridge: readonly Plateau[], a: number, b: number) => {
    let x = 0;
    let top = 0;
    for (const [w, h] of ridge) { if (x < b && x + w > a) top = Math.max(top, h); x += w; }
    return top;
  };
  const hidden = (x: number, h: number) => front.some(r => tallest(r, x - fw / 2, x + fw / 2) >= h);
  let best: { x: number; h: number; off: number } | null = null;
  let x0 = 0;
  for (const [w, h] of far) {
    const lo = Math.max(screen(x0), 0) + half;
    const hi = Math.min(screen(x0 + w), clear) - half;
    x0 += w;
    if (lo > hi) continue;
    const mid = Math.min(hi, Math.max(lo, target));
    const x = unitAt(mid);
    if (hidden(x, h)) continue;
    const off = Math.abs(mid - target);
    if (!best || off < best.off) best = { x, h, off };
  }
  if (best) return { x: best.x, h: best.h, fw };
  if (!narrow) return null;
  /* a plateau's edge falls inside the stretch and leaves neither side room */
  const lo = Math.max(screen(0), 0) + half;
  const hi = Math.min(screen(GRID_W), clear) - half;
  if (lo > hi) return null;
  const x = unitAt(Math.min(hi, Math.max(lo, target)));
  const h = tallest(far, x - fw / 2, x + fw / 2);
  return hidden(x, h) ? null : { x, h, fw };
}

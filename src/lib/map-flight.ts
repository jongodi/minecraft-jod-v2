/* The flight down into the world (scripts/map-flight.mjs): a run of stills of
   the 3D map from high over the whole world down to the start view, each with
   the camera it was taken with, so the home page can move between them and
   pin a place on whatever is showing. Pure, so the page and the tests share it. */
import flightFile from './map-flight.json';
import type { WorldPoint } from './map-types';

export type FlightShape = 'wide' | 'tall';
export type Vec3 = [number, number, number];

/** One still and the camera it was taken with. */
export interface FlightShot {
  /** projection × view, column-major as three.js keeps it */
  m: number[];
  /** where the camera stood */
  eye: Vec3;
  /** the point it looked at, in the middle of the still */
  look: Vec3;
  /** how far the camera stood from that point, in blocks */
  d: number;
}

export interface FlightSet {
  width: number;
  height: number;
  shots: FlightShot[];
}

export interface Flight {
  version: string;
  frames: number;
  wide: FlightSet;
  tall?: FlightSet;
}

const isSet = (s: Partial<FlightSet> | undefined, frames: number): s is FlightSet =>
  !!s && !!s.width && !!s.height && Array.isArray(s.shots) && s.shots.length === frames;

/** The flight map:flight took last, or null before it has been taken. */
export const FLIGHT: Flight | null = (() => {
  /* checked, not trusted: a file from an older recording has another shape */
  const f = flightFile as unknown as Partial<Flight>;
  if (!f.version || !f.frames || f.frames < 2 || !isSet(f.wide, f.frames)) return null;
  return { version: f.version, frames: f.frames, wide: f.wide, ...(isSet(f.tall, f.frames) ? { tall: f.tall } : {}) };
})();

/** A frame's address: versioned, so the CDN keeps it for a year. */
export const flightFrame = (flight: Flight, shape: FlightShape, n: number): string =>
  `/map-flight/${shape}-${n}.webp?v=${flight.version}`;

/** The set for a frame of this width and height: the tall one for a frame
    standing on end, where there is one. */
export function flightShape(flight: Flight, width: number, height: number): FlightShape {
  return width < height && flight.tall ? 'tall' : 'wide';
}

/** The order the frames are fetched in: the overview first, then the landing,
    then ever finer between them, so a visitor who scrolls quickly has a frame
    near wherever the camera is from early on, and the rest fill in. */
export function fetchOrder(frames: number): number[] {
  const order = [0, frames - 1];
  const seen = new Set(order);
  for (let stride = 2 ** Math.floor(Math.log2(Math.max(1, frames - 1))); stride >= 1; stride /= 2) {
    for (let n = 0; n < frames; n += stride) if (!seen.has(n)) { seen.add(n); order.push(n); }
  }
  return order;
}

/** The scroll onto the path: the overview holds a moment, the landing settles. */
export const easeFlight = (p: number): number => p * p * (3 - 2 * p);

/** How far down the flight the page is, 0 high over the world and 1 landed.
    The camera sets off while the frame is still rising, `lead` pixels before
    it is held at `stick` from the top of the screen, and lands `length`
    pixels after; the page past the landing is the time spent there. */
export function flightProgress(scrollY: number, top: number, stick: number, lead: number, length: number): number {
  const span = lead + length;
  if (!(span > 0)) return 1;
  return Math.min(1, Math.max(0, (scrollY + stick - top + lead) / span));
}

/* how long the camera takes to make up most of the way to where the scroll
   is, in ms: about a wheel notch's worth of glide, short enough that a drag
   or a trackpad still feels held */
export const FOLLOW_MS = 140;

/** The camera after `ms` of following the scroll from `from` towards `to`:
    a wheel notch's jump becomes a glide, and it arrives exactly. */
export function follow(from: number, to: number, ms: number, tau = FOLLOW_MS): number {
  const next = from + (to - from) * (1 - Math.exp(-Math.max(0, ms) / tau));
  return Math.abs(to - next) < 1e-4 ? to : next;
}

/** Where a world point falls in a still, as a fraction of its width and height
    (0 to 1 inside it), or null behind the camera. */
export function projectPoint(m: readonly number[], [x, y, z]: readonly number[]): { x: number; y: number } | null {
  const w = m[3] * x + m[7] * y + m[11] * z + m[15];
  if (!(w > 0)) return null;
  const nx = (m[0] * x + m[4] * y + m[8] * z + m[12]) / w;
  const ny = (m[1] * x + m[5] * y + m[9] * z + m[13]) / w;
  return { x: (nx + 1) / 2, y: (1 - ny) / 2 };
}

/** Where a place is pinned in a still: where its lantern stands in the 3D
    map, the middle of its block, a block up. */
export const project = (m: readonly number[], p: WorldPoint) => projectPoint(m, [p.x + 0.5, p.y + 1, p.z + 0.5]);

/** The camera partway between two stills: the point it looks at moves
    evenly, the distance falls evenly in proportion, as the recording moved it. */
export function cameraAt(a: FlightShot, b: FlightShot, f: number): { look: Vec3; eye: Vec3; d: number } {
  const lerp = (u: number, v: number) => u + (v - u) * f;
  return {
    look: [lerp(a.look[0], b.look[0]), lerp(a.look[1], b.look[1]), lerp(a.look[2], b.look[2])],
    eye: [lerp(a.eye[0], b.eye[0]), lerp(a.eye[1], b.eye[1]), lerp(a.eye[2], b.eye[2])],
    d: Math.exp(lerp(Math.log(a.d), Math.log(b.d))),
  };
}

/** How a still is moved to stand in for a camera it was not taken from: the
    point that camera looks at is brought to the middle and everything grows
    with how much nearer the camera stands. Between neighbouring stills the
    camera mostly closes in, so this is close to what it would have seen, and
    two stills moved this way line up as one fades over the other. In the
    still's own pixels: a point `x` is drawn at `centre + (x - from) * scale`. */
export function warp(shot: FlightShot, look: readonly number[], d: number, width: number, height: number): { from: { x: number; y: number }; scale: number } {
  const p = projectPoint(shot.m, look);
  return {
    from: p ? { x: p.x * width, y: p.y * height } : { x: width / 2, y: height / 2 },
    scale: shot.d / d,
  };
}

/** The game's compass, from the way the camera looks: north is towards negative Z. */
export function facing(eye: readonly number[], look: readonly number[]): 'north' | 'south' | 'east' | 'west' {
  const fx = look[0] - eye[0], fz = look[2] - eye[2];
  return Math.abs(fx) > Math.abs(fz) ? (fx > 0 ? 'east' : 'west') : (fz > 0 ? 'south' : 'north');
}

/** How a picture of `iw`×`ih` lies in a box of `w`×`h` under
    `object-fit: cover`, at the still's `object-position: 50% 45%`. */
export function cover(w: number, h: number, iw: number, ih: number): { x: number; y: number; width: number; height: number } {
  const s = Math.max(w / iw, h / ih);
  const width = iw * s, height = ih * s;
  return { x: (w - width) * 0.5, y: (h - height) * 0.45, width, height };
}

/** How big a lantern is drawn at this many blocks from the camera: full size
    near, down to about half over the overview, so the pins stand in the
    world rather than on the glass in front of it. */
export const depthScale = (blocks: number): number => Math.min(1.1, Math.max(0.5, 140 / Math.max(1, blocks)));

/** The camera's way across the ground: where it looks, from where it stands,
    on the level (x and z), one block long. North is towards negative Z. */
export function heading(eye: readonly number[], look: readonly number[]): [number, number] {
  const fx = look[0] - eye[0], fz = look[2] - eye[2];
  const n = Math.hypot(fx, fz) || 1;
  return [fx / n, fz / n];
}

/** BlueMap's camera turned `rotation` radians looks this way across the ground
    (its ControlsManager: rotation 0 faces north). */
export const headingOf = (rotation: number): [number, number] => [Math.sin(rotation), -Math.cos(rotation)];

/** Where something stands as seen from a point facing a way across the
    ground: its angle off straight ahead in radians (negative to the left,
    positive to the right, ±π behind) and how far it is in blocks. */
export function bearing(from: readonly [number, number], way: readonly [number, number], to: readonly [number, number]): { angle: number; blocks: number } {
  const dx = to[0] - from[0], dz = to[1] - from[1];
  /* to the right of facing north is east: right is (-z, x) of the way ahead */
  const ahead = dx * way[0] + dz * way[1];
  const right = dx * -way[1] + dz * way[0];
  return { angle: Math.atan2(right, ahead), blocks: Math.hypot(dx, dz) };
}

/** A point on the horizon straight ahead of the camera: far off along the way
    it faces, at its own height, which a still puts on the line where the land
    meets the sky. */
export function horizonPoint(eye: readonly number[], look: readonly number[]): [number, number, number] {
  const [fx, fz] = heading(eye, look);
  return [eye[0] + fx * 100000, eye[1], eye[2] + fz * 100000];
}

/** A place's link card seen from the air: the still, how it is laid on the
    card, and where the place's lantern stands on the card. */
export interface CardShot {
  k: number;
  /** the still drawn at `width`×`height` with its corner at `left`, `top` (zero or less) */
  left: number;
  top: number;
  width: number;
  height: number;
  /** the place on the card, in its pixels */
  x: number;
  y: number;
}

/** The still that shows a place nearest with its lantern clear of what the
    card lays over it (`clear`, in the card's pixels), and how it is cropped.
    The still covers the card, drawn no larger than it needs to be: at the
    least that covers, and only where that leaves the lantern under the
    postcard, a little closer (up to `zoom` times the still's own size), the
    spare width and height used to bring the place toward `aim`. The nearest
    still where it stands clear wins; failing that the nearest that shows it
    on the card at all, away from the very edge; null where none does. */
export function cardShot(
  set: FlightSet,
  point: readonly number[],
  card: { width: number; height: number },
  clear: (x: number, y: number) => boolean,
  aim: { x: number; y: number } = { x: card.width * 0.78, y: card.height * 0.34 },
  zoom = 1.2,
): CardShot | null {
  const least = Math.max(card.width / set.width, card.height / set.height);
  const scales = [least, ...[1, 1.1, zoom].filter(z => z > least && z <= zoom)];
  const place = (k: number, scale: number): CardShot | null => {
    const p = projectPoint(set.shots[k].m, point);
    if (!p || p.x < 0 || p.x > 1 || p.y < 0 || p.y > 1) return null;
    const width = set.width * scale, height = set.height * scale;
    const px = p.x * width, py = p.y * height;
    const left = -Math.min(width - card.width, Math.max(0, px - aim.x));
    const top = -Math.min(height - card.height, Math.max(0, py - aim.y));
    return { k, left, top, width, height, x: px + left, y: py + top };
  };
  const margin = 40;
  let seen: CardShot | null = null;
  for (let k = set.shots.length - 1; k >= 0; k--) {
    for (const scale of scales) {
      const s = place(k, scale);
      if (!s) break;
      if (clear(s.x, s.y)) return s;
      if (!seen && scale === least && s.x >= margin && s.x <= card.width - margin && s.y >= margin && s.y <= card.height - margin) seen = s;
    }
  }
  return seen;
}

/** The still of a flight that shows these points best, for a member's wall:
    the one that has the most of them inside it with a margin, and of those
    the one they spread widest across, so a corner of the world is seen close
    rather than as dots on the overview. Where each point falls in it, as a
    fraction of its width and height (null for one it does not show). */
export function frameFor(set: FlightSet, points: readonly (readonly number[])[]): { k: number; at: ({ x: number; y: number } | null)[] } | null {
  if (points.length === 0) return null;
  type Pick = { k: number; at: ({ x: number; y: number } | null)[]; score: number };
  let best: Pick | null = null;
  for (let k = 0; k < set.shots.length; k++) {
    const at = points.map(p => {
      const pr = projectPoint(set.shots[k].m, p);
      return pr && pr.x >= 0.12 && pr.x <= 0.88 && pr.y >= 0.15 && pr.y <= 0.9 ? pr : null;
    });
    const inside = at.filter((a): a is { x: number; y: number } => a !== null);
    if (inside.length === 0) continue;
    const xs = inside.map(a => a.x), ys = inside.map(a => a.y);
    /* one point alone is best seen at the middle distance of the flight, not right under the camera */
    const spread = inside.length > 1
      ? (Math.max(...xs) - Math.min(...xs)) * (Math.max(...ys) - Math.min(...ys))
      : 1 - Math.abs(k / Math.max(1, set.shots.length - 1) - 0.5);
    const score = inside.length * 10 + Math.min(1, spread);
    if (!best || score > best.score) best = { k, at, score };
  }
  return best && { k: best.k, at: best.at };
}

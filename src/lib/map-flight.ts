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

/* ─── the cloud deck ──────────────────────────────────────────────
   The game hangs its clouds at one height, y 192, flat cells 12 blocks
   square, and the flight comes down through them: the wide camera at about
   its fifteenth still of forty, the tall one at its twenty-second. BlueMap
   draws no clouds, so the deck is laid over the stills by the page: one
   flat picture of the cells, a pixel a cell, set on the plane with a
   projective transform from the camera, so it rushes up and swells past the
   frame as the camera comes down to it. */

/** The height of the game's clouds, and the side of one of their cells, in blocks. */
export const CLOUD_Y = 192;
export const CLOUD_CELL = 12;
/* The deck is whole down to CLOUD_THIN and gone by CLOUD_GONE: in between
   it thins in CLOUD_BANDS steps, the cells at the edges of each cloud first
   and their middles last, so the camera breaks out over the town as the
   last of it goes. It is hidden before the camera reaches the plane, where
   the projection of a plane so close would run off to the edge of the world. */
export const CLOUD_THIN = 212;
export const CLOUD_GONE = 196;
export const CLOUD_BANDS = 4;
/* the share of the deck under a cell: sparse enough that the world below
   still reads as the model on a table it is from the overview */
const CLOUD_COVER = 0.24;
/* the clear sky kept over the town, in blocks: this much round the line
   from the camera to its middle, and the town itself round that */
const CLOUD_CLEAR = 24;

/** The deck: `size` by `size` cells from its north-west corner at `x`, `z`.
    Each cell is 0 where the sky is clear, or the band it belongs to, 1 at
    the edges of a cloud to CLOUD_BANDS at its middle. */
export interface CloudDeck { x: number; z: number; size: number; cells: Uint8Array }

/** The camera's lens, from a still's matrix: how much it draws across
    and up the frame per unit of the way ahead (three.js's projection, in
    the first two rows). The stills of a flight share one. */
export const lensOf = (m: readonly number[]): { x: number; y: number } => ({
  x: Math.hypot(m[0], m[4], m[8]),
  y: Math.hypot(m[1], m[5], m[9]),
});

/* a number from 0 to 1 for a whole point of the lattice, always the same one */
function hash2(i: number, j: number): number {
  let h = Math.imul(i | 0, 374761393) ^ Math.imul(j | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
/* the lattice's numbers blended across the squares between its points: soft hills, which cut at a level give round clouds */
function noise(u: number, v: number): number {
  const i = Math.floor(u), j = Math.floor(v);
  const s = (t: number) => t * t * (3 - 2 * t);
  const a = s(u - i), b = s(v - j);
  const top = hash2(i, j) + (hash2(i + 1, j) - hash2(i, j)) * a;
  const foot = hash2(i, j + 1) + (hash2(i + 1, j + 1) - hash2(i, j + 1)) * a;
  return top + (foot - top) * b;
}

/** The deck over the world a flight was taken of. Its middle is where the
    overview looks, and its width the world's: the overview was placed to
    take the whole world in across the wide frame (scripts/map-flight.mjs),
    so its distance over its lens gives the width. The cells are the game's
    kind of clouds, ragged clusters of cells cut out of soft noise, thinning
    to none at the world's edge, so the deck never ends on a straight line
    over the night round the world. The sky is kept clear all along the line
    from either camera to the town it lands on, and as wide round it as the
    town the landing takes in, so the town is never under a cell on the way
    down. */
export function cloudDeck(flight: Flight): CloudDeck {
  const over = flight.wide.shots[0];
  const half = over.d / Math.max(1e-6, lensOf(over.m).x);
  const size = Math.max(2, Math.ceil((2 * half) / CLOUD_CELL));
  const x = over.look[0] - (size * CLOUD_CELL) / 2;
  const z = over.look[2] - (size * CLOUD_CELL) / 2;
  const level = new Float64Array(size * size);
  for (let j = 0; j < size; j++) {
    for (let i = 0; i < size; i++) {
      /* two sizes of cloud, the larger leading */
      const n = 0.75 * noise(i / 5, j / 5) + 0.25 * noise(i / 2 + 17, j / 2 + 31);
      /* the last quarter of the way to the world's edge, the clouds give out */
      const out = Math.max(Math.abs(i + 0.5 - size / 2), Math.abs(j + 0.5 - size / 2)) / (size / 2);
      level[j * size + i] = n - Math.max(0, (out - 0.75) / 0.25) * 0.6;
    }
  }
  const sorted = Float64Array.from(level).sort();
  const floor = sorted[Math.min(sorted.length - 1, Math.floor((1 - CLOUD_COVER) * sorted.length))];
  /* the bands: the filled cells in equal shares, by how far into a cloud each is */
  const filled = sorted.filter(v => v >= floor);
  const steps = Array.from({ length: CLOUD_BANDS - 1 }, (_, b) => filled[Math.floor(((b + 1) / CLOUD_BANDS) * filled.length)]);
  const cells = new Uint8Array(size * size);
  level.forEach((v, k) => { if (v >= floor) cells[k] = 1 + steps.filter(s => v >= s).length; });

  /* The clear sky: round where the line from the camera to the town
     crosses the deck, at every step of both flights. The town is taken as
     the ground the landing still stands off it (its distance), which comes
     onto the deck smaller by how far along the line the deck is: most of
     its width from high over it, nearly none from just over the deck. */
  const landing = flight.wide.shots[flight.wide.shots.length - 1];
  const town = landing.look;
  const clear = (cx: number, cz: number, r: number) => {
    const reach = Math.ceil(r / CLOUD_CELL) + 1;
    const ci = Math.floor((cx - x) / CLOUD_CELL), cj = Math.floor((cz - z) / CLOUD_CELL);
    for (let j = cj - reach; j <= cj + reach; j++) {
      for (let i = ci - reach; i <= ci + reach; i++) {
        if (i < 0 || j < 0 || i >= size || j >= size) continue;
        /* the nearest point of the cell to the crossing */
        const nx = Math.min(Math.max(cx, x + i * CLOUD_CELL), x + (i + 1) * CLOUD_CELL);
        const nz = Math.min(Math.max(cz, z + j * CLOUD_CELL), z + (j + 1) * CLOUD_CELL);
        if (Math.hypot(nx - cx, nz - cz) <= r) cells[j * size + i] = 0;
      }
    }
  };
  for (const set of [flight.wide, flight.tall]) {
    if (!set) continue;
    const last = set.shots.length - 1;
    for (let at = 0; at <= last; at += 0.25) {
      const k = Math.min(last, Math.floor(at));
      const { eye } = cameraAt(set.shots[k], set.shots[Math.min(last, k + 1)], at - k);
      const cross = crossing(eye, town);
      if (cross) clear(cross[0], cross[1], CLOUD_CLEAR + landing.d * ((eye[1] - CLOUD_Y) / (eye[1] - town[1])));
    }
  }
  return { x, z, size, cells };
}

/** Where the line from the camera to a point crosses the deck, as x and z,
    or null where it does not: the camera under it, or the point over it. */
export function crossing(eye: readonly number[], point: readonly number[]): [number, number] | null {
  if (!(eye[1] > CLOUD_Y && point[1] < CLOUD_Y)) return null;
  const t = (eye[1] - CLOUD_Y) / (eye[1] - point[1]);
  return [eye[0] + (point[0] - eye[0]) * t, eye[2] + (point[2] - eye[2]) * t];
}

/** The cell of the deck over a point of the plane: 0 for clear sky and off
    the deck, else the band it belongs to. */
export function cloudAt(deck: CloudDeck, x: number, z: number): number {
  const i = Math.floor((x - deck.x) / CLOUD_CELL), j = Math.floor((z - deck.z) / CLOUD_CELL);
  return i < 0 || j < 0 || i >= deck.size || j >= deck.size ? 0 : deck.cells[j * deck.size + i];
}

/** How many of the deck's bands are gone with the camera this high: none
    over CLOUD_THIN, then one more every few blocks, and all of them by CLOUD_GONE. */
export function cloudThinned(eyeY: number): number {
  if (eyeY >= CLOUD_THIN) return 0;
  if (eyeY <= CLOUD_GONE) return CLOUD_BANDS;
  return Math.min(CLOUD_BANDS, Math.ceil(((CLOUD_THIN - eyeY) / (CLOUD_THIN - CLOUD_GONE)) * CLOUD_BANDS));
}

/** A point is under a cloud, seen from the camera: the line to it crosses a
    cell of a band not yet gone. A lantern there would float on top of the cloud. */
export function clouded(deck: CloudDeck, eye: readonly number[], point: readonly number[], thinned: number): boolean {
  const cross = crossing(eye, point);
  return !!cross && cloudAt(deck, cross[0], cross[1]) > thinned;
}

/** The matrix a camera standing at `eye` and looking at `look` would have
    with this lens, upright as BlueMap holds it, column-major as the stills'
    are. It is the camera between two stills, where neither still's own
    matrix is: the deck is nearer the camera than the land is, so a still
    moved to stand in for that camera (warp) would carry it wrong. Only the
    rows that place a point on the frame are filled; the depth row is left
    at nought, since nothing here asks how far into the frame a point is. */
export function cameraMatrix(eye: readonly number[], look: readonly number[], lens: { x: number; y: number }): number[] {
  const f = [look[0] - eye[0], look[1] - eye[1], look[2] - eye[2]];
  const fl = Math.hypot(f[0], f[1], f[2]) || 1;
  const fwd = [f[0] / fl, f[1] / fl, f[2] / fl];
  /* right of the way ahead, on the level; and up, square to both */
  const rl = Math.hypot(fwd[2], fwd[0]) || 1;
  const right = [-fwd[2] / rl, 0, fwd[0] / rl];
  const up = [right[1] * fwd[2] - right[2] * fwd[1], right[2] * fwd[0] - right[0] * fwd[2], right[0] * fwd[1] - right[1] * fwd[0]];
  const dot = (a: readonly number[]) => a[0] * eye[0] + a[1] * eye[1] + a[2] * eye[2];
  return [
    lens.x * right[0], lens.y * up[0], 0, fwd[0],
    lens.x * right[1], lens.y * up[1], 0, fwd[1],
    lens.x * right[2], lens.y * up[2], 0, fwd[2],
    -lens.x * dot(right), -lens.y * dot(up), 0, -dot(fwd),
  ];
}

/** A level plane through a camera: the 3×3 (row by row) that takes a point
    of the plane at height `y`, as (x, z, 1), to where the camera puts it
    before the division by depth (X, Y, W), as projectPoint does for one point. */
export function planeHomography(m: readonly number[], y: number): number[] {
  return [
    m[0], m[8], m[4] * y + m[12],
    m[1], m[9], m[5] * y + m[13],
    m[3], m[11], m[7] * y + m[15],
  ];
}

/** The deck on the frame: the 3×3 (row by row) that takes a pixel of the
    deck's picture (one a cell, its corner at the deck's north-west corner)
    to the frame's pixels, through the camera `m`, the still's size and
    where the still lies in the frame under `cover`. Set as a matrix3d, the
    picture is drawn on the plane as the camera sees it. Scaled so its depth
    over the picture is about one, and never by a negative number: the sign
    of the depth is what keeps the part behind the camera out of sight. */
export function deckHomography(m: readonly number[], deck: CloudDeck, still: { width: number; height: number }, rect: { x: number; y: number; width: number }): number[] {
  const p = planeHomography(m, CLOUD_Y);
  const q = rect.width / still.width;
  const sx = (q * still.width) / 2, sy = (q * still.height) / 2;
  /* the frame's pixels from the camera's: across from X and W, down from Y and W */
  const s = [
    sx * p[0] + (rect.x + sx) * p[6], sx * p[1] + (rect.x + sx) * p[7], sx * p[2] + (rect.x + sx) * p[8],
    -sy * p[3] + (rect.y + sy) * p[6], -sy * p[4] + (rect.y + sy) * p[7], -sy * p[5] + (rect.y + sy) * p[8],
    p[6], p[7], p[8],
  ];
  /* from the picture's pixels to the plane: a cell to a pixel, from the deck's corner */
  const c = CLOUD_CELL;
  const h = [
    s[0] * c, s[1] * c, s[0] * deck.x + s[1] * deck.z + s[2],
    s[3] * c, s[4] * c, s[3] * deck.x + s[4] * deck.z + s[5],
    s[6] * c, s[7] * c, s[6] * deck.x + s[7] * deck.z + s[8],
  ];
  const k = Math.max(Math.abs(h[6]) * deck.size, Math.abs(h[7]) * deck.size, Math.abs(h[8])) || 1;
  return h.map(v => v / k);
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

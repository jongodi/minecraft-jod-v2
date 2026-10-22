/* The flight down into the world (scripts/map-flight.mjs): a run of stills of
   the 3D map from high over the whole world down to the start view, each with
   the camera it was taken with, so the home page can pin a place on whichever
   frame is showing. Pure, so the page and the tests share it. */
import flightFile from './map-flight.json';
import type { WorldPoint } from './map-types';

export type FlightShape = 'wide' | 'tall';

export interface FlightSet {
  width: number;
  height: number;
  /** one per frame: the camera's projection × view, column-major as three.js keeps it */
  matrices: number[][];
}

export interface Flight {
  version: string;
  frames: number;
  wide: FlightSet;
  tall?: FlightSet;
}

/** The flight map:flight took last, or null before it has been taken. */
export const FLIGHT: Flight | null = (() => {
  const f = flightFile as Partial<Flight>;
  return f.version && f.frames && f.frames > 1 && f.wide?.matrices.length === f.frames ? (f as Flight) : null;
})();

/** A frame's address: versioned, so the CDN keeps it for a year. */
export const flightFrame = (flight: Flight, shape: FlightShape, n: number): string =>
  `/map-flight/${shape}-${n}.webp?v=${flight.version}`;

/** The set for a frame of this width and height: the tall one for a frame
    standing on end, where there is one. */
export function flightShape(flight: Flight, width: number, height: number): FlightShape {
  return width < height && flight.tall ? 'tall' : 'wide';
}

/** Where a place stands in a frame, as a fraction of its width and height
    (0 to 1 inside it), or null behind the camera. A place is pinned where its
    lantern stands in the 3D map: the middle of its block, a block up. */
export function project(m: readonly number[], p: WorldPoint): { x: number; y: number } | null {
  const x = p.x + 0.5, y = p.y + 1, z = p.z + 0.5;
  const w = m[3] * x + m[7] * y + m[11] * z + m[15];
  if (!(w > 0)) return null;
  const nx = (m[0] * x + m[4] * y + m[8] * z + m[12]) / w;
  const ny = (m[1] * x + m[5] * y + m[9] * z + m[13]) / w;
  return { x: (nx + 1) / 2, y: (1 - ny) / 2 };
}

/** How a picture of `iw`×`ih` lies in a box of `w`×`h` under
    `object-fit: cover`, at the still's `object-position: 50% 45%`. */
export function cover(w: number, h: number, iw: number, ih: number): { x: number; y: number; width: number; height: number } {
  const s = Math.max(w / iw, h / ih);
  const width = iw * s, height = ih * s;
  return { x: (w - width) * 0.5, y: (h - height) * 0.45, width, height };
}

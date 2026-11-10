/* Which way is which on the ground, as the game reckons it: north is towards
   negative Z, east to its right. A module of its own, apart from the flight's
   cameras (map-flight.ts), because the locator and the world read it from the
   page's first paint, while the flight and its forty stills' cameras arrive
   with the flight. */

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

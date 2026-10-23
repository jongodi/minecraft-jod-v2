import { describe, expect, it } from 'vitest';
import { bearing, cameraAt, cover, depthScale, easeFlight, facing, fetchOrder, flightShape, frameFor, heading, headingOf, horizonPoint, project, projectPoint, warp, type Flight, type FlightShot } from '../map-flight';

const IDENTITY = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
/* w = z, as a camera at the origin looking down +z would give */
const DEPTH = (() => { const m = [...IDENTITY]; m[15] = 0; m[11] = 1; return m; })();

describe('project', () => {
  it('pins a place on its lantern: the middle of the block, a block up', () => {
    /* identity: the screen is the world's x and y, -1 to 1 across the frame */
    expect(project(IDENTITY, { x: -1, y: -1, z: 0 })).toEqual({ x: 0.25, y: 0.5 });
  });

  it('divides by depth', () => {
    const p = projectPoint(DEPTH, [3.5, 2, 7.5]);
    expect(p!.x).toBeCloseTo((3.5 / 7.5 + 1) / 2);
    expect(p!.y).toBeCloseTo((1 - 2 / 7.5) / 2);
  });

  it('leaves out a place behind the camera', () => {
    expect(project(DEPTH, { x: 0, y: 0, z: -10 })).toBeNull();
  });
});

describe('the camera between stills', () => {
  const shot = (d: number, look: [number, number, number]): FlightShot => ({ m: DEPTH, eye: [look[0], look[1] + d, look[2]], look, d });

  it('closes the distance evenly in proportion, and moves its point evenly', () => {
    const c = cameraAt(shot(400, [0, 64, 0]), shot(100, [40, 64, 0]), 0.5);
    expect(c.d).toBeCloseTo(200);
    expect(c.look).toEqual([20, 64, 0]);
  });

  it('grows a still by how much nearer the camera stands, about the point it now looks at', () => {
    /* in DEPTH the point (0, 0, 10) is the middle of the still */
    const w = warp(shot(300, [0, 0, 10]), [0, 0, 10], 100, 1280, 720);
    expect(w.scale).toBeCloseTo(3);
    expect(w.from).toEqual({ x: 640, y: 360 });
  });

  it('leaves a still as it is at its own camera', () => {
    const s = shot(250, [0, 0, 10]);
    const w = warp(s, s.look, s.d, 1280, 720);
    expect(w.scale).toBe(1);
    expect(w.from).toEqual({ x: 640, y: 360 });
  });
});

describe('the flight', () => {
  it('fetches the overview first, then the landing, then ever finer between', () => {
    const order = fetchOrder(40);
    expect(order.slice(0, 3)).toEqual([0, 39, 32]);
    expect(new Set(order).size).toBe(40);
    expect([...order].sort((a, b) => a - b)).toEqual([...Array(40).keys()]);
  });

  it('holds a moment at the overview and settles on landing', () => {
    expect(easeFlight(0)).toBe(0);
    expect(easeFlight(1)).toBe(1);
    expect(easeFlight(0.5)).toBe(0.5);
    expect(easeFlight(0.05)).toBeLessThan(0.05);
    expect(easeFlight(0.95)).toBeGreaterThan(0.95);
  });

  it('reads the way the camera faces by the game\'s compass', () => {
    expect(facing([0, 100, 0], [0, 64, -50])).toBe('north');
    expect(facing([0, 100, 0], [0, 64, 50])).toBe('south');
    expect(facing([0, 100, 0], [50, 64, 10])).toBe('east');
    expect(facing([0, 100, 0], [-50, 64, -10])).toBe('west');
  });
});

describe('cover', () => {
  it('fills a taller box by height, cut evenly at the sides', () => {
    expect(cover(450, 800, 1280, 720)).toEqual({ x: (450 - 800 * 16 / 9) / 2, y: 0, width: 800 * 16 / 9, height: 800 });
  });

  it('fills a wider box by width, cut a little more off the foot than the top', () => {
    const r = cover(1600, 600, 1280, 720);
    expect(r.width).toBe(1600);
    expect(r.height).toBe(900);
    expect(r.y).toBeCloseTo(-300 * 0.45);
  });
});

describe('flightShape', () => {
  const set = { width: 1, height: 1, shots: [] };
  it('takes the tall flight for a frame on end, where there is one', () => {
    expect(flightShape({ version: 'v', frames: 2, wide: set, tall: set } as Flight, 390, 700)).toBe('tall');
    expect(flightShape({ version: 'v', frames: 2, wide: set } as Flight, 390, 700)).toBe('wide');
    expect(flightShape({ version: 'v', frames: 2, wide: set, tall: set } as Flight, 1440, 800)).toBe('wide');
  });
});

describe('the locator bar and the lanterns', () => {
  it('reads a bearing as the game faces: north is negative Z, east to its right', () => {
    const north = headingOf(0);
    expect(north[0]).toBeCloseTo(0);
    expect(north[1]).toBeCloseTo(-1);
    expect(bearing([0, 0], north, [0, -100]).angle).toBeCloseTo(0);
    expect(bearing([0, 0], north, [100, 0]).angle).toBeCloseTo(Math.PI / 2);
    expect(bearing([0, 0], north, [-100, 0]).angle).toBeCloseTo(-Math.PI / 2);
    expect(Math.abs(bearing([0, 0], north, [0, 100]).angle)).toBeCloseTo(Math.PI);
    expect(bearing([0, 0], north, [30, -40]).blocks).toBeCloseTo(50);
  });

  it('takes the way the camera faces from where it stands and looks', () => {
    const [x, z] = heading([0, 300, 0], [0, 64, -40]);
    expect(x).toBeCloseTo(0);
    expect(z).toBeCloseTo(-1);
    expect(heading([0, 0, 0], [10, -5, 0])).toEqual([1, 0]);
  });

  it('draws a lantern smaller the farther off it stands, within bounds', () => {
    expect(depthScale(140)).toBeCloseTo(1);
    expect(depthScale(1000)).toBe(0.5);
    expect(depthScale(20)).toBe(1.1);
    expect(depthScale(280)).toBeCloseTo(0.5);
  });

  it('puts the horizon far ahead at the camera\'s own height', () => {
    const [x, y, z] = horizonPoint([0, 300, 0], [0, 64, -40]);
    expect(x).toBeCloseTo(0);
    expect(y).toBe(300);
    expect(z).toBeLessThan(-99000);
  });
});

describe('a corner of the world on a wall', () => {
  /* a camera that sees x and y from -1 to 1 at a distance, wider as it backs off */
  const at = (span: number): FlightShot => {
    const m = [...IDENTITY];
    m[0] = 1 / span; m[5] = 1 / span;
    return { m, eye: [0, 0, 0], look: [0, 0, 0], d: span };
  };
  const set = { width: 1280, height: 720, shots: [at(100), at(10), at(3)] };

  it('takes the still that has them all, as close as it still has them', () => {
    const pick = frameFor(set, [[-5, -5, 0], [5, 5, 0]])!;
    expect(pick.k).toBe(1);
    expect(pick.at.every(a => a !== null)).toBe(true);
  });

  it('takes the still with the most of them when none has all', () => {
    const pick = frameFor(set, [[-5, 0, 0], [5, 0, 0], [500, 0, 0]])!;
    expect(pick.at.filter(Boolean)).toHaveLength(2);
    expect(pick.at[2]).toBeNull();
  });

  it('has nothing to show for no places', () => {
    expect(frameFor(set, [])).toBeNull();
  });
});

import { describe, expect, it } from 'vitest';
import { cover, flightShape, project, type Flight } from '../map-flight';

const IDENTITY = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

describe('project', () => {
  it('pins a place on its lantern: the middle of the block, a block up', () => {
    /* identity: the screen is the world's x and y, -1 to 1 across the frame */
    expect(project(IDENTITY, { x: -1, y: -1, z: 0 })).toEqual({ x: 0.5 / 2, y: (1 - 0) / 2 });
  });

  it('divides by depth', () => {
    /* w = z, as a camera looking down +z would give */
    const m = [...IDENTITY];
    m[15] = 0; m[11] = 1;
    const p = project(m, { x: 3, y: 1, z: 7 });
    expect(p!.x).toBeCloseTo((3.5 / 7.5 + 1) / 2);
    expect(p!.y).toBeCloseTo((1 - 2 / 7.5) / 2);
  });

  it('leaves out a place behind the camera', () => {
    const m = [...IDENTITY];
    m[15] = 0; m[11] = 1;
    expect(project(m, { x: 0, y: 0, z: -10 })).toBeNull();
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
  const set = { width: 1, height: 1, matrices: [] };
  it('takes the tall flight for a frame on end, where there is one', () => {
    expect(flightShape({ version: 'v', frames: 2, wide: set, tall: set } as Flight, 390, 700)).toBe('tall');
    expect(flightShape({ version: 'v', frames: 2, wide: set } as Flight, 390, 700)).toBe('wide');
    expect(flightShape({ version: 'v', frames: 2, wide: set, tall: set } as Flight, 1440, 800)).toBe('wide');
  });
});

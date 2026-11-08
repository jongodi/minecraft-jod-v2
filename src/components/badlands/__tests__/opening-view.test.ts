import { describe, expect, it } from 'vitest';
import { openingView } from '../MapSheet';
import { MAP_H, MAP_W } from '../MapArt';

/* where a paper unit lands on the sheet, through the view: the svg's meet, then the zoom and pan */
const onSheet = (w: number, h: number, v: { z: number; x: number; y: number }, ux: number, uy: number) => {
  const s = Math.min(w / MAP_W, h / MAP_H);
  return { x: v.x + v.z * ((w - MAP_W * s) / 2 + ux * s), y: v.y + v.z * ((h - MAP_H * s) / 2 + uy * s) };
};

describe('the view the painted map opens at', () => {
  it('is the whole sheet where the paper already fills the frame', () => {
    expect(openingView(1440, 844, [{ x: 300 }, { x: 600 }])).toEqual({ z: 1, x: 0, y: 0 });
  });
  it('fills an upright phone from top to foot, the places in the middle', () => {
    const v = openingView(390, 702, [{ x: 400 }, { x: 500 }]);
    expect(v.z).toBeCloseTo(702 / (MAP_H * 0.39));
    /* the paper's top and foot meet the frame's */
    expect(onSheet(390, 702, v, 0, 0).y).toBeCloseTo(0);
    expect(onSheet(390, 702, v, 0, MAP_H).y).toBeCloseTo(702);
    /* the places' middle is the frame's */
    expect(onSheet(390, 702, v, 450, 0).x).toBeCloseTo(195);
  });
  it('stops at the paper\'s edge when the places lie near it', () => {
    const v = openingView(390, 702, [{ x: 20 }]);
    expect(v.x).toBe(0);
    const w = openingView(390, 702, [{ x: MAP_W - 10 }]);
    expect(w.x).toBeCloseTo(390 - 390 * w.z);
  });
  it('zooms no closer than the sheet allows on the narrowest screens', () => {
    expect(openingView(300, 900, []).z).toBe(3.2);
  });
});

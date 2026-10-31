import { describe, expect, it } from 'vitest';
import { paperFit } from '../MapSheet';
import type { MapLocation } from '@/lib/map-types';

const place = (id: number, x: number, y: number, wx: number, wz: number): MapLocation =>
  ({ id, label: `s${id}`, sublabel: '', x, y, type: 'surface', world: { x: wx, y: 64, z: wz } });

describe('the paper fitted to the world', () => {
  it('maps a camera between two places onto the paper between them', () => {
    const fit = paperFit([place(1, 100, 100, -7000, -9000), place(2, 300, 200, -6800, -8900)]);
    expect(fit).not.toBeNull();
    expect(fit!.x(-6900)).toBeCloseTo(200);
    expect(fit!.y(-8950)).toBeCloseTo(150);
  });
  it('needs two places that stand in the world', () => {
    expect(paperFit([place(1, 100, 100, -7000, -9000)])).toBeNull();
    expect(paperFit([{ id: 1, label: 'a', sublabel: '', x: 1, y: 1, type: 'surface' }, { id: 2, label: 'b', sublabel: '', x: 2, y: 2, type: 'surface' }])).toBeNull();
  });
});

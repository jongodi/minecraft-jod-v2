import { describe, expect, it } from 'vitest';
import { CORNER_REF, layoutCorner, marksTouch, nameWidth } from '../corner-layout';

const pin = (id: number, x: number, y: number, label = `Staður ${id}`) => ({ id, label, x, y });

/* every mark's box at the reference size, to check it stands inside the picture */
const inside = (m: { x: number; y: number; n: number }) => {
  const x = m.x * CORNER_REF.w, y = m.y * CORNER_REF.h;
  const right = x + 6 + 2 + 8 + String(m.n).length * 12;
  return x - 6 >= 1.9 && right <= CORNER_REF.w - 1.9 && y - 20 >= 1.9 && y <= CORNER_REF.h - 1.9;
};

describe('the wanted poster\'s corner of the world', () => {
  it('numbers the marks in the order of the poster\'s list', () => {
    const marks = layoutCorner([pin(7, 0.3, 0.5), pin(2, 0.7, 0.5), pin(9, 0.5, 0.8)]);
    expect(marks.map(m => [m.id, m.n])).toEqual([[7, 1], [2, 2], [9, 3]]);
  });

  it('leaves one lantern where it stands', () => {
    const [m] = layoutCorner([pin(1, 0.5, 0.5)]);
    expect(m.x).toBeCloseTo(0.5, 4);
    expect(m.y).toBeCloseTo(0.5, 4);
  });

  it('parts ten places built side by side in a town until no two marks touch', () => {
    const town = Array.from({ length: 10 }, (_, i) => pin(i + 1, 0.45 + (i % 4) * 0.01, 0.5 + Math.floor(i / 4) * 0.02));
    const marks = layoutCorner(town);
    expect(marksTouch(marks)).toBe(false);
    expect(marks.every(inside)).toBe(true);
  });

  it('parts places standing on the very same spot, the first up and to the left', () => {
    const marks = layoutCorner([pin(1, 0.5, 0.5), pin(2, 0.5, 0.5), pin(3, 0.5, 0.5)]);
    expect(marksTouch(marks)).toBe(false);
    expect(marks[0].y <= marks[2].y || marks[0].x <= marks[2].x).toBe(true);
  });

  it('holds marks near the edge inside the picture', () => {
    const marks = layoutCorner([pin(1, 0.12, 0.15), pin(2, 0.88, 0.9), pin(3, 0.88, 0.15), pin(4, 0.12, 0.9)]);
    expect(marks.every(inside)).toBe(true);
    expect(marksTouch(marks)).toBe(false);
  });

  it('hangs a name to the left where the picture\'s edge would cut it', () => {
    const [near, far] = layoutCorner([pin(1, 0.2, 0.5, 'Nýja geymslan'), pin(2, 0.82, 0.3, 'Nýja geymslan')]);
    expect(near.side).toBe('right');
    expect(far.side).toBe('left');
    expect(nameWidth('Nýja geymslan')).toBeGreaterThan(nameWidth('Bankinn'));
  });

  it('lays the same pins out the same way every time', () => {
    const town = [pin(1, 0.4, 0.4), pin(2, 0.41, 0.41), pin(3, 0.42, 0.4), pin(4, 0.6, 0.7)];
    expect(layoutCorner(town)).toEqual(layoutCorner(town));
  });
});

import { describe, expect, it } from 'vitest';
import { creaseLabel } from '../crease';

describe('the crease on a phone\'s poster', () => {
  it('counts the charges in the right number', () => {
    expect(creaseLabel(1, 0)).toBe('1 ákæra');
    expect(creaseLabel(5, 0)).toBe('5 ákærur');
    expect(creaseLabel(11, 0)).toBe('11 ákærur');
    expect(creaseLabel(21, 3)).toBe('21 ákæra og 3 afrek');
  });

  it('is never blank: with nothing counted it says what the press does', () => {
    expect(creaseLabel(null, 0)).toBe('Brjóta sundur');
    expect(creaseLabel(null, 12)).toBe('12 afrek');
    expect(creaseLabel(0, 0)).toBe('0 ákærur');
  });
});

import { describe, expect, it } from 'vitest';
import { blocksBetween } from '@/lib/terrain';

describe('a brush stroke between two samples', () => {
  it('takes every block on the way, so a fast drag leaves no gaps', () => {
    expect(blocksBetween([0, 0], [4, 0])).toEqual([[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]]);
    expect(blocksBetween([2, 5], [2, 2])).toEqual([[2, 5], [2, 4], [2, 3], [2, 2]]);
    expect(blocksBetween([0, 0], [3, 3])).toEqual([[0, 0], [1, 1], [2, 2], [3, 3]]);
  });

  it('steps a slant one block at a time, end to end', () => {
    const line = blocksBetween([0, 0], [6, 2]);
    expect(line[0]).toEqual([0, 0]);
    expect(line[line.length - 1]).toEqual([6, 2]);
    for (let i = 1; i < line.length; i++) {
      expect(Math.abs(line[i][0] - line[i - 1][0])).toBeLessThanOrEqual(1);
      expect(Math.abs(line[i][1] - line[i - 1][1])).toBeLessThanOrEqual(1);
    }
  });

  it('is one block when the samples share it', () => {
    expect(blocksBetween([7, 3], [7, 3])).toEqual([[7, 3]]);
  });
});

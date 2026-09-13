import assert from 'node:assert/strict';
import { test } from 'node:test';
import { contourPath } from './contour.ts';

test('a contour is closed, smooth and deterministic', () => {
  const a = contourPath(100, 100, 50, 30, 7);
  const b = contourPath(100, 100, 50, 30, 7);
  assert.equal(a, b);
  assert.ok(a.startsWith('M'));
  assert.ok(a.endsWith(' Z'));
  assert.equal((a.match(/ C/g) ?? []).length, 28);
  assert.notEqual(a, contourPath(100, 100, 50, 30, 8));
});

test('the wobble stays within bounds', () => {
  const d = contourPath(0, 0, 100, 100, 3, 0.06);
  const xs = [...d.matchAll(/(-?\d+\.?\d*) (-?\d+\.?\d*)/g)].map((m) => Math.hypot(Number(m[1]), Number(m[2])));
  for (const r of xs) assert.ok(r > 90 && r < 112, String(r));
});

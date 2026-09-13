import assert from 'node:assert/strict';
import { test } from 'node:test';
import { FUSE_MS, ticksFor, tickWord } from './rules.ts';

test('reaction time becomes ticks, never zero', () => {
  assert.equal(ticksFor(0), 1);
  assert.equal(ticksFor(50), 1);
  assert.equal(ticksFor(51), 2);
  assert.equal(ticksFor(FUSE_MS), 30);
});

test('ticks are worded in Icelandic', () => {
  assert.equal(tickWord(1), '1 tikk');
  assert.equal(tickWord(12), '12 tikk');
});

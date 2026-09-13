import assert from 'node:assert/strict';
import { test } from 'node:test';
import { stateFromCode } from './codes.ts';
import { playersLine, stateWord } from './copy.ts';
import { lampFor } from './types.ts';

test('every state has a word and a lamp', () => {
  for (const s of ['online', 'offline', 'starting', 'stopping', 'unreachable'] as const) {
    assert.ok(stateWord(s).length > 0);
    assert.ok(['on', 'dim', 'off'].includes(lampFor(s)));
  }
  assert.equal(lampFor('online'), 'on');
  assert.equal(lampFor('starting'), 'dim');
  assert.equal(lampFor('offline'), 'off');
});

test('who is in reads like speech', () => {
  assert.equal(playersLine('online', []), 'Enginn inni');
  assert.equal(playersLine('online', ['stebbias']), 'stebbias inni');
  assert.equal(playersLine('online', ['stebbias', 'joenana']), 'stebbias og joenana inni');
  assert.equal(playersLine('online', ['a', 'b', 'c']), 'a, b og c inni');
  assert.equal(playersLine('offline', ['ghost']), 'Enginn inni');
});

test('exaroton codes map to the five states', () => {
  assert.equal(stateFromCode(1), 'online');
  assert.equal(stateFromCode(5), 'online');
  assert.equal(stateFromCode(0), 'offline');
  assert.equal(stateFromCode(7), 'offline');
  assert.equal(stateFromCode(3), 'stopping');
  for (const c of [2, 4, 6, 8, 10]) assert.equal(stateFromCode(c), 'starting');
});

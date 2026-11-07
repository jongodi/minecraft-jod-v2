import { describe, expect, it } from 'vitest';
import type { ChatLine } from '@/lib/chat';
import { AGAIN_MS, askAgain, keyOf, merged } from '../chatLog';

const say = (at: string, text: string): ChatLine => ({ kind: 'say', at, name: 'joenana', text, prints: 0, href: '/crew/joenana' });
const joined = (at: string, name: string): ChatLine => ({ kind: 'joined', at, name, href: `/crew/${name}` });

describe('askAgain', () => {
  const now = 10 * AGAIN_MS;

  it('never asks while the tab is hidden', () => {
    expect(askAgain('tick', { now, last: 0, hidden: true })).toBe(false);
    expect(askAgain('shown', { now, last: 0, hidden: true, hiddenAt: 0 })).toBe(false);
  });

  it('waits for the first question to have gone out', () => {
    expect(askAgain('tick', { now, last: null, hidden: false })).toBe(false);
    expect(askAgain('shown', { now, last: null, hidden: false, hiddenAt: 0 })).toBe(false);
  });

  it('asks while the world is in view once five minutes have gone by', () => {
    expect(askAgain('tick', { now, last: now - AGAIN_MS + 1, hidden: false })).toBe(false);
    expect(askAgain('tick', { now, last: now - AGAIN_MS, hidden: false })).toBe(true);
  });

  it('asks on being looked at again only after five minutes or more away', () => {
    expect(askAgain('shown', { now, last: now - 2 * AGAIN_MS, hidden: false, hiddenAt: now - 60_000 })).toBe(false);
    expect(askAgain('shown', { now, last: now - 2 * AGAIN_MS, hidden: false, hiddenAt: now - AGAIN_MS })).toBe(true);
    /* a visibility event with no time away behind it (the page's own nudge) is no reason to ask */
    expect(askAgain('shown', { now, last: now - 2 * AGAIN_MS, hidden: false, hiddenAt: null })).toBe(false);
  });
});

describe('merged', () => {
  const a = say('2026-11-07T20:00:00.000Z', 'komin inn');
  const b = say('2026-11-07T21:40:00.000Z', 'sjáið brúna');
  const came = joined('2026-11-07T21:42:00.000Z', 'stebbias');

  it('holds a line once, however many answers carry it', () => {
    const log = merged([], [a, b], 20);
    expect(merged(log, [a, b], 20)).toBe(log);
    expect(merged(log, [a, b], 20).map(keyOf)).toEqual([a, b].map(keyOf));
  });

  it('puts a line fetched late where it was said, before a friend who came in after it', () => {
    const log = merged([], [a], 20);
    const withCame = [...log, came];
    expect(merged(withCame, [a, b], 20)).toEqual([a, b, came]);
  });

  it('keeps the newest', () => {
    const lines = Array.from({ length: 5 }, (_, i) => say(`2026-11-07T2${i}:00:00.000Z`, `lína ${i}`));
    expect(merged([], lines, 3).map(l => (l as { text: string }).text)).toEqual(['lína 2', 'lína 3', 'lína 4']);
  });
});

import { describe, expect, it } from 'vitest';
import { PHANTOM_TICKS, awakeWords, sleeplessOf } from '@/lib/sleepless';

describe('sleeplessOf', () => {
  it('names only those the phantoms would come for, three days without a bed or more', () => {
    expect(sleeplessOf([
      { username: 'stebbias', timeSinceRest: 4000 },
      { username: 'joenana', timeSinceRest: PHANTOM_TICKS - 1 },
      { username: 'AmmaGaur', timeSinceRest: PHANTOM_TICKS },
    ])).toEqual({ ammagaur: 3 });
  });

  it('counts whole nights, floored', () => {
    expect(sleeplessOf([
      { username: 'eikibleiki', timeSinceRest: 95_999 },
      { username: 'fafnir1994', timeSinceRest: 96_000 },
      { username: 'IMlonely', timeSinceRest: 24_000 * 21 + 23_999 },
    ])).toEqual({ eikibleiki: 3, fafnir1994: 4, imlonely: 21 });
  });

  it('is empty for a crew that sleeps', () => {
    expect(sleeplessOf([])).toEqual({});
  });
});

describe('awakeWords', () => {
  it('agrees with the number as Icelandic does', () => {
    expect(awakeWords(1)).toBe('hefur ekki sofið í 1 nótt');
    expect(awakeWords(3)).toBe('hefur ekki sofið í 3 nætur');
    expect(awakeWords(11)).toBe('hefur ekki sofið í 11 nætur');
    expect(awakeWords(21)).toBe('hefur ekki sofið í 21 nótt');
  });
});

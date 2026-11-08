import { describe, expect, it } from 'vitest';
import { noShowsLine } from '../held';

describe("a held night's slip on the board", () => {
  it('names one who did not come in the singular, and several in the plural', () => {
    expect(noShowsLine(['fafnir1994'])).toBe('sagðist mæta en kom ekki: fafnir1994');
    expect(noShowsLine(['fafnir1994', 'IMlonely'])).toBe('sögðust mæta en komu ekki: fafnir1994 og IMlonely');
    expect(noShowsLine(['fafnir1994', 'IMlonely', 'Gamla123'])).toBe('sögðust mæta en komu ekki: fafnir1994, IMlonely og Gamla123');
  });
});

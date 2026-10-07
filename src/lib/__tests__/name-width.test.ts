import { describe, expect, it } from 'vitest';
import { nameEm } from '@/lib/name-width';
import { CREW_USERNAMES } from '@/lib/crew-types';

describe('nameEm', () => {
  it('matches the slab as Chromium draws it, with a hair of room', () => {
    /* drawn widths in em at 1000px: AmmaGaur 6.115, ingunnbirta 6.375, stebbias 4.368 */
    expect(nameEm('AmmaGaur')).toBeCloseTo(6.115 * 1.02, 2);
    expect(nameEm('ingunnbirta')).toBeCloseTo(6.375 * 1.02, 2);
    expect(nameEm('stebbias')).toBeCloseTo(4.368 * 1.02, 2);
  });

  it('knows every glyph a crew name uses', () => {
    for (const name of CREW_USERNAMES) expect(nameEm(name)).toBeLessThan(name.length * 1.21 * 1.02);
  });

  it('counts anything outside a Minecraft name as wide, so it can only come out smaller', () => {
    expect(nameEm('ÞÞÞ')).toBeCloseTo(3 * 1.21 * 1.02, 2);
    expect(nameEm('')).toBe(0);
  });
});

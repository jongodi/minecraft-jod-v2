import { describe, expect, it } from 'vitest';
import { moonAge, moonFromParam, moonPhase, SYNODIC } from '@/lib/moon';

const at = (iso: string) => moonPhase(new Date(iso));

describe('the moon', () => {
  it('is new, full and at its quarters on the nights the almanac says (October and November 2026)', () => {
    expect(at('2026-10-10T16:00:00Z')).toBe(0);   // new moon, 10 October
    expect(at('2026-10-18T16:00:00Z')).toBe(2);   // first quarter, 18 October
    expect(at('2026-10-26T04:00:00Z')).toBe(4);   // full moon, 26 October
    expect(at('2026-11-01T20:00:00Z')).toBe(6);   // last quarter, 1 November
    expect(at('2026-11-09T07:00:00Z')).toBe(0);   // new moon, 9 November
  });

  it('waxes through the crescent and the gibbous between them, and wanes back', () => {
    expect(at('2026-10-14T12:00:00Z')).toBe(1);
    expect(at('2026-10-22T12:00:00Z')).toBe(3);
    expect(at('2026-10-29T12:00:00Z')).toBe(5);
    expect(at('2026-11-05T12:00:00Z')).toBe(7);
  });

  it('counts its age within one month, before the reference new moon too', () => {
    for (const iso of ['1999-03-01T00:00:00Z', '2026-10-05T19:00:00Z', '2051-07-30T12:00:00Z']) {
      const age = moonAge(new Date(iso));
      expect(age).toBeGreaterThanOrEqual(0);
      expect(age).toBeLessThan(SYNODIC);
    }
  });

  it('takes a phase from ?tungl= only as a single digit from 0 to 7', () => {
    expect(moonFromParam('0')).toBe(0);
    expect(moonFromParam('4')).toBe(4);
    expect(moonFromParam('7')).toBe(7);
    expect(moonFromParam('8')).toBeNull();
    expect(moonFromParam('-1')).toBeNull();
    expect(moonFromParam('4.5')).toBeNull();
    expect(moonFromParam('')).toBeNull();
    expect(moonFromParam(null)).toBeNull();
  });
});

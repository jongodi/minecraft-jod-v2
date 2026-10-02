import { describe, expect, it } from 'vitest';
import { sinceAt, whenAt } from '../night';

describe('a moment gone by, in Icelandic', () => {
  const now = new Date('2026-10-02T22:30:00Z');
  it('is today, yesterday, or a day with its date', () => {
    expect(sinceAt('2026-10-02T21:40:00Z', now)).toBe('í dag kl. 21:40');
    expect(sinceAt('2026-10-01T23:05:00Z', now)).toBe('í gær kl. 23:05');
    expect(sinceAt('2026-09-25T20:00:00Z', now)).toBe('föstudag 25. sep. kl. 20:00');
  });
  it('names the year only for a day far off in another year', () => {
    expect(sinceAt('2025-12-31T23:59:00Z', now)).toBe('miðvikudag 31. des. 2025 kl. 23:59');
    expect(sinceAt('2026-01-10T20:00:00Z', now)).toBe('laugardag 10. jan. kl. 20:00');
  });
  it('reads the clock in Iceland, which keeps UTC', () => {
    expect(whenAt('2026-10-02T20:00:00Z', now)).toBe('í kvöld kl. 20:00');
    expect(whenAt('2026-10-03T14:00:00Z', now)).toBe('á morgun kl. 14:00');
  });
});

import { describe, expect, it } from 'vitest';
import { NO_SEASON, YULE_LADS, seasonAt, seasonFromParam } from '@/lib/season';

const at = (iso: string) => seasonAt(new Date(iso));

describe('the time of year', () => {
  it('Hrekkjavaka runs 25–31 October', () => {
    expect(at('2026-10-24T23:59:00Z').halloween).toBe(false);
    expect(at('2026-10-25T00:00:00Z').halloween).toBe(true);
    expect(at('2026-10-31T23:59:00Z').halloween).toBe(true);
    expect(at('2026-11-01T00:00:00Z').halloween).toBe(false);
  });

  it('snow lies from 1 December to 6 January', () => {
    expect(at('2026-11-30T23:59:00Z').snow).toBe(false);
    expect(at('2026-12-01T00:00:00Z').snow).toBe(true);
    expect(at('2027-01-06T23:59:00Z').snow).toBe(true);
    expect(at('2027-01-07T00:00:00Z').snow).toBe(false);
  });

  it('fireworks burn all day on 31 December and 1 January, and not the day either side', () => {
    expect(at('2026-12-30T23:59:00Z').fireworks).toBe(false);
    expect(at('2026-12-31T00:00:00Z').fireworks).toBe(true);
    expect(at('2027-01-01T23:59:00Z').fireworks).toBe(true);
    expect(at('2027-01-02T00:00:00Z').fireworks).toBe(false);
  });

  it('the Yule Lads come one a day, 12–24 December, in order', () => {
    expect(at('2026-12-11T12:00:00Z').lad).toBeNull();
    expect(YULE_LADS[at('2026-12-12T12:00:00Z').lad!].name).toBe('Stekkjastaur');
    expect(YULE_LADS[at('2026-12-24T12:00:00Z').lad!].name).toBe('Kertasníkir');
    expect(at('2026-12-25T12:00:00Z').lad).toBeNull();
    expect(YULE_LADS).toHaveLength(13);
  });

  it('an ordinary day has no season', () => {
    expect(at('2026-09-30T12:00:00Z')).toEqual(NO_SEASON);
  });

  it('?arstid= shows a season on any day, and ignores anything else', () => {
    expect(seasonFromParam('hrekkjavaka')).toMatchObject({ halloween: true, snow: false });
    expect(seasonFromParam('aramot')).toMatchObject({ snow: true, fireworks: true });
    expect(seasonFromParam('jol-13')).toMatchObject({ snow: true, lad: 12 });
    expect(seasonFromParam('jol-14')).toBeNull();
    expect(seasonFromParam('eitthvad')).toBeNull();
    expect(seasonFromParam(null)).toBeNull();
  });
});

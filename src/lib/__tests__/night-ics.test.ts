import { describe, expect, it } from 'vitest';
import { fold, icsOf } from '@/lib/night-ics';
import type { Night } from '@/lib/play-night';

const night: Night = {
  id: 'ab12cd34', by: 'stebbias', createdAt: '2026-10-01T10:00:00.000Z', note: 'Fara í Nether, taka með; nesti',
  options: [{ id: 'a', at: '2026-10-03T20:00:00.000Z' }, { id: 'b', at: '2026-10-04T20:00:00.000Z' }],
  chosen: 'b', chosenBy: 'stebbias', cancelled: false, startedBy: null, outcome: null,
};

describe('a play night as a calendar entry', () => {
  it('carries the chosen time, three hours long, the note and the link', () => {
    const ics = icsOf(night, Date.parse('2026-10-02T12:00:00Z'))!;
    const lines = ics.split('\r\n');
    expect(lines[0]).toBe('BEGIN:VCALENDAR');
    expect(lines).toContain('DTSTAMP:20261002T120000Z');
    expect(lines).toContain('DTSTART:20261004T200000Z');
    expect(lines).toContain('DTEND:20261004T230000Z');
    expect(lines).toContain('UID:spilakvold-ab12cd34@jodcraft.world');
    expect(lines).toContain('SUMMARY:Spilakvöld á JOÐ: Fara í Nether\\, taka með\\; nesti');
    expect(lines).toContain('URL:https://jodcraft.world/kvold/ab12cd34#hopur');
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
  });

  it('is nothing for a night whose time is still open', () => {
    expect(icsOf({ ...night, chosen: null })).toBeNull();
  });

  it('folds a long line without cutting a letter in two', () => {
    const long = 'DESCRIPTION:' + 'ð'.repeat(60);
    const folded = fold(long);
    const parts = folded.split('\r\n ');
    expect(parts.length).toBeGreaterThan(1);
    for (const part of parts) expect(Buffer.byteLength(part, 'utf8')).toBeLessThanOrEqual(75);
    expect(parts.join('')).toBe(long);
  });
});

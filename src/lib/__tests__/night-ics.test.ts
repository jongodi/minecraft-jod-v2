import { describe, expect, it } from 'vitest';
import { feedOf, fold, icsOf } from '@/lib/night-ics';
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
    expect(lines).toContain('LOCATION:play.jodcraft.world');
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

describe('every play night as one calendar to subscribe to', () => {
  const now = Date.parse('2026-10-02T12:00:00Z');
  const past = [
    { id: 'old00001', by: 'joenana', note: '', at: '2026-09-12T20:00:00.000Z' },
    { id: 'old00002', by: 'AmmaGaur', note: 'Drekinn', at: '2026-09-19T21:00:00.000Z' },
  ];
  const events = (ics: string) => ics.split('\r\n').filter(l => l.startsWith('UID:')).map(l => l.slice(4));

  it('holds the annals and each fire whose time is chosen, oldest first', () => {
    const ics = feedOf([night], past, now);
    expect(events(ics)).toEqual(['spilakvold-old00001@jodcraft.world', 'spilakvold-old00002@jodcraft.world', 'spilakvold-ab12cd34@jodcraft.world']);
    const lines = ics.split('\r\n');
    expect(lines[0]).toBe('BEGIN:VCALENDAR');
    expect(lines).toContain('X-WR-CALNAME:Spilakvöld á JOÐ');
    expect(lines).toContain('REFRESH-INTERVAL;VALUE=DURATION:PT1H');
    expect(lines).toContain('DTSTART:20260912T200000Z');
    expect(lines).toContain('SUMMARY:Spilakvöld á JOÐ: Drekinn');
    expect(lines.filter(l => l === 'BEGIN:VEVENT')).toHaveLength(3);
    expect(lines.filter(l => l === 'BEGIN:VCALENDAR')).toHaveLength(1);
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
  });

  it('leaves out a fire still open and one put out', () => {
    const open = { ...night, id: 'open0001', chosen: null };
    const out = { ...night, id: 'out00001', cancelled: true };
    expect(events(feedOf([open, out], [], now))).toEqual([]);
  });

  it('names a night once when it is both among the fires and in the annals, as the fires have it', () => {
    const ics = feedOf([night], [{ id: night.id, by: 'stebbias', note: 'gamalt', at: '2026-10-03T20:00:00.000Z' }], now);
    expect(events(ics)).toHaveLength(1);
    expect(ics).toContain('DTSTART:20261004T200000Z');
    expect(ics).not.toContain('gamalt');
  });

  it('drops an annal whose fire has since been put out, and one with no time to stand on', () => {
    const ics = feedOf([{ ...night, cancelled: true }], [{ id: night.id, by: 'stebbias', note: '', at: '2026-10-04T20:00:00.000Z' }, { id: 'bad00001', by: 'x', note: '', at: 'ekki tími' }], now);
    expect(events(ics)).toEqual([]);
  });

  it('is a whole, empty calendar when there is nothing', () => {
    const lines = feedOf([], [], now).split('\r\n');
    expect(lines[0]).toBe('BEGIN:VCALENDAR');
    expect(lines.at(-2)).toBe('END:VCALENDAR');
    expect(lines).not.toContain('BEGIN:VEVENT');
  });
});

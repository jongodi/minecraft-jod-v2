/* A play night as a calendar entry (RFC 5545), so the phone's own calendar
   can carry it: /kvold/<id>/dagatal.ics. Server only, but pure. */
import { optionOf, type Night } from '@/lib/play-night';
import { siteUrl } from '@/lib/email';
import { SERVER_IP } from '@/components/badlands/data';

/** how long the entry blocks out: the evening is counted as six hours for who came, but a calendar wants the gathering itself */
export const ENTRY_MS = 3 * 3600_000;

/** 2026-10-03T20:00:00.000Z as the calendar writes it: 20261003T200000Z */
const stamp = (ms: number) => new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
/** text in a calendar line: backslashes, semicolons, commas and line breaks are escaped */
const escapeText = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

/** Lines longer than 75 bytes are folded onto the next, which starts with a space; a multi-byte letter is never cut in two. */
export function fold(line: string): string {
  const bytes = Buffer.from(line, 'utf8');
  if (bytes.length <= 75) return line;
  const parts: string[] = [];
  let from = 0;
  while (from < bytes.length) {
    const room = from === 0 ? 75 : 74;
    let to = Math.min(bytes.length, from + room);
    /* back up to the start of a character */
    while (to < bytes.length && (bytes[to] & 0xC0) === 0x80) to--;
    parts.push(bytes.subarray(from, to).toString('utf8'));
    from = to;
  }
  return parts.join('\r\n ');
}

/** One evening as the calendar holds it: a fire with its time chosen, or a night of the annals. */
export interface CalendarNight { id: string; by: string; note: string; at: string }

/** The entry itself, between BEGIN:VEVENT and END:VEVENT. */
function eventLines(night: CalendarNight, now: number): string[] {
  const start = Date.parse(night.at);
  const url = `${siteUrl()}/kvold/${night.id}#hopur`;
  return [
    'BEGIN:VEVENT',
    /* the entry's name for good, the same whichever address served it, so a calendar that fetches it again updates it rather than adding a second */
    `UID:spilakvold-${night.id}@jodcraft.world`,
    `DTSTAMP:${stamp(now)}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(start + ENTRY_MS)}`,
    `SUMMARY:${escapeText(night.note ? `Spilakvöld á JOÐ: ${night.note}` : 'Spilakvöld á JOÐ')}`,
    `DESCRIPTION:${escapeText(`${night.by} kveikti bálið. Hverjir mæta, og kveikt á þjóninum, á ${url}`)}`,
    `LOCATION:${SERVER_IP}`,
    `URL:${url}`,
    'END:VEVENT',
  ];
}

const calendar = (head: string[], events: string[]) =>
  ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//JOÐ//Spilakvöld//IS', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', ...head, ...events, 'END:VCALENDAR'].map(fold).join('\r\n') + '\r\n';

/** The entry for a night whose time is chosen; null while it is still open. */
export function icsOf(night: Night, now = Date.now()): string | null {
  const chosen = optionOf(night, night.chosen);
  if (!chosen) return null;
  return calendar([], eventLines({ id: night.id, by: night.by, note: night.note, at: chosen.at }, now));
}

/** How often a calendar that subscribes is asked to look again. */
export const FEED_REFRESH = 'PT1H';

/** Every evening in one calendar, for a phone that subscribes to it
    (/kvold/dagatal.ics): each fire whose time is chosen, and the nights of
    the annals, oldest first. A subscribed calendar takes the whole file anew
    each time it looks, so a fire put out is simply no longer in it, and one
    still open is not in it until its time is chosen. A night that is both
    among the fires and in the annals is the fires' own. */
export function feedOf(fires: readonly Night[], past: readonly CalendarNight[], now = Date.now()): string {
  const nights = new Map<string, CalendarNight>();
  for (const p of past) nights.set(p.id, { id: p.id, by: p.by, note: p.note, at: p.at });
  for (const night of fires) {
    const chosen = optionOf(night, night.chosen);
    if (night.cancelled) nights.delete(night.id);
    else if (chosen) nights.set(night.id, { id: night.id, by: night.by, note: night.note, at: chosen.at });
  }
  const sorted = [...nights.values()].filter(n => Number.isFinite(Date.parse(n.at))).sort((a, b) => Date.parse(a.at) - Date.parse(b.at) || a.id.localeCompare(b.id));
  return calendar([
    /* the calendar's own name in the phone's list, and how often to look again (Apple and Google read the X- lines, others the RFC 7986 ones) */
    'NAME:Spilakvöld á JOÐ',
    'X-WR-CALNAME:Spilakvöld á JOÐ',
    `REFRESH-INTERVAL;VALUE=DURATION:${FEED_REFRESH}`,
    `X-PUBLISHED-TTL:${FEED_REFRESH}`,
  ], sorted.flatMap(n => eventLines(n, now)));
}

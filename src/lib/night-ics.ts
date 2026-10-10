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

/** The entry for a night whose time is chosen; null while it is still open. */
export function icsOf(night: Night, now = Date.now()): string | null {
  const chosen = optionOf(night, night.chosen);
  if (!chosen) return null;
  const start = Date.parse(chosen.at);
  const url = `${siteUrl()}/kvold/${night.id}#hopur`;
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//JOÐ//Spilakvöld//IS',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
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
    'END:VCALENDAR',
  ];
  return lines.map(fold).join('\r\n') + '\r\n';
}

import { NextResponse } from 'next/server';
import { currentNights, pastNights } from '@/lib/play-night';
import { feedOf } from '@/lib/night-ics';

export const dynamic = 'force-dynamic';

/* Every play night as one calendar a phone subscribes to (src/lib/night-ics.ts):
   /kvold/dagatal.ics, offered in the crew's room as a webcal link. Each fire
   whose time is chosen and every night of the annals; the calendar looks
   again on its own, so a new fire turns up in it without anyone adding it.
   What the page already shows anyone (when, the note, who lit it), and no more. */
export async function GET() {
  const type = { 'Content-Type': 'text/calendar; charset=utf-8', 'Content-Disposition': 'inline; filename="spilakvold-jod.ics"' };
  /* no store, no nights: an empty calendar, which a subscription takes as it is */
  if (!process.env.REDIS_URL) return new NextResponse(feedOf([], []), { headers: { ...type, 'Cache-Control': 'no-store' } });
  try {
    const current = await currentNights();
    const past = await pastNights(Date.now(), current);
    return new NextResponse(feedOf(current.all, past), {
      /* kept a few minutes by the CDN: calendars look hourly, and a phone that subscribes looks at once */
      headers: { ...type, 'Cache-Control': 'public, max-age=0, s-maxage=300, stale-while-revalidate=600' },
    });
  } catch (e) {
    /* an error, not an empty calendar: a subscribed calendar keeps what it has on a failed look, and would empty itself on an empty answer */
    console.error('[kvold/dagatal] the nights could not be read:', e instanceof Error ? e.message : e);
    return new NextResponse('Náði ekki í kvöldin núna.', { status: 503, headers: { 'Cache-Control': 'no-store', 'Retry-After': '300' } });
  }
}

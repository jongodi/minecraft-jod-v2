import { NextResponse } from 'next/server';
import { currentNights } from '@/lib/play-night';
import { icsOf } from '@/lib/night-ics';

export const dynamic = 'force-dynamic';

/* A play night as a calendar entry: /kvold/<id>/dagatal.ics opens in the
   phone's calendar, once the night's time is chosen (src/lib/night-ics.ts). */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!process.env.REDIS_URL) return new NextResponse('Ekkert kvöld.', { status: 404 });
  let ics: string | null = null;
  try {
    const { shown } = await currentNights();
    const cur = shown.find(s => s.night.id === id);
    ics = cur ? icsOf(cur.night) : null;
  } catch { /* answered below */ }
  if (!ics) return new NextResponse('Kvöldið fannst ekki, eða tíminn hefur ekki verið valinn enn.', { status: 404 });
  return new NextResponse(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `inline; filename="spilakvold-${id}.ics"`,
      'Cache-Control': 'no-store',
    },
  });
}

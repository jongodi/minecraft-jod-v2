import { NextRequest, NextResponse } from 'next/server';
import { cronAuthorised } from '@/lib/cron';

/* Every five minutes (vercel.json): the letters the play nights owe
   (src/lib/night-mail.ts). Reading the nights also fixes a night whose time
   came to be chosen on its own, so its letter goes out within minutes even
   when nobody has the page open; and from half an hour before a night, those
   who said they'd come get word that the server can be started. A run with
   nothing owed sends nothing. */

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!cronAuthorised(req.headers.get('authorization'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!process.env.REDIS_URL) return NextResponse.json({ mailed: [], skipped: 'REDIS_URL is not set' });
  if (!process.env.RESEND_API_KEY) return NextResponse.json({ mailed: [], skipped: 'RESEND_API_KEY is not set' });

  try {
    const { mailNights } = await import('@/lib/night-mail');
    return NextResponse.json({ mailed: await mailNights() }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error('[cron/nights] the letters did not go:', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'night mail failed' }, { status: 500 });
  }
}

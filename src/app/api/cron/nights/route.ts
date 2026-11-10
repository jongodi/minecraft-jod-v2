import { NextRequest, NextResponse } from 'next/server';
import { cronAuthorised } from '@/lib/cron';

/* Every five minutes (vercel.json): the server's status, and the letters the
   play nights owe (src/lib/night-mail.ts).

   The status is asked live, as a page's poll asks it, so what the status
   check notes is noted while the crew plays with the site closed: who came
   to a fire, each member's "síðast inni" on the roll call, when the server
   last burned, and a new version of the game. It used to be noted only while
   someone had a page open. It also keeps two live answers no more than five
   minutes apart, which is what tells the lantern the server went out
   (src/lib/server-status.ts).

   Reading the nights also fixes a night whose time came to be chosen on its
   own, so its letter goes out within minutes even when nobody has the page
   open; and from half an hour before a night, those who said they'd come
   get word that the server can be started. A run with nothing owed sends
   nothing. */

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!cronAuthorised(req.headers.get('authorization'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!process.env.REDIS_URL) return NextResponse.json({ mailed: [], skipped: 'REDIS_URL is not set' });

  /* in a try of its own: a lookup that fails never stops the letters */
  let status: string | null = null;
  try {
    const { getStatus, noteCrewSeen } = await import('@/lib/server-status');
    const { noteServerVersion } = await import('@/lib/server-news');
    const body = await getStatus();
    await Promise.all([noteCrewSeen(body), noteServerVersion(body)]);
    status = body.life;
  } catch (err) {
    console.error('[cron/nights] the status beat did not run:', err instanceof Error ? err.message : err);
  }

  const headers = { 'Cache-Control': 'no-store' };
  /* Reading the nights is what decides one whose time has come. The letters
     read them, but with no mail set up nothing here did, and a night with
     several times that nobody opened a page for was never chosen, so nobody
     was noted as seen at it. Read here, in a try of its own. */
  if (!process.env.RESEND_API_KEY) {
    try {
      const { currentNights } = await import('@/lib/play-night');
      if (process.env.REDIS_URL) await currentNights();
    } catch (err) {
      console.error('[cron/nights] the nights were not read:', err instanceof Error ? err.message : err);
    }
  }
  if (!process.env.RESEND_API_KEY) return NextResponse.json({ status, mailed: [], skipped: 'RESEND_API_KEY is not set' }, { headers });
  try {
    const { mailNights } = await import('@/lib/night-mail');
    return NextResponse.json({ status, mailed: await mailNights() }, { headers });
  } catch (err) {
    console.error('[cron/nights] the letters did not go:', err instanceof Error ? err.message : err);
    return NextResponse.json({ status, error: 'night mail failed' }, { status: 500 });
  }
}

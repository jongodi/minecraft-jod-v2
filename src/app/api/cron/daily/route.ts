import { NextRequest, NextResponse } from 'next/server';
import { cronAuthorised } from '@/lib/cron';
import { dayOf, saveDay } from '@/lib/daily-stats';
import { readGameStats, setCachedStats } from '@/lib/stats';
import { sweepUnpinned } from '@/lib/crew-sweep';
import { noteShelf } from '@/lib/server-news';

/* The daily job, run by Vercel Cron (vercel.json) once a day around noon in
   Iceland: every crew member's running totals are read off the server and
   kept for the day (src/lib/daily-stats.ts). Noon, so a whole evening, late
   night included, falls between two copies. The server need not be running:
   exaroton hands out a stopped server's files as it does a running one's.

   It also reads the crew's advancements (src/lib/advancements.ts), settles
   the play nights of the evenings before (src/lib/play-night.ts), and sweeps
   out of storage the pictures that went up to a wall's pin slot and were
   never pinned (src/lib/crew-sweep.ts), and looks over the shelf for packs
   that came with a deploy rather than through the admin panel, so the board
   tells them (src/lib/server-news.ts), whatever came of the stats.

   Vercel sends CRON_SECRET as a bearer token; anything else is turned away. */

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  if (!cronAuthorised(req.headers.get('authorization'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const token = process.env.EXAROTON_API_KEY;
  if (!token || !process.env.REDIS_URL) {
    return NextResponse.json({ error: 'EXAROTON_API_KEY and REDIS_URL are needed' }, { status: 503 });
  }

  /* beside the stats rather than after them, and answered with them either way */
  const swept = sweepUnpinned().catch(err => {
    console.error('[cron/daily] could not sweep unpinned pictures:', err instanceof Error ? err.message : err);
    return { error: 'sweep failed' };
  });
  const shelved = noteShelf();
  const answer = async (body: Record<string, unknown>, status = 200) => {
    await shelved;
    return NextResponse.json({ ...body, sweep: await swept }, { status, headers: { 'Cache-Control': 'no-store' } });
  };

  let stats;
  try {
    stats = await readGameStats(token);
  } catch (err) {
    console.error('[cron/daily] could not read the stats:', err instanceof Error ? err.message : err);
    return answer({ error: 'stats unreadable' }, 502);
  }

  const read = Object.keys(stats.counters);
  if (read.length === 0) {
    console.error(`[cron/daily] no stats file could be read${stats.failed.length ? ` (failed: ${stats.failed.join(', ')})` : ''}`);
    return answer({ error: 'no stats read', failed: stats.failed }, 502);
  }

  const now = new Date();
  const day = dayOf(now);
  await saveDay({ day, takenAt: now.toISOString(), counters: stats.counters, failed: stats.failed });
  /* the board's own copy is freshened too, while every file came through */
  if (stats.failed.length === 0) await setCachedStats(stats.players);
  if (stats.failed.length) console.warn(`[cron/daily] ${day}: could not read ${stats.failed.join(', ')}`);

  /* the game's advancements, for the walls and the wanted board (src/lib/advancements.ts) */
  let advancements = null;
  try {
    const { refreshAdvancements } = await import('@/lib/advancements');
    advancements = await refreshAdvancements(token, now);
  } catch (err) {
    console.error('[cron/daily] could not read the advancements:', err instanceof Error ? err.message : err);
  }

  /* the day after a play night: who came, and who said yes and didn't */
  let playNights = null;
  try {
    const { settleNights } = await import('@/lib/play-night');
    playNights = await settleNights();
  } catch (err) {
    console.error('[cron/daily] could not settle the play nights:', err instanceof Error ? err.message : err);
  }

  return answer({ day, read, failed: stats.failed, advancements, playNights });
}

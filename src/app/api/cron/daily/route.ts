import { NextRequest, NextResponse } from 'next/server';
import { dayOf, saveDay } from '@/lib/daily-stats';
import { readGameStats, setCachedStats } from '@/lib/stats';

/* The daily job, run by Vercel Cron (vercel.json) once a day around noon in
   Iceland: every crew member's running totals are read off the server and
   kept for the day (src/lib/daily-stats.ts). Noon, so a whole evening, late
   night included, falls between two copies. The server need not be running:
   exaroton hands out a stopped server's files too, only more slowly, and
   these are a handful of small ones.

   Vercel sends CRON_SECRET as a bearer token; anything else is turned away. */

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** Compared without an early exit, as the admin token is. */
function authorised(header: string | null): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 16 || !header) return false;
  const expected = `Bearer ${secret}`;
  if (header.length !== expected.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) mismatch |= header.charCodeAt(i) ^ expected.charCodeAt(i);
  return mismatch === 0;
}

export async function GET(req: NextRequest) {
  if (!authorised(req.headers.get('authorization'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const token = process.env.EXAROTON_API_KEY;
  if (!token || !process.env.REDIS_URL) {
    return NextResponse.json({ error: 'EXAROTON_API_KEY and REDIS_URL are needed' }, { status: 503 });
  }

  let stats;
  try {
    stats = await readGameStats(token);
  } catch (err) {
    console.error('[cron/daily] could not read the stats:', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'stats unreadable' }, { status: 502 });
  }

  const read = Object.keys(stats.counters);
  if (read.length === 0) {
    console.error(`[cron/daily] no stats file could be read${stats.failed.length ? ` (failed: ${stats.failed.join(', ')})` : ''}`);
    return NextResponse.json({ error: 'no stats read', failed: stats.failed }, { status: 502 });
  }

  const now = new Date();
  const day = dayOf(now);
  await saveDay({ day, takenAt: now.toISOString(), counters: stats.counters, failed: stats.failed });
  /* the board's own copy is freshened too, while every file came through */
  if (stats.failed.length === 0) await setCachedStats(stats.players);
  if (stats.failed.length) console.warn(`[cron/daily] ${day}: could not read ${stats.failed.join(', ')}`);

  return NextResponse.json({ day, read, failed: stats.failed }, { headers: { 'Cache-Control': 'no-store' } });
}

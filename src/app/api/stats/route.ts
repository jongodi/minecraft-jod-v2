// Player stats from Exaroton's file API (reads Minecraft world/stats/*.json)
// When the server is online, fetches live data and caches it to Vercel KV.
// When offline, serves the last cached snapshot with a timestamp.
import { NextResponse } from 'next/server';
import { CREW_USERNAMES } from '@/lib/crew';
import { EMPTY, getCachedStats, readGameStats, readWeek, setCachedStats, withDraws, type StatsResponse } from '@/lib/stats';

export type { PlayerStat, StatsResponse, WeekPlayer, WeekStats } from '@/lib/stats';

export const dynamic = 'force-dynamic';

export async function GET() {
  const token = process.env.EXAROTON_API_KEY;
  /* the week's numbers come from the daily copies, whatever the server says today */
  const week = await readWeek();

  // No API key — try cache, then give up
  if (!token) {
    const cached = await getCachedStats();
    if (cached) {
      return NextResponse.json({
        players: await withDraws(cached.players), source: 'cached', cachedAt: cached.cachedAt, week,
      } satisfies StatsResponse);
    }
    /* no game stats at all, but the board still has the campfire's own charge */
    const draws = await withDraws(CREW_USERNAMES.map(username => ({ username, ...EMPTY })));
    return NextResponse.json({ players: draws.some(p => p.drawMs > 0) ? draws : [], source: 'unavailable', cachedAt: null, week } satisfies StatsResponse);
  }

  try {
    const { players } = await readGameStats(token);

    // Only cache if we got meaningful data
    const now = new Date().toISOString();
    if (players.some(p => p.playTimeTicks > 0 || p.deaths > 0 || p.mobKills > 0)) {
      await setCachedStats(players);
    }

    return NextResponse.json({
      players: await withDraws(players), source: 'live', cachedAt: now, week,
    } satisfies StatsResponse, {
      headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=60' },
    });

  } catch (err) {
    console.error('Stats fetch failed:', err instanceof Error ? err.message : err);

    // Serve last known snapshot if it has real data
    const cached = await getCachedStats();
    if (cached && cached.players.some(p => p.playTimeTicks > 0 || p.deaths > 0 || p.mobKills > 0)) {
      return NextResponse.json({
        players: await withDraws(cached.players), source: 'cached', cachedAt: cached.cachedAt, week,
      } satisfies StatsResponse);
    }

    const draws = await withDraws(CREW_USERNAMES.map(username => ({ username, ...EMPTY })));
    return NextResponse.json({ players: draws.some(p => p.drawMs > 0) ? draws : [], source: 'unavailable', cachedAt: null, week } satisfies StatsResponse);
  }
}

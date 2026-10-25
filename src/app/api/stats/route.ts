// Player stats from Exaroton's file API (reads Minecraft world/stats/*.json)
// When the server is online, fetches live data and caches it to Vercel KV.
// When offline, serves the last cached snapshot with a timestamp.
import { NextResponse } from 'next/server';
import { CREW_USERNAMES } from '@/lib/crew';
import { EMPTY, getCachedStats, readGameStats, readWeek, withCharges, type PlayerStat, type StatsResponse } from '@/lib/stats';
import { keepSnapshot } from '@/lib/stats-snapshot';

export type { PlayerStat, StatsResponse, WeekPlayer, WeekStats } from '@/lib/stats';

/* a member with any charge kept beside the game's numbers: a draw, an advancement first, a call brought home, a night missed */
const hasCharge = (p: PlayerStat) => p.drawMs > 0 || p.firsts > 0 || p.bounties > 0 || p.noShows > 0;

export const dynamic = 'force-dynamic';

/* A fallback answer is kept a minute at the CDN: while exaroton is failing,
   every view of the home page, a wall or the roll call asked it again. */
const FALLBACK = { headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=60' } };

export async function GET() {
  const token = process.env.EXAROTON_API_KEY;
  /* the week's numbers come from the daily copies, whatever the server says
     today: read beside the game's own files rather than before them (it never throws) */
  const weekRead = readWeek();

  // No API key: try cache, then give up
  if (!token) {
    const week = await weekRead;
    const cached = await getCachedStats();
    if (cached) {
      return NextResponse.json({
        players: await withCharges(cached.players), source: 'cached', cachedAt: cached.cachedAt, week,
      } satisfies StatsResponse, FALLBACK);
    }
    /* no game stats at all, but the board still has the charges kept beside them */
    const draws = await withCharges(CREW_USERNAMES.map(username => ({ username, ...EMPTY })));
    return NextResponse.json({ players: draws.some(hasCharge) ? draws : [], source: 'unavailable', cachedAt: null, week } satisfies StatsResponse, FALLBACK);
  }

  try {
    const [read, week] = await Promise.all([readGameStats(token), weekRead]);
    /* a file that could not be read this time is not a member who never played: they keep their last numbers */
    const players = await keepSnapshot(read);
    const now = new Date().toISOString();

    return NextResponse.json({
      players: await withCharges(players), source: 'live', cachedAt: now, week,
    } satisfies StatsResponse, {
      headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=60' },
    });

  } catch (err) {
    console.error('Stats fetch failed:', err instanceof Error ? err.message : err);
    const week = await weekRead;

    // Serve last known snapshot if it has real data
    const cached = await getCachedStats();
    if (cached && cached.players.some(p => p.playTimeTicks > 0 || p.deaths > 0 || p.mobKills > 0)) {
      return NextResponse.json({
        players: await withCharges(cached.players), source: 'cached', cachedAt: cached.cachedAt, week,
      } satisfies StatsResponse, FALLBACK);
    }

    const draws = await withCharges(CREW_USERNAMES.map(username => ({ username, ...EMPTY })));
    return NextResponse.json({ players: draws.some(hasCharge) ? draws : [], source: 'unavailable', cachedAt: null, week } satisfies StatsResponse, FALLBACK);
  }
}

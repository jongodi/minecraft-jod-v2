// Player stats from Exaroton's file API (reads Minecraft world/stats/*.json)
// When the server is online, fetches live data and caches it to Vercel KV.
// When offline, serves the last cached snapshot with a timestamp.
import { NextRequest, NextResponse } from 'next/server';
import { CREW_USERNAMES } from '@/lib/crew';
import { getExarotonServerId } from '@/lib/exaroton';
import { checkRateLimit } from '@/lib/rateLimit';
import { trackHit } from '@/lib/analytics';

export const dynamic = 'force-dynamic';

export interface PlayerStat {
  username:      string;
  deaths:        number;
  mobKills:      number;
  playerKills:   number;
  playTimeTicks: number;
  playTimeHours: number;
  distanceWalked: number; // in cm (Minecraft stat unit)
  itemsCrafted:  number;
}

// Weekly growth: username → { statKey: delta }
export type StatGrowth = Record<string, Partial<Record<keyof PlayerStat, number>>>;

export interface StatsResponse {
  players:  PlayerStat[];
  source:   'live' | 'cached' | 'unavailable';
  cachedAt: string | null;
  growth?:  StatGrowth;
}

const KV_KEY = 'stats:snapshot';

function hasKV(): boolean {
  return !!process.env.REDIS_URL;
}

function todayKey(): string {
  return `stats:snapshot:${new Date().toISOString().slice(0, 10)}`;
}

async function getCachedStats(): Promise<{ players: PlayerStat[]; cachedAt: string } | null> {
  if (!hasKV()) return null;
  try {
    const { rGet } = await import('@/lib/redis');
    return await rGet<{ players: PlayerStat[]; cachedAt: string }>(KV_KEY);
  } catch {
    return null;
  }
}

function weekAgoKey(): string {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return `stats:snapshot:${d.toISOString().slice(0, 10)}`;
}

async function getWeeklyGrowth(current: PlayerStat[]): Promise<StatGrowth | undefined> {
  if (!hasKV()) return undefined;
  try {
    const { rGet } = await import('@/lib/redis');
    const old = await rGet<{ players: PlayerStat[] }>(weekAgoKey());
    if (!old) return undefined;
    const oldMap: Record<string, PlayerStat> = {};
    for (const p of old.players) oldMap[p.username.toLowerCase()] = p;
    const STAT_KEYS: Array<keyof PlayerStat> = ['deaths','mobKills','playTimeHours','distanceWalked','itemsCrafted'];
    const growth: StatGrowth = {};
    for (const p of current) {
      const prev = oldMap[p.username.toLowerCase()];
      if (!prev) continue;
      growth[p.username] = {};
      for (const k of STAT_KEYS) {
        const delta = (p[k] as number) - (prev[k] as number);
        if (delta !== 0) growth[p.username]![k] = delta;
      }
    }
    return growth;
  } catch { return undefined; }
}

async function setCachedStats(players: PlayerStat[]): Promise<void> {
  if (!hasKV()) return;
  try {
    const { rSet, getRedis } = await import('@/lib/redis');
    const now = new Date().toISOString();
    const snapshot = { players, cachedAt: now };
    // Always update the latest snapshot
    await rSet(KV_KEY, snapshot);
    // Store a daily keyed snapshot for historical comparisons (90 day TTL)
    const redis = getRedis();
    const dayKey = todayKey();
    const existing = await redis.exists(dayKey);
    if (!existing) {
      await redis.set(dayKey, JSON.stringify(snapshot), 'EX', 90 * 24 * 3600);
    }
  } catch { /* non-fatal */ }
}

interface MinecraftStatsJson {
  stats?: {
    'minecraft:custom'?:  Record<string, number>;
    'minecraft:crafted'?: Record<string, number>;
  };
}

function extractStats(statsJson: MinecraftStatsJson): Omit<PlayerStat, 'username'> {
  const custom  = statsJson?.stats?.['minecraft:custom'] ?? {};
  const crafted = statsJson?.stats?.['minecraft:crafted'] ?? {};

  const deaths         = custom['minecraft:deaths']        ?? 0;
  const mobKills       = custom['minecraft:mob_kills']     ?? 0;
  const playerKills    = custom['minecraft:player_kills']  ?? 0;
  const playTimeTicks  = custom['minecraft:play_time']     ?? custom['minecraft:play_one_minute'] ?? 0;
  const distanceWalked = custom['minecraft:walk_one_cm']   ?? 0;
  const itemsCrafted   = Object.values(crafted as Record<string, number>).reduce((s, v) => s + (v as number), 0);

  return {
    deaths, mobKills, playerKills, playTimeTicks,
    playTimeHours: Math.floor(playTimeTicks / 20 / 3600),
    distanceWalked, itemsCrafted,
  };
}

export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const { limited } = await checkRateLimit(ip, 'stats', { max: 20, windowSeconds: 60 });
  if (limited) {
    return NextResponse.json({ players: [], source: 'unavailable', cachedAt: null } satisfies StatsResponse, { status: 429 });
  }

  void trackHit('stats');
  const token = process.env.EXAROTON_API_KEY;

  // No API key — try cache, then give up
  if (!token) {
    const cached = await getCachedStats();
    if (cached) {
      return NextResponse.json({
        players: cached.players, source: 'cached', cachedAt: cached.cachedAt,
      } satisfies StatsResponse);
    }
    return NextResponse.json({ players: [], source: 'unavailable', cachedAt: null } satisfies StatsResponse);
  }

  try {
    const id = await getExarotonServerId(token);

    // Fetch the list of stat files
    const listRes = await fetch(
      `https://api.exaroton.com/v1/servers/${id}/files/info/world/players/stats`,
      { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' }
    );
    if (!listRes.ok) throw new Error('stats folder not found');

    const listData = await listRes.json() as { data?: { children?: Array<{ name: string }> } };
    const children = listData.data?.children ?? [];
    const uuidFiles = children
      .map((f) => f.name)
      .filter((f) => /^[0-9a-f-]{36}\.json$/i.test(f));

    // Resolve UUID → username via Mojang API
    const crewUuids: Record<string, string> = {};
    await Promise.all(
      CREW_USERNAMES.map(async (name) => {
        try {
          const res = await fetch(`https://api.mojang.com/users/profiles/minecraft/${name}`, { cache: 'no-store' });
          if (res.ok) {
            const data = await res.json() as { id: string; name: string };
            const uuid = data.id.replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, '$1-$2-$3-$4-$5');
            crewUuids[uuid] = data.name;
          }
        } catch { /* skip */ }
      })
    );

    // Fetch each crew member's stat file
    const players: PlayerStat[] = await Promise.all(
      Object.entries(crewUuids).map(async ([uuid, username]) => {
        if (!uuidFiles.includes(`${uuid}.json`)) {
          return { username, deaths: 0, mobKills: 0, playerKills: 0, playTimeTicks: 0, playTimeHours: 0, distanceWalked: 0, itemsCrafted: 0 };
        }
        try {
          const res = await fetch(
            `https://api.exaroton.com/v1/servers/${id}/files/data/world/players/stats/${uuid}.json`,
            { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' }
          );
          if (!res.ok) throw new Error('file fetch failed');
          return { username, ...extractStats(await res.json() as MinecraftStatsJson) };
        } catch {
          return { username, deaths: 0, mobKills: 0, playerKills: 0, playTimeTicks: 0, playTimeHours: 0, distanceWalked: 0, itemsCrafted: 0 };
        }
      })
    );

    // Only cache if we got meaningful data
    const now = new Date().toISOString();
    if (players.some(p => p.playTimeTicks > 0 || p.deaths > 0 || p.mobKills > 0)) {
      await setCachedStats(players);
    }

    const growth = await getWeeklyGrowth(players);
    return NextResponse.json({
      players, source: 'live', cachedAt: now, growth,
    } satisfies StatsResponse, {
      headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=60' },
    });

  } catch (err) {
    console.error('Stats fetch failed:', err instanceof Error ? err.message : err);

    // Serve last known snapshot if it has real data
    const cached = await getCachedStats();
    if (cached && cached.players.some(p => p.playTimeTicks > 0 || p.deaths > 0 || p.mobKills > 0)) {
      const growth = await getWeeklyGrowth(cached.players);
      return NextResponse.json({
        players: cached.players, source: 'cached', cachedAt: cached.cachedAt, growth,
      } satisfies StatsResponse);
    }

    return NextResponse.json({ players: [], source: 'unavailable', cachedAt: null } satisfies StatsResponse);
  }
}

// Player stats from Exaroton's file API (reads Minecraft world/stats/*.json)
// When the server is online, fetches live data and caches it to Vercel KV.
// When offline, serves the last cached snapshot with a timestamp.
import { NextResponse } from 'next/server';
import { CREW_USERNAMES } from '@/lib/crew';

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

export interface StatsResponse {
  players:  PlayerStat[];
  source:   'live' | 'cached' | 'unavailable';
  cachedAt: string | null; // ISO timestamp of last successful fetch
}

const KV_KEY = 'stats:snapshot';
const SERVER_HOST = 'stebbias.exaroton.me';

function hasKV(): boolean {
  return !!process.env.KV_REST_API_URL;
}

async function getCachedStats(): Promise<{ players: PlayerStat[]; cachedAt: string } | null> {
  if (!hasKV()) return null;
  try {
    const { kv } = await import('@vercel/kv');
    return await kv.get<{ players: PlayerStat[]; cachedAt: string }>(KV_KEY);
  } catch {
    return null;
  }
}

async function setCachedStats(players: PlayerStat[]): Promise<void> {
  if (!hasKV()) return;
  try {
    const { kv } = await import('@vercel/kv');
    await kv.set(KV_KEY, { players, cachedAt: new Date().toISOString() });
  } catch { /* non-fatal */ }
}

async function getServerId(token: string): Promise<string> {
  const envId = process.env.EXAROTON_SERVER_ID;
  if (envId) return envId;

  const res = await fetch('https://api.exaroton.com/v1/servers/', {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error('Exaroton list failed');
  const data = await res.json();
  const match = (data.data as any[]).find((s) => s.address === SERVER_HOST);
  if (!match) throw new Error('Server not found');
  return match.id as string;
}

function extractStats(statsJson: any): Omit<PlayerStat, 'username'> {
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

export async function GET() {
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
    const id = await getServerId(token);

    // Fetch the list of stat files — this will fail if server is offline
    const listRes = await fetch(
      `https://api.exaroton.com/v1/servers/${id}/files/list/?path=world/stats/`,
      { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' }
    );
    if (!listRes.ok) throw new Error('Server offline or stat files unavailable');

    const listData = await listRes.json();
    const files: string[] = (listData.data as any[])?.map((f: any) => f.name as string) ?? [];
    const uuidFiles = files.filter(f => /^[0-9a-f-]{36}\.json$/i.test(f));

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
            `https://api.exaroton.com/v1/servers/${id}/files/data/?path=world/stats/${uuid}.json`,
            { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' }
          );
          if (!res.ok) throw new Error('file fetch failed');
          return { username, ...extractStats(await res.json()) };
        } catch {
          return { username, deaths: 0, mobKills: 0, playerKills: 0, playTimeTicks: 0, playTimeHours: 0, distanceWalked: 0, itemsCrafted: 0 };
        }
      })
    );

    // Save to KV so we have a snapshot for when server is offline
    const now = new Date().toISOString();
    await setCachedStats(players);

    return NextResponse.json({
      players, source: 'live', cachedAt: now,
    } satisfies StatsResponse, {
      headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=60' },
    });

  } catch (err) {
    console.error('Stats fetch failed (server likely offline):', err);

    // Serve last known snapshot
    const cached = await getCachedStats();
    if (cached) {
      return NextResponse.json({
        players: cached.players, source: 'cached', cachedAt: cached.cachedAt,
      } satisfies StatsResponse);
    }

    return NextResponse.json({ players: [], source: 'unavailable', cachedAt: null } satisfies StatsResponse);
  }
}

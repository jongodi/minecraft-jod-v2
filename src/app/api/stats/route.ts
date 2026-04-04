// Player stats from Exaroton's file API (reads Minecraft world/stats/*.json)
// Falls back to empty stats if Exaroton is not configured or stats unavailable.
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
  players: PlayerStat[];
  source:  'exaroton' | 'unavailable';
}

const SERVER_HOST = 'stebbias.exaroton.me';

async function getServerId(token: string): Promise<string> {
  const envId = process.env.EXAROTON_SERVER_ID;
  if (envId) return envId;

  const res = await fetch('https://api.exaroton.com/v1/servers/', {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error('Exaroton list failed');
  const data = await res.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const match = (data.data as any[]).find((s) => s.address === SERVER_HOST);
  if (!match) throw new Error('Server not found');
  return match.id as string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractStats(statsJson: any): Omit<PlayerStat, 'username'> {
  const custom = statsJson?.stats?.['minecraft:custom'] ?? {};
  const crafted = statsJson?.stats?.['minecraft:crafted'] ?? {};

  const deaths        = custom['minecraft:deaths']           ?? 0;
  const mobKills      = custom['minecraft:mob_kills']        ?? 0;
  const playerKills   = custom['minecraft:player_kills']     ?? 0;
  const playTimeTicks = custom['minecraft:play_time']        ?? custom['minecraft:play_one_minute'] ?? 0;
  const distanceWalked= custom['minecraft:walk_one_cm']      ?? 0;
  const itemsCrafted  = Object.values(crafted as Record<string, number>).reduce((sum, v) => sum + (v as number), 0);

  return {
    deaths,
    mobKills,
    playerKills,
    playTimeTicks,
    playTimeHours: Math.floor(playTimeTicks / 20 / 3600),
    distanceWalked,
    itemsCrafted,
  };
}

export async function GET() {
  const token = process.env.EXAROTON_API_KEY;
  if (!token) {
    return NextResponse.json({ players: [], source: 'unavailable' } satisfies StatsResponse);
  }

  try {
    const id = await getServerId(token);

    // Fetch the list of stat files in world/stats/
    const listRes = await fetch(`https://api.exaroton.com/v1/servers/${id}/files/list/?path=world/stats/`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!listRes.ok) throw new Error('Could not list stat files');
    const listData = await listRes.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const files: string[] = (listData.data as any[])?.map((f: any) => f.name as string) ?? [];

    // Filter to UUID-named json files
    const uuidFiles = files.filter(f => /^[0-9a-f-]{36}\.json$/i.test(f));

    // Fetch UUID→name mapping via Mojang API
    // We build a reverse map: uuid → username from our known crew
    const crewUuids: Record<string, string> = {};
    await Promise.all(
      CREW_USERNAMES.map(async (name) => {
        try {
          const res = await fetch(`https://api.mojang.com/users/profiles/minecraft/${name}`, { cache: 'no-store' });
          if (res.ok) {
            const data = await res.json() as { id: string; name: string };
            // Mojang returns UUID without dashes — normalize to dashed form
            const uuid = data.id.replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, '$1-$2-$3-$4-$5');
            crewUuids[uuid] = data.name;
          }
        } catch { /* skip */ }
      })
    );

    // Fetch stats for each UUID we know about
    const players: PlayerStat[] = await Promise.all(
      Object.entries(crewUuids).map(async ([uuid, username]) => {
        const filename = `${uuid}.json`;
        if (!uuidFiles.includes(filename)) {
          return { username, deaths: 0, mobKills: 0, playerKills: 0, playTimeTicks: 0, playTimeHours: 0, distanceWalked: 0, itemsCrafted: 0 };
        }
        try {
          const res = await fetch(`https://api.exaroton.com/v1/servers/${id}/files/data/?path=world/stats/${filename}`, {
            headers: { Authorization: `Bearer ${token}` },
            cache: 'no-store',
          });
          if (!res.ok) throw new Error('file fetch failed');
          const statsJson = await res.json();
          return { username, ...extractStats(statsJson) };
        } catch {
          return { username, deaths: 0, mobKills: 0, playerKills: 0, playTimeTicks: 0, playTimeHours: 0, distanceWalked: 0, itemsCrafted: 0 };
        }
      })
    );

    return NextResponse.json({ players, source: 'exaroton' } satisfies StatsResponse, {
      headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=60' }, // 5 min cache
    });
  } catch (err) {
    console.error('Stats error:', err);
    return NextResponse.json({ players: [], source: 'unavailable' } satisfies StatsResponse);
  }
}

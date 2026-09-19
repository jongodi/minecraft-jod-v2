// Player stats from Exaroton's file API (reads Minecraft world/stats/*.json)
// When the server is online, fetches live data and caches it to Vercel KV.
// When offline, serves the last cached snapshot with a timestamp.
import { NextResponse } from 'next/server';
import { CREW_USERNAMES, readAllProfiles } from '@/lib/crew';
import { getExarotonServerId } from '@/lib/exaroton';

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
  /** ticks since the player last slept in a bed */
  timeSinceRest:  number;
  /** ticks since the player last died */
  timeSinceDeath: number;
  /** cm moved under one's own power: walk, sprint, crouch, climb and swim, averaged over the five */
  travelCm:       number;
  /** damage taken over damage dealt, both in tenths of a heart: the higher, the more of a punching bag */
  damageRatio:    number;
  raidWins:       number;
  recordsPlayed:  number;
  /** the fastest draw at the campfire, in milliseconds; 0 until one is posted. Lower is better. */
  drawMs:         number;
}

const EMPTY: Omit<PlayerStat, 'username'> = {
  deaths: 0, mobKills: 0, playerKills: 0, playTimeTicks: 0, playTimeHours: 0, distanceWalked: 0, itemsCrafted: 0,
  timeSinceRest: 0, timeSinceDeath: 0, travelCm: 0, damageRatio: 0, raidWins: 0, recordsPlayed: 0, drawMs: 0,
};

export interface StatsResponse {
  players:  PlayerStat[];
  source:   'live' | 'cached' | 'unavailable';
  cachedAt: string | null;
}

const KV_KEY = 'stats:snapshot';
const UUID_KEY = 'mojang:uuids';
const UUID_TTL_MS = 24 * 3600_000;

function hasKV(): boolean {
  return !!process.env.REDIS_URL;
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

async function setCachedStats(players: PlayerStat[]): Promise<void> {
  if (!hasKV()) return;
  try {
    const { rSet } = await import('@/lib/redis');
    await rSet(KV_KEY, { players, cachedAt: new Date().toISOString() });
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

  /* moved under one's own power: no horse, boat, elytra or minecart */
  const legs = ['minecraft:walk_one_cm', 'minecraft:sprint_one_cm', 'minecraft:crouch_one_cm', 'minecraft:climb_one_cm', 'minecraft:swim_one_cm'];
  const travelCm = legs.reduce((s, k) => s + (custom[k] ?? 0), 0) / legs.length;
  const dealt = custom['minecraft:damage_dealt'] ?? 0;
  const taken = custom['minecraft:damage_taken'] ?? 0;

  return {
    deaths, mobKills, playerKills, playTimeTicks,
    playTimeHours: Math.floor(playTimeTicks / 20 / 3600),
    distanceWalked, itemsCrafted,
    timeSinceRest:  custom['minecraft:time_since_rest']  ?? 0,
    timeSinceDeath: custom['minecraft:time_since_death'] ?? 0,
    travelCm,
    damageRatio:    dealt > 0 ? taken / dealt : taken > 0 ? taken : 0,
    raidWins:       custom['minecraft:raid_win']    ?? 0,
    recordsPlayed:  custom['minecraft:play_record'] ?? 0,
    drawMs:         0,
  };
}

/** UUID → username for the crew. Mojang is asked once a day, not on every
    request; without Redis the answer lives in the function's memory. */
let memUuids: { at: number; map: Record<string, string> } | null = null;
async function crewUuids(): Promise<Record<string, string>> {
  if (memUuids && Date.now() - memUuids.at < UUID_TTL_MS) return memUuids.map;
  if (hasKV()) {
    try {
      const { rGet } = await import('@/lib/redis');
      const cached = await rGet<{ at: number; map: Record<string, string> }>(UUID_KEY);
      if (cached && Date.now() - cached.at < UUID_TTL_MS && Object.keys(cached.map).length === CREW_USERNAMES.length) {
        memUuids = cached;
        return cached.map;
      }
    } catch { /* ask Mojang */ }
  }
  const map: Record<string, string> = {};
  await Promise.all(
    CREW_USERNAMES.map(async (name) => {
      try {
        const res = await fetch(`https://api.mojang.com/users/profiles/minecraft/${name}`, { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json() as { id: string; name: string };
          const uuid = data.id.replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, '$1-$2-$3-$4-$5');
          map[uuid] = data.name;
        }
      } catch { /* skip */ }
    })
  );
  /* a partial answer is not kept: a name Mojang did not return would stay missing for a day */
  if (Object.keys(map).length === CREW_USERNAMES.length) {
    memUuids = { at: Date.now(), map };
    if (hasKV()) {
      try { const { rSet } = await import('@/lib/redis'); await rSet(UUID_KEY, memUuids); } catch { /* non-fatal */ }
    }
  }
  return map;
}

/** The one charge that comes from the site, not the game: the best draw at
    the campfire, posted from each member's wall. */
async function withDraws(players: PlayerStat[]): Promise<PlayerStat[]> {
  try {
    const best = new Map((await readAllProfiles()).map(p => [p.username.toLowerCase(), p.bestDrawMs ?? 0]));
    return players.map(p => ({ ...p, drawMs: best.get(p.username.toLowerCase()) ?? 0 }));
  } catch {
    return players;
  }
}

export async function GET() {
  const token = process.env.EXAROTON_API_KEY;

  // No API key — try cache, then give up
  if (!token) {
    const cached = await getCachedStats();
    if (cached) {
      return NextResponse.json({
        players: await withDraws(cached.players), source: 'cached', cachedAt: cached.cachedAt,
      } satisfies StatsResponse);
    }
    /* no game stats at all, but the board still has the campfire's own charge */
    const draws = await withDraws(CREW_USERNAMES.map(username => ({ username, ...EMPTY })));
    return NextResponse.json({ players: draws.some(p => p.drawMs > 0) ? draws : [], source: 'unavailable', cachedAt: null } satisfies StatsResponse);
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

    // Fetch each crew member's stat file
    const uuids = await crewUuids();
    const players: PlayerStat[] = await Promise.all(
      Object.entries(uuids).map(async ([uuid, username]) => {
        if (!uuidFiles.includes(`${uuid}.json`)) {
          return { username, ...EMPTY };
        }
        try {
          const res = await fetch(
            `https://api.exaroton.com/v1/servers/${id}/files/data/world/players/stats/${uuid}.json`,
            { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' }
          );
          if (!res.ok) throw new Error('file fetch failed');
          return { username, ...extractStats(await res.json() as MinecraftStatsJson) };
        } catch {
          return { username, ...EMPTY };
        }
      })
    );

    // Only cache if we got meaningful data
    const now = new Date().toISOString();
    if (players.some(p => p.playTimeTicks > 0 || p.deaths > 0 || p.mobKills > 0)) {
      await setCachedStats(players);
    }

    return NextResponse.json({
      players: await withDraws(players), source: 'live', cachedAt: now,
    } satisfies StatsResponse, {
      headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=60' },
    });

  } catch (err) {
    console.error('Stats fetch failed:', err instanceof Error ? err.message : err);

    // Serve last known snapshot if it has real data
    const cached = await getCachedStats();
    if (cached && cached.players.some(p => p.playTimeTicks > 0 || p.deaths > 0 || p.mobKills > 0)) {
      return NextResponse.json({
        players: await withDraws(cached.players), source: 'cached', cachedAt: cached.cachedAt,
      } satisfies StatsResponse);
    }

    const draws = await withDraws(CREW_USERNAMES.map(username => ({ username, ...EMPTY })));
    return NextResponse.json({ players: draws.some(p => p.drawMs > 0) ? draws : [], source: 'unavailable', cachedAt: null } satisfies StatsResponse);
  }
}

/* Player stats, read from the Minecraft world through exaroton's file API
   (world/players/stats/<uuid>.json). Shared by /api/stats, which the wanted
   board reads, and /api/cron/daily, which keeps a copy of each day's counters. */
import { CREW_USERNAMES, readAllProfiles } from '@/lib/crew';
import { getExarotonServerId } from '@/lib/exaroton';

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
  /** play nights said yes to and not come to */
  noShows:        number;
}

export const EMPTY: Omit<PlayerStat, 'username'> = {
  deaths: 0, mobKills: 0, playerKills: 0, playTimeTicks: 0, playTimeHours: 0, distanceWalked: 0, itemsCrafted: 0,
  timeSinceRest: 0, timeSinceDeath: 0, travelCm: 0, damageRatio: 0, raidWins: 0, recordsPlayed: 0, drawMs: 0, noShows: 0,
};

export interface StatsResponse {
  players:  PlayerStat[];
  source:   'live' | 'cached' | 'unavailable';
  cachedAt: string | null;
}

const KV_KEY = 'stats:snapshot';
const UUID_KEY = 'mojang:uuids';
const UUID_TTL_MS = 24 * 3600_000;

export function hasKV(): boolean {
  return !!process.env.REDIS_URL;
}

export async function getCachedStats(): Promise<{ players: PlayerStat[]; cachedAt: string } | null> {
  if (!hasKV()) return null;
  try {
    const { rGet } = await import('@/lib/redis');
    return await rGet<{ players: PlayerStat[]; cachedAt: string }>(KV_KEY);
  } catch {
    return null;
  }
}

export async function setCachedStats(players: PlayerStat[]): Promise<void> {
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

export function extractStats(statsJson: MinecraftStatsJson): Omit<PlayerStat, 'username'> {
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
    noShows:        0,
  };
}

/** UUID → username for the crew. Mojang is asked once a day, not on every
    request; without Redis the answer lives in the function's memory. */
let memUuids: { at: number; map: Record<string, string> } | null = null;
export async function crewUuids(): Promise<Record<string, string>> {
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

/** The charges that come from the site, not the game: the best draw at the
    campfire, posted from each member's wall, and the play nights someone
    said they would come to and didn't (src/lib/play-night.ts). */
export async function withDraws(players: PlayerStat[]): Promise<PlayerStat[]> {
  let out = players;
  try {
    const best = new Map((await readAllProfiles()).map(p => [p.username.toLowerCase(), p.bestDrawMs ?? 0]));
    out = out.map(p => ({ ...p, drawMs: best.get(p.username.toLowerCase()) ?? 0 }));
  } catch { /* the draws stay as they were */ }
  if (hasKV()) {
    try {
      const { readNoShows } = await import('@/lib/play-night');
      const tally = new Map(Object.entries(await readNoShows()).map(([u, n]) => [u.toLowerCase(), n]));
      out = out.map(p => ({ ...p, noShows: tally.get(p.username.toLowerCase()) ?? 0 }));
    } catch { /* no tally, no charge */ }
  }
  return out;
}


/** The running totals kept each day, straight from the game: what a week or
    an evening is measured by, as the difference between two days. */
export interface Counters {
  playTimeTicks: number;
  deaths:        number;
  mobKills:      number;
  playerKills:   number;
  /** cm under one's own power, averaged over walk, sprint, crouch, climb and swim, as the board counts it */
  travelCm:      number;
  /** tenths of a heart */
  damageTaken:   number;
  damageDealt:   number;
  raidWins:      number;
  recordsPlayed: number;
}

export function countersOf(statsJson: MinecraftStatsJson): Counters {
  const custom = statsJson?.stats?.['minecraft:custom'] ?? {};
  const s = extractStats(statsJson);
  return {
    playTimeTicks: s.playTimeTicks,
    deaths:        s.deaths,
    mobKills:      s.mobKills,
    playerKills:   s.playerKills,
    travelCm:      s.travelCm,
    damageTaken:   custom['minecraft:damage_taken'] ?? 0,
    damageDealt:   custom['minecraft:damage_dealt'] ?? 0,
    raidWins:      s.raidWins,
    recordsPlayed: s.recordsPlayed,
  };
}

export interface GameStats {
  /** every crew member, as the board shows them (nothing read = all zero) */
  players:  PlayerStat[];
  /** only those whose stats file was read, by username */
  counters: Record<string, Counters>;
  /** crew whose stats file is there but could not be read */
  failed:   string[];
}

/** Reads every crew member's stats file off the server. Throws when the
    server or its stats folder can't be reached at all. */
export async function readGameStats(token: string): Promise<GameStats> {
  const id = await getExarotonServerId(token);
  const headers = { Authorization: `Bearer ${token}` };

  const listRes = await fetch(`https://api.exaroton.com/v1/servers/${id}/files/info/world/players/stats`, { headers, cache: 'no-store' });
  if (!listRes.ok) throw new Error(`stats folder not found (${listRes.status})`);
  const listData = await listRes.json() as { data?: { children?: Array<{ name: string }> } };
  const files = new Set((listData.data?.children ?? []).map(f => f.name).filter(f => /^[0-9a-f-]{36}\.json$/i.test(f)));

  const uuids = await crewUuids();
  const counters: Record<string, Counters> = {};
  const failed: string[] = [];
  const players = await Promise.all(
    Object.entries(uuids).map(async ([uuid, username]): Promise<PlayerStat> => {
      /* never played on this world */
      if (!files.has(`${uuid}.json`)) return { username, ...EMPTY };
      try {
        const res = await fetch(`https://api.exaroton.com/v1/servers/${id}/files/data/world/players/stats/${uuid}.json`, { headers, cache: 'no-store' });
        if (!res.ok) throw new Error(`file fetch failed (${res.status})`);
        const json = await res.json() as MinecraftStatsJson;
        counters[username] = countersOf(json);
        return { username, ...extractStats(json) };
      } catch {
        failed.push(username);
        return { username, ...EMPTY };
      }
    })
  );
  return { players, counters, failed };
}

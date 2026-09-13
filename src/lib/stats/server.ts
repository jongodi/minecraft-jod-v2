import 'server-only';
import type { StatRow } from '@/components/stats/StatsTable';
import { SERVER } from '@/data/server';

/**
 * Player stats read from the world's stats files through Exaroton's file
 * API. Everything is fetched in parallel and cached for five minutes; the
 * Mojang name lookups for a day. Without a token there are no numbers and
 * the section does not render.
 */

const EXAROTON = 'https://api.exaroton.com/v1';
const REVALIDATE = 300;

export interface Stats {
  rows: StatRow[];
  /** When the numbers were read, formatted for the page, or null. */
  asOf: string | null;
}

const EMPTY: Stats = { rows: [], asOf: null };

interface StatsFile {
  stats?: {
    'minecraft:custom'?: Record<string, number>;
    'minecraft:crafted'?: Record<string, number>;
  };
}

function rowFrom(username: string, file: StatsFile): StatRow {
  const custom = file.stats?.['minecraft:custom'] ?? {};
  const crafted = file.stats?.['minecraft:crafted'] ?? {};
  const ticks = custom['minecraft:play_time'] ?? custom['minecraft:play_one_minute'] ?? 0;
  let craftedTotal = 0;
  for (const v of Object.values(crafted)) craftedTotal += v;
  return {
    username,
    hours: Math.floor(ticks / 20 / 3600),
    mobKills: custom['minecraft:mob_kills'] ?? 0,
    deaths: custom['minecraft:deaths'] ?? 0,
    crafted: craftedTotal,
    km: (custom['minecraft:walk_one_cm'] ?? 0) / 100_000,
  };
}

async function uuidFor(name: string): Promise<{ name: string; uuid: string } | null> {
  const res = await fetch(`https://api.mojang.com/users/profiles/minecraft/${encodeURIComponent(name)}`, {
    next: { revalidate: 86400 },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { id: string; name: string };
  const uuid = data.id.replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, '$1-$2-$3-$4-$5');
  return { name: data.name, uuid };
}

async function serverId(token: string): Promise<string> {
  const fromEnv = process.env.EXAROTON_SERVER_ID;
  if (fromEnv) return fromEnv;
  const res = await fetch(`${EXAROTON}/servers/`, {
    headers: { Authorization: `Bearer ${token}` },
    next: { revalidate: 86400 },
  });
  if (!res.ok) throw new Error(`exaroton list ${res.status}`);
  const { data } = (await res.json()) as { data: Array<{ id: string; address: string }> };
  const host = process.env.EXAROTON_SERVER_HOST ?? 'stebbias.exaroton.me';
  const match = data.find((s) => s.address === host);
  if (!match) throw new Error('server not in account');
  return match.id;
}

export async function getStats(): Promise<Stats> {
  const token = process.env.EXAROTON_API_KEY;
  if (!token) return EMPTY;
  try {
    const headers = { Authorization: `Bearer ${token}` };
    const [id, players] = await Promise.all([
      serverId(token),
      Promise.all(SERVER.players.map(uuidFor)),
    ]);
    const rows = await Promise.all(
      players.map(async (p) => {
        if (!p) return null;
        const res = await fetch(`${EXAROTON}/servers/${id}/files/data/world/players/stats/${p.uuid}.json`, {
          headers,
          next: { revalidate: REVALIDATE },
        });
        if (!res.ok) return null;
        return rowFrom(p.name, (await res.json()) as StatsFile);
      }),
    );
    const present = rows.filter((r): r is StatRow => r !== null && r.hours + r.deaths + r.mobKills > 0);
    if (present.length === 0) return EMPTY;
    const asOf = new Intl.DateTimeFormat('is-IS', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Atlantic/Reykjavik' }).format(new Date());
    return { rows: present, asOf };
  } catch {
    return EMPTY;
  }
}

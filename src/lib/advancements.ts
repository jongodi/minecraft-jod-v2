/* The game's own advancements, as the walls and the wanted board show them.

   Each member's file on the server (world/players/advancements/<uuid>.json)
   records the moment every criterion was met. An advancement is dated by the
   last of its criteria, which is when the game called it done: once done, the
   game stops listening for the rest. The daily job (/api/cron/daily) reads
   the crew's files and keeps what is done in Redis; the pages read that copy
   and never the server.

   What each advancement is called, and its frame (task, goal or challenge),
   come from the game itself through scripts/advancements.mjs, in Icelandic
   (src/lib/advancements.json). Recipes, the tabs' roots and anything a
   datapack adds are left out: the site has no name for them. Server only. */
import data from '@/lib/advancements.json';
import { CREW_USERNAMES } from '@/lib/crew-types';

export type Frame = 'task' | 'goal' | 'challenge';

export interface AdvancementDef {
  id:          string;
  tab:         string;
  frame:       Frame;
  title:       string;
  description: string;
  hidden?:     boolean;
}

const DEFS = new Map((data.list as AdvancementDef[]).map(a => [a.id, a]));
/** How many there are to earn, in the version the names were taken from. */
export const ADVANCEMENT_COUNT = DEFS.size;
export const advancementOf = (id: string) => DEFS.get(id) ?? null;

/** A member's done advancements: the advancement's id, and when it was done (ISO). */
export type Done = Record<string, string>;

export interface CrewAdvancements {
  readAt:  string;
  /** by username, as the crew list spells it */
  players: Record<string, Done>;
}

/** "2024-06-01 20:11:02 +0000", as the game writes a moment, in ISO; null for anything else. */
export function gameTime(s: unknown): string | null {
  if (typeof s !== 'string') return null;
  const m = /^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2}) ([+-]\d{2})(\d{2})$/.exec(s);
  if (!m) return null;
  const t = Date.parse(`${m[1]}T${m[2]}${m[3]}:${m[4]}`);
  return Number.isNaN(t) ? null : new Date(t).toISOString();
}

/** What a player's advancements file says is done, each at the moment of its
    last criterion. Only the advancements the site has a name for. */
export function doneOf(file: unknown): Done {
  const done: Done = {};
  if (!file || typeof file !== 'object') return done;
  for (const [id, value] of Object.entries(file as Record<string, unknown>)) {
    if (!DEFS.has(id) || !value || typeof value !== 'object') continue;
    const { done: isDone, criteria } = value as { done?: unknown; criteria?: Record<string, unknown> };
    if (isDone !== true || !criteria) continue;
    const times = Object.values(criteria).map(gameTime).filter((t): t is string => t !== null).sort();
    if (times.length) done[id] = times[times.length - 1];
  }
  return done;
}

/** Who was first to each advancement: the earliest, or all who share that second. */
export function firstsOf(players: Record<string, Done>): Map<string, string[]> {
  const best = new Map<string, { at: string; who: string[] }>();
  for (const [username, done] of Object.entries(players)) {
    for (const [id, at] of Object.entries(done)) {
      const cur = best.get(id);
      if (!cur || at < cur.at) best.set(id, { at, who: [username] });
      else if (at === cur.at) cur.who.push(username);
    }
  }
  return new Map([...best].map(([id, b]) => [id, b.who]));
}

/** How many advancements each member was first of all to. */
export function firstCounts(players: Record<string, Done>): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const who of firstsOf(players).values()) for (const u of who) counts[u] = (counts[u] ?? 0) + 1;
  return counts;
}

/** One advancement on a wall: what it is, when it was done, and whether this member did it first. */
export interface WallAdvancement {
  id:          string;
  title:       string;
  description: string;
  frame:       Frame;
  at:          string;
  first:       boolean;
}

/** A member's advancements as the wall lists them, newest first. */
export function wallAdvancements(username: string, crew: CrewAdvancements | null): WallAdvancement[] {
  if (!crew) return [];
  const key = Object.keys(crew.players).find(u => u.toLowerCase() === username.toLowerCase());
  if (!key) return [];
  const firsts = firstsOf(crew.players);
  return Object.entries(crew.players[key])
    .flatMap(([id, at]) => {
      const def = DEFS.get(id);
      return def ? [{ id, title: def.title, description: def.description, frame: def.frame, at, first: !!firsts.get(id)?.includes(key) }] : [];
    })
    .sort((a, b) => b.at.localeCompare(a.at) || a.title.localeCompare(b.title, 'is'));
}

// ─── the copy in Redis ───────────────────────────────────────────────────────

const KEY = 'adv:crew';

/** The crew's advancements as last read; null without the store, or before the first read. */
export async function readStoredAdvancements(): Promise<CrewAdvancements | null> {
  if (!process.env.REDIS_URL) return null;
  try {
    const { rGet } = await import('@/lib/redis');
    return await rGet<CrewAdvancements>(KEY);
  } catch {
    return null;
  }
}

// ─── reading them off the server ─────────────────────────────────────────────

const WAIT_MS = 8000;
/* where the game keeps them: under players/ from 26.1, in the world's root before */
const FOLDERS = ['world/players/advancements', 'world/advancements'];

/** Reads every crew member's advancements off the server and keeps them. A
    file that could not be read keeps what was read of it before, so a bad
    day never takes anyone's advancements away. Throws when the server's
    files can't be reached at all. */
export async function refreshAdvancements(token: string, now = new Date()): Promise<{ read: string[]; failed: string[] }> {
  const { getExarotonServerId } = await import('@/lib/exaroton');
  const { crewUuids } = await import('@/lib/stats');
  const id = await getExarotonServerId(token);
  const headers = { Authorization: `Bearer ${token}` };
  const api = (path: string) => fetch(`https://api.exaroton.com/v1/servers/${id}/files/${path}`, { headers, cache: 'no-store', signal: AbortSignal.timeout(WAIT_MS) });

  let folder: string | null = null;
  let files = new Set<string>();
  for (const f of FOLDERS) {
    const res = await api(`info/${f}`);
    if (!res.ok) continue;
    const list = await res.json() as { data?: { children?: Array<{ name: string }> } };
    folder = f;
    files = new Set((list.data?.children ?? []).map(c => c.name));
    break;
  }
  if (!folder) throw new Error('advancements folder not found');

  const uuids = await crewUuids();
  /* strict: a copy that could not be read must not be taken for none and written over */
  const { rGetStrict, rSet } = await import('@/lib/redis');
  const before = process.env.REDIS_URL ? await rGetStrict<CrewAdvancements>(KEY) : null;
  const players: Record<string, Done> = { ...(before?.players ?? {}) };
  const read: string[] = [];
  const failed: string[] = [];
  await Promise.all(Object.entries(uuids).map(async ([uuid, username]) => {
    if (!files.has(`${uuid}.json`)) return;   /* never played on this world */
    try {
      const res = await api(`data/${folder}/${uuid}.json`);
      if (!res.ok) throw new Error(String(res.status));
      players[username] = doneOf(await res.json());
      read.push(username);
    } catch {
      failed.push(username);
    }
  }));

  /* only the crew as it stands: a name dropped from the list drops out here too */
  const crew = new Set<string>(CREW_USERNAMES.map(u => u.toLowerCase()));
  const kept = Object.fromEntries(Object.entries(players).filter(([u]) => crew.has(u.toLowerCase())));
  if (read.length > 0 && process.env.REDIS_URL) await rSet(KEY, { readAt: now.toISOString(), players: kept } satisfies CrewAdvancements);
  return { read: read.sort(), failed: failed.sort() };
}

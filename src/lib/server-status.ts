/* The server's status as the site shows it: Exaroton first, the public
   lookup as a fallback. One answer is shared by every visitor for half a
   minute (ten seconds while the server is on its way up or down, a few
   seconds after a failed lookup), so the upstream APIs see a trickle no
   matter how many tabs are open. */
import { CREW_USERNAMES } from '@/lib/crew-types';
import { getExarotonServerId, getServerHost, type ExarotonServer } from '@/lib/exaroton';
import { isChanging, lifeOf, type ServerLife } from '@/lib/server-state';

/** When the server was last seen burning, and the crew who were in then. */
export interface LastOnline { at: string; names: string[] }

export interface StatusResponse {
  online: boolean;
  /** on, off, or on its way between: what the lantern says */
  life: ServerLife;
  /** for a dark lantern: when it last burned, if the store remembers */
  lastOnline?: LastOnline;
  players?: {
    online: number;
    max: number;
    list?: Array<{ name: string; uuid: string }>;
  };
  version?: string;
  motd?: { clean?: string[] };
  icon?: string;
  source: 'exaroton' | 'mcsrvstat' | 'error';
}

const TIMEOUT_MS = 6000;
const CACHE_MS = 30_000;
const CHANGING_CACHE_MS = 10_000;
/* A failed lookup is shared for a few seconds only: long enough to spare the
   upstream a stampede, short enough that one hiccup does not tell every
   visitor for a minute and a half that the server is off. */
const ERROR_CACHE_MS = 5_000;
const DEFAULT_MAX_PLAYERS = 20;

let cached: { at: number; body: StatusResponse } | null = null;

/** How long an answer is kept, by what it says. */
export function keepFor(body: StatusResponse): number {
  if (body.source === 'error') return ERROR_CACHE_MS;
  return isChanging(body.life) ? CHANGING_CACHE_MS : CACHE_MS;
}

export async function getStatus(): Promise<StatusResponse> {
  if (cached && Date.now() - cached.at < keepFor(cached.body)) return cached.body;
  const body = await lookup();
  await rememberLastOnline(body, cached);
  cached = { at: Date.now(), body };
  return body;
}

/** The crew in the player list, by the names in the crew list. */
function crewIn(body: StatusResponse): string[] {
  const crew = new Map<string, string>(CREW_USERNAMES.map(n => [n.toLowerCase(), n]));
  return (body.players?.list ?? []).map(p => crew.get(p.name.toLowerCase())).filter((n): n is string => !!n);
}

const LAST_KEY = 'status:last-online';
/* while the server burns, the store is told every few minutes (or when who is in changes); while it is dark, asked every few minutes */
const LAST_EVERY_MS = 5 * 60_000;
/* what the store holds, as last read or written by this instance */
let lastKnown: { at: number; value: LastOnline | null } | null = null;
const sameNames = (a: string[], b: string[]) => a.length === b.length && a.every(n => b.includes(n));

/** Keeps when the server was last seen burning and who was in, so a dark
    lantern can say so. The moment it goes out is noted from the answer
    before, so the time is good to half a minute. Never holds up or fails
    the answer, and does nothing without the store. */
async function rememberLastOnline(body: StatusResponse, before: { at: number; body: StatusResponse } | null): Promise<void> {
  if (!process.env.REDIS_URL) return;
  const now = Date.now();
  try {
    if (body.online) {
      const names = crewIn(body);
      const held = lastKnown?.value;
      if (lastKnown && now - lastKnown.at < LAST_EVERY_MS && held && sameNames(held.names, names)) return;
      const value: LastOnline = { at: new Date(now).toISOString(), names };
      const { rSet } = await import('@/lib/redis');
      await rSet(LAST_KEY, value);
      lastKnown = { at: now, value };
      return;
    }
    if (before?.body.online) {
      /* it has just gone out: the last answer that saw it burning says when */
      const value: LastOnline = { at: new Date(before.at).toISOString(), names: crewIn(before.body) };
      const { rSet } = await import('@/lib/redis');
      await rSet(LAST_KEY, value);
      lastKnown = { at: now, value };
    } else if (!lastKnown || now - lastKnown.at > LAST_EVERY_MS) {
      const { rGet } = await import('@/lib/redis');
      lastKnown = { at: now, value: await rGet<LastOnline>(LAST_KEY) };
    }
    if (lastKnown.value) body.lastOnline = lastKnown.value;
  } catch { /* the lantern just does not say when */ }
}

/** The site itself just started or stopped the server: the next question goes to Exaroton. */
export function forgetStatus(): void {
  cached = null;
  lastKnown = null;
}

/* During a play night's evening, the crew online are noted as having come
   (src/lib/play-night.ts). Never holds up or fails the answer. */
export async function noteCrewSeen(body: StatusResponse): Promise<void> {
  if (!process.env.REDIS_URL || !body.online) return;
  const names = crewIn(body);
  if (names.length === 0) return;
  try {
    const { noteSeen } = await import('@/lib/play-night');
    await noteSeen(names);
  } catch { /* the status answers regardless */ }
}

async function lookup(): Promise<StatusResponse> {
  if (process.env.EXAROTON_API_KEY) {
    try {
      return await fromExaroton();
    } catch {
      // fall through to mcsrvstat
    }
  }
  return fromMcsrvstat();
}

interface ExarotonServerDetail extends ExarotonServer {
  players?: { count: number; max: number; list?: string[] };
  software?: { id: string; name: string; version: string };
}

async function fromExaroton(): Promise<StatusResponse> {
  const token = process.env.EXAROTON_API_KEY!;
  const id    = await getExarotonServerId(token);

  /* Kept in Next's own data cache for as long as a changing state is kept in
     memory (CHANGING_CACHE_MS), never longer than the memory cache here. An
     explicit no-store would make every page that reads the status render on
     demand instead of on its half-minute schedule (src/app/page.tsx). */
  const res = await fetch(`https://api.exaroton.com/v1/servers/${id}/`, {
    headers: { Authorization: `Bearer ${token}` },
    next: { revalidate: CHANGING_CACHE_MS / 1000 },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error('Exaroton server fetch failed');
  const { data: server } = await res.json() as { data: ExarotonServerDetail };

  const life      = lifeOf(server.status);
  const isOnline  = life === 'on';
  const nameList  = server.players?.list ?? [];

  return {
    online: isOnline,
    life,
    source: 'exaroton',
    ...(server.software?.version && { version: server.software.version }),
    ...(isOnline && {
      players: {
        online: server.players?.count ?? 0,
        max:    server.players?.max ?? DEFAULT_MAX_PLAYERS,
        list:   nameList.map((name) => ({ name, uuid: '' })),
      },
    }),
  };
}

async function fromMcsrvstat(): Promise<StatusResponse> {
  try {
    const res = await fetch(`https://api.mcsrvstat.us/3/${getServerHost()}`, {
      next: { revalidate: CHANGING_CACHE_MS / 1000 },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) throw new Error('mcsrvstat fetch failed');
    const data = await res.json() as Omit<StatusResponse, 'source' | 'life'>;
    /* only what the site reads: the lookup's whole answer (the icon in base64,
       its debug block, the motd as HTML) went out in every status answer */
    return {
      online: !!data.online,
      life: data.online ? 'on' : 'off',
      source: 'mcsrvstat',
      ...(data.version && { version: data.version }),
      ...(data.online && data.players && {
        players: { online: data.players.online ?? 0, max: data.players.max ?? DEFAULT_MAX_PLAYERS, list: (data.players.list ?? []).map(p => ({ name: p.name, uuid: p.uuid ?? '' })) },
      }),
    };
  } catch {
    return { online: false, life: 'unknown', source: 'error' };
  }
}

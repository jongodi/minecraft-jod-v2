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
  /** for a lit lantern: when it was lit, if the store saw it come on */
  onSince?: string;
  /** when the game on the server last moved to a new version (src/lib/server-news.ts), while that is news */
  versionSince?: string;
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

/* `live`: asked of the upstream itself, not of Next's data cache, which
   hands back whatever it last held (however old) and refreshes it behind. */
let cached: { at: number; body: StatusResponse; live: boolean } | null = null;

/** How long an answer is kept, by what it says. */
export function keepFor(body: StatusResponse): number {
  if (body.source === 'error') return ERROR_CACHE_MS;
  return isChanging(body.life) ? CHANGING_CACHE_MS : CACHE_MS;
}

/** The status as the site shows it. The status route asks live (the
    default); the home page's half-minute render passes `live: false` and may
    be answered from Next's data cache, so the page stays static. Only a live
    answer is trusted to say when the server went out, and a page render
    never takes the place of a live answer in memory. */
export async function getStatus({ live = true }: { live?: boolean } = {}): Promise<StatusResponse> {
  if (cached && (cached.live || !live) && Date.now() - cached.at < keepFor(cached.body)) return cached.body;
  const body = await lookup(live);
  await rememberLastOnline(body, live);
  if (live || !cached?.live) cached = { at: Date.now(), body, live };
  return body;
}

/** The crew in the player list, by the names in the crew list. */
function crewIn(body: StatusResponse): string[] {
  const crew = new Map<string, string>(CREW_USERNAMES.map(n => [n.toLowerCase(), n]));
  return (body.players?.list ?? []).map(p => crew.get(p.name.toLowerCase())).filter((n): n is string => !!n);
}

const LAST_KEY = 'status:last-online';
const ON_KEY = 'status:on-since';
/* since when the server burns, as last read or written by this instance */
let onSince: { at: number; value: string | null } | null = null;
/* a new version of the game is news for a week (src/lib/server-news.ts keeps when it moved) */
const VERSION_NEWS_MS = 7 * 24 * 3600_000;
let versionAt: { at: number; value: string | null } | null = null;
async function versionSince(now: number): Promise<string | null> {
  if (!versionAt || now - versionAt.at > LAST_EVERY_MS) {
    const { rGet } = await import('@/lib/redis');
    versionAt = { at: now, value: await rGet<string>('server:version-at') };
  }
  const v = versionAt.value;
  return v && now - Date.parse(v) < VERSION_NEWS_MS ? v : null;
}
/* while the server burns, the store is told every few minutes (or when who is in changes); while it is dark, asked every few minutes */
const LAST_EVERY_MS = 5 * 60_000;
/* what the store holds, as last read or written by this instance */
let lastKnown: { at: number; value: LastOnline | null } | null = null;
const sameNames = (a: string[], b: string[]) => a.length === b.length && a.every(n => b.includes(n));

/* The last live answer any instance had: what the server was doing, when,
   and who was in. */
const LIFE_KEY = 'status:last-life';
interface LastLife { life: ServerLife; at: string; names: string[] }
/* Two live answers this close say what happened between them: two beats of
   the five-minute job (src/app/api/cron/nights) and a minute over. Further
   apart, the server may have gone out and come back with nobody asking. */
const NEAR_MS = 2 * LAST_EVERY_MS + 60_000;

/** Keeps when the server was last seen burning and who was in, so a dark
    lantern can say so, and since when it burns, so a lit one can ("kveikt í
    dag kl. 20:15"). Each live answer is compared with the last live answer
    any instance had, kept in the store with its time. An instance's memory
    of its own answer before saw the server go out only when its two answers
    fell within a minute, which a visitor's poll a minute apart never did,
    so a lit lantern went on saying "kveikt" from an evening days before.
    With the five-minute job asking too, two live answers are never far
    apart, and when they are, no time is said rather than an old one. Never
    holds up or fails the answer, and does nothing without the store. */
async function rememberLastOnline(body: StatusResponse, live: boolean): Promise<void> {
  if (!process.env.REDIS_URL) return;
  const now = Date.now();
  try {
    const { rGet, rSet, rDel } = await import('@/lib/redis');
    /* only a live answer that reached the server says what it is doing: a
       page render's may be the data cache's, however old, and a failed lookup says nothing */
    const told = live && body.source !== 'error' && body.life !== 'unknown';
    const before = told ? await rGet<LastLife>(LIFE_KEY) : null;
    const near = before && now - Date.parse(before.at) <= NEAR_MS ? before : null;
    /* Each write is ordered so that one which fails leaves the lantern
       saying nothing rather than something old: a time is cleared before the
       answer that cleared it is kept, so the next answer clears it again,
       and the answer that sees the server come on is kept before the time. */
    const keep = (names: string[]) => rSet(LIFE_KEY, { life: body.life, at: new Date(now).toISOString(), names } satisfies LastLife);
    if (body.online) {
      if (told && near && near.life !== 'on') {
        /* it has just come on: the answer before saw it dark, or on its way up */
        await keep(crewIn(body));
        const value = new Date(now).toISOString();
        await rSet(ON_KEY, value);
        onSince = { at: now, value };
      } else if (told && !near) {
        /* nothing seen of it for a while, so it may have gone out and come back unseen */
        await rDel(ON_KEY);
        onSince = { at: now, value: null };
        await keep(crewIn(body));
      } else {
        if (told) await keep(crewIn(body));
        if (!onSince || now - onSince.at > LAST_EVERY_MS) onSince = { at: now, value: await rGet<string>(ON_KEY) };
      }
      if (onSince.value) body.onSince = onSince.value;
      body.versionSince = await versionSince(now) ?? undefined;
      /* a page render's answer may be the data cache's; only a live one is noted */
      if (!live) return;
      const names = crewIn(body);
      const held = lastKnown?.value;
      if (lastKnown && now - lastKnown.at < LAST_EVERY_MS && held && sameNames(held.names, names)) return;
      const value: LastOnline = { at: new Date(now).toISOString(), names };
      await rSet(LAST_KEY, value);
      lastKnown = { at: now, value };
      /* and each of them as last seen now (src/lib/crew-seen.ts), for the
         roll call's "síðast inni": at the same beat, every few minutes or
         when who is in changes */
      const { noteSeenNow } = await import('@/lib/crew-seen');
      await noteSeenNow(names, now);
      return;
    }
    body.versionSince = await versionSince(now) ?? undefined;
    if (told) {
      if (near?.life === 'on') {
        /* it has just gone out: the last answer that saw it burning says when, and who was in */
        const value: LastOnline = { at: near.at, names: near.names };
        await rSet(LAST_KEY, value);
        lastKnown = { at: now, value };
      }
      /* Dark, or on its way up or down: whatever it burned since is over.
         The time is cleared when the answer before saw it burn (or there is
         none), and once by each instance besides; after an answer that saw
         it dark, the time was cleared by that one. */
      if (!before || before.life === 'on' || onSince?.value !== null) await rDel(ON_KEY);
      onSince = { at: now, value: null };
      await keep([]);
    }
    if (!lastKnown || now - lastKnown.at > LAST_EVERY_MS) lastKnown = { at: now, value: await rGet<LastOnline>(LAST_KEY) };
    if (lastKnown.value) body.lastOnline = lastKnown.value;
  } catch { /* the lantern just does not say when */ }
}

/** The site itself just started or stopped the server: the next question goes to Exaroton. */
export function forgetStatus(): void {
  cached = null;
  lastKnown = null;
  onSince = null;
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

/* How a lookup reaches the upstream: live, or through Next's data cache for
   as long as a changing state is kept in memory (CHANGING_CACHE_MS). A live
   read on the page would make every page that reads the status render on
   demand instead of on its half-minute schedule (src/app/page.tsx). */
const reach = (live: boolean): RequestInit => (live ? { cache: 'no-store' } : { next: { revalidate: CHANGING_CACHE_MS / 1000 } });

async function lookup(live: boolean): Promise<StatusResponse> {
  if (process.env.EXAROTON_API_KEY) {
    try {
      return await fromExaroton(live);
    } catch {
      // fall through to mcsrvstat
    }
  }
  return fromMcsrvstat(live);
}

interface ExarotonServerDetail extends ExarotonServer {
  players?: { count: number; max: number; list?: string[] };
  software?: { id: string; name: string; version: string };
}

async function fromExaroton(live: boolean): Promise<StatusResponse> {
  const token = process.env.EXAROTON_API_KEY!;
  const id    = await getExarotonServerId(token);

  const res = await fetch(`https://api.exaroton.com/v1/servers/${id}/`, {
    headers: { Authorization: `Bearer ${token}` },
    ...reach(live),
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

async function fromMcsrvstat(live: boolean): Promise<StatusResponse> {
  try {
    const res = await fetch(`https://api.mcsrvstat.us/3/${getServerHost()}`, {
      ...reach(live),
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

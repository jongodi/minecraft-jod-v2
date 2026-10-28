import { promises as fs } from 'fs';
import path from 'path';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { CREW_COOKIE } from '@/lib/auth';
import { CREW_USERNAMES, canonicalUsername, normalizeProfile, type CrewProfile } from '@/lib/crew-types';

export * from '@/lib/crew-types';
export { CREW_COOKIE } from '@/lib/auth';
export { createInvite, consumeInvite, closeInvite, listInvites, inviteUrl, INVITE_TTL, INVITE_USES, type Invite } from '@/lib/crew-access';

// ─── Storage backend ──────────────────────────────────────────────────────────
// Priority order:
//   1. Redis (production) — when REDIS_URL is set
//   2. Local filesystem src/data/profiles — for local dev
//   3. /tmp fallback — if running on Vercel but Redis not yet configured

function hasKV(): boolean {
  return !!process.env.REDIS_URL;
}

function isVercel(): boolean {
  return !!process.env.VERCEL;
}

function profilesDir(): string {
  if (isVercel() && !hasKV()) return '/tmp/jod-profiles';
  return path.join(process.cwd(), 'src', 'data', 'profiles');
}

const profileKey = (username: string) => `crew:profile:${username.toLowerCase()}`;

/** A member's wall, in today's shape whatever was stored. */
export async function readProfile(username: string): Promise<CrewProfile> {
  const name = canonicalUsername(username);

  if (hasKV()) {
    try {
      const { rGet } = await import('./redis');
      return normalizeProfile(await rGet<unknown>(profileKey(name)), name);
    } catch (e) {
      console.error('Redis readProfile error:', e);
      return normalizeProfile(null, name);
    }
  }

  const file = path.join(profilesDir(), `${name.toLowerCase()}.json`);
  try {
    return normalizeProfile(JSON.parse(await fs.readFile(file, 'utf-8')), name);
  } catch {
    return normalizeProfile(null, name);
  }
}

/** Every member's wall, in the crew list's order. With Redis it is one read
    for the lot, and each wall comes out as readProfile would give it: an
    unreadable one is an empty wall, and so is every one when the read fails. */
export async function readAllProfiles(): Promise<CrewProfile[]> {
  if (!hasKV()) return Promise.all(CREW_USERNAMES.map(u => readProfile(u)));
  try {
    const { getRedis } = await import('./redis');
    const raw = await getRedis().mget(...CREW_USERNAMES.map(profileKey));
    return CREW_USERNAMES.map((name, i) => {
      let stored: unknown = null;
      try { stored = raw[i] ? JSON.parse(raw[i]!) : null; } catch { /* an empty wall, as rGet reads it */ }
      return normalizeProfile(stored, name);
    });
  } catch (e) {
    console.error('Redis readAllProfiles error:', e);
    return CREW_USERNAMES.map(name => normalizeProfile(null, name));
  }
}

/** Every member's wall as it is stored, the text itself, unparsed: for the
    sweep of prints nobody pinned (src/lib/crew-sweep.ts), which looks for
    every picture a wall names anywhere in it, old shapes included. Strict,
    unlike the reads above: a store that fails throws, since a wall it could
    not read would look like one with nothing on it. A member with no wall
    yet is an empty string. */
export async function readStoredWalls(): Promise<string[]> {
  if (hasKV()) {
    const { getRedis } = await import('./redis');
    const raw = await getRedis().mget(...CREW_USERNAMES.map(profileKey));
    return raw.map(v => v ?? '');
  }
  return Promise.all(CREW_USERNAMES.map(async name => {
    try { return await fs.readFile(path.join(profilesDir(), `${name.toLowerCase()}.json`), 'utf-8'); }
    catch (e) { if ((e as NodeJS.ErrnoException).code === 'ENOENT') return ''; throw e; }
  }));
}

/* A write goes to a temporary file that is then renamed over the wall, so a
   read that lands mid-write sees the old wall or the new one, never half. */
async function writeProfileFile(clean: CrewProfile): Promise<void> {
  const dir  = profilesDir();
  const file = path.join(dir, `${clean.username.toLowerCase()}.json`);
  await fs.mkdir(dir, { recursive: true });
  const tmp = `${file}.${randomUUID()}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(clean, null, 2) + '\n', 'utf-8');
  await fs.rename(tmp, file);
}

const STORE_READ_ERROR = 'Ekki tókst að lesa vegginn úr geymslunni; reyndu aftur.';
const STORE_WRITE_ERROR = 'Ekki tókst að vista vegginn vegna villu í geymslu.';

/** The store failed, or the wall kept changing under the write: nothing the
    member did, so it is said as it is and answered 503. */
export class StoreError extends Error {}
/** A change refused for a reason the member can act on, thrown from inside
    a change to a wall: its message is theirs to read. */
export class Refusal extends Error {
  constructor(message: string, readonly status = 400) { super(message); }
}

/** The answer to a change that threw: a refusal with its own status, the
    store's trouble as 503, and anything else as the route's own words,
    logged, since its message is the runtime's English. */
export function wallError(e: unknown, fallback: string, where: string): NextResponse {
  if (e instanceof Refusal) return NextResponse.json({ error: e.message }, { status: e.status });
  if (e instanceof StoreError) return NextResponse.json({ error: e.message }, { status: 503 });
  console.error(`${where}:`, e);
  return NextResponse.json({ error: fallback }, { status: 500 });
}

/* Set the wall only if it is still what was read: the stored text is compared
   inside Redis, so two members changing one wall at once cannot both win. */
const COMPARE_AND_SET = `
local cur = redis.call('GET', KEYS[1])
if (cur == false and ARGV[1] == '') or cur == ARGV[1] then
  redis.call('SET', KEYS[1], ARGV[2])
  return 1
end
return 0`;
const CAS_TRIES = 5;

/* File mode (development) has one process, so a promise chain per wall is lock enough. */
const fileLocks = new Map<string, Promise<unknown>>();
function withFileLock<T>(name: string, run: () => Promise<T>): Promise<T> {
  const prev = fileLocks.get(name) ?? Promise.resolve();
  const next = prev.catch(() => {}).then(run);
  fileLocks.set(name, next);
  return next.finally(() => { if (fileLocks.get(name) === next) fileLocks.delete(name); });
}

/** Read, change, write: the one way a wall is changed, so every route keeps the same shape.

    The read here is strict. `readProfile` shows an empty wall when storage
    fails, which is right for a page but would be ruinous here: the change
    would be made to that empty wall and written over the real one. So a
    failed or unreadable read throws instead. A change that alters nothing
    (a lantern on an entry that is gone) writes nothing, and with Redis the
    write only lands if nobody wrote the wall since it was read; otherwise
    the change is made again on the newer wall. `change` may run more than
    once, so it must only touch the profile it is given and its own locals. */
export async function updateProfile(username: string, change: (p: CrewProfile) => void | Promise<void>): Promise<CrewProfile> {
  const name = canonicalUsername(username);

  if (hasKV()) {
    const { getRedis } = await import('./redis');
    const redis = getRedis();
    const key = profileKey(name);
    for (let attempt = 0; attempt < CAS_TRIES; attempt++) {
      let raw: string | null;
      let stored: unknown;
      try {
        raw = await redis.get(key);
        stored = raw === null ? null : JSON.parse(raw);
      } catch (e) {
        console.error('Redis updateProfile read error:', e);
        throw new StoreError(STORE_READ_ERROR);
      }
      const profile = normalizeProfile(stored, name);
      const before = JSON.stringify(profile);
      await change(profile);
      const clean = normalizeProfile(profile, name);
      const after = JSON.stringify(clean);
      if (after === before) return clean;
      let ok: unknown;
      try {
        ok = await redis.eval(COMPARE_AND_SET, 1, key, raw ?? '', after);
      } catch (e) {
        console.error('Redis updateProfile write error:', e);
        throw new StoreError(STORE_WRITE_ERROR);
      }
      if (ok === 1) return clean;
    }
    throw new StoreError('Veggurinn breyttist á meðan; reyndu aftur.');
  }

  return withFileLock(name.toLowerCase(), async () => {
    const file = path.join(profilesDir(), `${name.toLowerCase()}.json`);
    let stored: unknown = null;
    try {
      stored = JSON.parse(await fs.readFile(file, 'utf-8'));
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw new StoreError(STORE_READ_ERROR);
    }
    const profile = normalizeProfile(stored, name);
    const before = JSON.stringify(profile);
    await change(profile);
    const clean = normalizeProfile(profile, name);
    if (JSON.stringify(clean) !== before) await writeProfileFile(clean);
    return clean;
  });
}

// ─── Crew auth ────────────────────────────────────────────────────────────────

export interface CrewSession { username: string }

export function getCrewToken(username: string): string | undefined {
  const key = `CREW_TOKEN_${username.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`;
  return process.env[key];
}

// ─── Session store ────────────────────────────────────────────────────────────
// Redis in production, in-memory map in local dev (no Redis). A session lasts
// a year: signing in is a one-time thing, from a link the admin hands out or
// the token as a fallback.

export const SESSION_TTL = 60 * 60 * 24 * 365;

/* On globalThis: in development every route is compiled on its own and the
   module is evaluated again, which would empty a plain map between routes. */
const g = globalThis as typeof globalThis & { __jodSessions?: Map<string, { username: string; expires: number }> };
const memSessions = (g.__jodSessions ??= new Map());

/* every session a member holds, by name, so they can all be let go at once */
const sessionIndex = (name: string) => `crew-sessions:${name.toLowerCase()}`;

export async function createCrewSession(username: string): Promise<string> {
  const sessionId = randomUUID();
  const name = canonicalUsername(username);
  if (hasKV()) {
    const { getRedis } = await import('./redis');
    await getRedis().multi()
      .set(`crew-session:${sessionId}`, JSON.stringify({ username: name }), 'EX', SESSION_TTL)
      .sadd(sessionIndex(name), sessionId)
      .expire(sessionIndex(name), SESSION_TTL)
      .exec();
  } else {
    memSessions.set(sessionId, { username: name, expires: Date.now() + SESSION_TTL * 1000 });
  }
  return sessionId;
}

export async function deleteCrewSession(sessionId: string): Promise<void> {
  if (hasKV()) {
    const { getRedis, rGet } = await import('./redis');
    const data = await rGet<{ username: string }>(`crew-session:${sessionId}`);
    const redis = getRedis();
    if (data?.username) await redis.multi().del(`crew-session:${sessionId}`).srem(sessionIndex(data.username), sessionId).exec();
    else await redis.del(`crew-session:${sessionId}`);
  } else {
    memSessions.delete(sessionId);
  }
}

/** Every session a member holds is let go, but for `keep` (the one a password
    was just chosen on): a new password, or the admin clearing one, means
    whoever else got in on an old link or password is out. Returns how many went. */
export async function revokeCrewSessions(username: string, keep?: string): Promise<number> {
  const name = canonicalUsername(username);
  if (hasKV()) {
    const { getRedis } = await import('./redis');
    const redis = getRedis();
    const ids = (await redis.smembers(sessionIndex(name))).filter(id => id !== keep);
    if (ids.length === 0) return 0;
    await redis.multi().del(...ids.map(id => `crew-session:${id}`)).srem(sessionIndex(name), ...ids).exec();
    return ids.length;
  }
  let n = 0;
  for (const [id, s] of memSessions) {
    if (id !== keep && s.username.toLowerCase() === name.toLowerCase()) { memSessions.delete(id); n++; }
  }
  return n;
}

/** The id of the session the request carries, for revokeCrewSessions' `keep`. */
export async function currentSessionId(): Promise<string | undefined> {
  try { return (await cookies()).get(CREW_COOKIE)?.value; } catch { return undefined; }
}

/** The signed-in member, or null. A store that cannot be read counts as
    nobody signed in, which is right for drawing a page; `strict` throws a
    StoreError instead, for the one answer that would otherwise sign a
    member out of the page they are on (/api/crew/me). */
export async function getCrewSession({ strict = false }: { strict?: boolean } = {}): Promise<CrewSession | null> {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get(CREW_COOKIE)?.value;
    if (!sessionId) return null;

    if (hasKV()) {
      const { getRedis } = await import('./redis');
      const raw = await getRedis().get(`crew-session:${sessionId}`);
      if (!raw) return null;
      const data = JSON.parse(raw) as { username: string };
      if (!data?.username) return null;
      return { username: canonicalUsername(data.username) };
    } else {
      const session = memSessions.get(sessionId);
      if (!session || Date.now() > session.expires) {
        memSessions.delete(sessionId);
        return null;
      }
      return { username: session.username };
    }
  } catch (e) {
    if (strict) throw new StoreError(e instanceof Error ? e.message : 'session read failed');
    return null;
  }
}

/** The signed-in member, if the session is for `username`'s own wall. */
export async function requireOwner(username: string): Promise<CrewSession | null> {
  const session = await getCrewSession();
  return session && session.username.toLowerCase() === username.toLowerCase() ? session : null;
}

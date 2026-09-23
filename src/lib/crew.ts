import { promises as fs } from 'fs';
import path from 'path';
import { cookies } from 'next/headers';
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

export async function readAllProfiles(): Promise<CrewProfile[]> {
  return Promise.all(CREW_USERNAMES.map(u => readProfile(u)));
}

export async function writeProfile(profile: CrewProfile): Promise<void> {
  const clean = normalizeProfile(profile, profile.username);

  if (hasKV()) {
    try {
      const { rSet } = await import('./redis');
      await rSet(profileKey(clean.username), clean);
      return;
    } catch (e) {
      console.error('Redis writeProfile error:', e);
      throw new Error(STORE_WRITE_ERROR);
    }
  }

  await writeProfileFile(clean);
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
        throw new Error(STORE_READ_ERROR);
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
        throw new Error(STORE_WRITE_ERROR);
      }
      if (ok === 1) return clean;
    }
    throw new Error('Veggurinn breyttist á meðan; reyndu aftur.');
  }

  return withFileLock(name.toLowerCase(), async () => {
    const file = path.join(profilesDir(), `${name.toLowerCase()}.json`);
    let stored: unknown = null;
    try {
      stored = JSON.parse(await fs.readFile(file, 'utf-8'));
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw new Error(STORE_READ_ERROR);
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

export async function createCrewSession(username: string): Promise<string> {
  const sessionId = randomUUID();
  const name = canonicalUsername(username);
  if (hasKV()) {
    const { getRedis } = await import('./redis');
    await getRedis().set(`crew-session:${sessionId}`, JSON.stringify({ username: name }), 'EX', SESSION_TTL);
  } else {
    memSessions.set(sessionId, { username: name, expires: Date.now() + SESSION_TTL * 1000 });
  }
  return sessionId;
}

export async function deleteCrewSession(sessionId: string): Promise<void> {
  if (hasKV()) {
    const { getRedis } = await import('./redis');
    await getRedis().del(`crew-session:${sessionId}`);
  } else {
    memSessions.delete(sessionId);
  }
}

export async function getCrewSession(): Promise<CrewSession | null> {
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
  } catch {
    return null;
  }
}

/** The signed-in member, if the session is for `username`'s own wall. */
export async function requireOwner(username: string): Promise<CrewSession | null> {
  const session = await getCrewSession();
  return session && session.username.toLowerCase() === username.toLowerCase() ? session : null;
}

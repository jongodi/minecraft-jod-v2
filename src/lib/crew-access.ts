// How a member gets in: a password of their own choosing, or a sign-in link
// the admin hands out. Server only.
//
// Passwords are kept apart from the wall itself (a wall is public JSON), as
// scrypt hashes: Redis in production, a small file beside the profiles in
// development. Links are keys with a use count and a life, so one link can
// carry a phone and a laptop, and the admin can close it early.
import { promises as fs } from 'fs';
import path from 'path';
import { randomBytes, scrypt as scryptCb, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
import { canonicalUsername } from '@/lib/crew-types';

const scrypt = promisify(scryptCb);
const hasKV = () => !!process.env.REDIS_URL;

/* ─── passwords ─────────────────────────────────────────────────────────── */

export const PASSWORD_MIN = 6;
export const PASSWORD_MAX = 128;
const KEY_LEN = 64;

/** `scrypt$<salt>$<hash>`, both base64url. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = (await scrypt(password.normalize('NFKC'), salt, KEY_LEN)) as Buffer;
  return `scrypt$${salt.toString('base64url')}$${hash.toString('base64url')}`;
}

export async function verifyPassword(password: string, stored: string | null | undefined): Promise<boolean> {
  if (!stored) return false;
  const [scheme, saltB64, hashB64] = stored.split('$');
  if (scheme !== 'scrypt' || !saltB64 || !hashB64) return false;
  const expected = Buffer.from(hashB64, 'base64url');
  const got = (await scrypt(password.normalize('NFKC'), Buffer.from(saltB64, 'base64url'), expected.length)) as Buffer;
  return got.length === expected.length && timingSafeEqual(got, expected);
}

/** What is wrong with a password someone wants to set, or null if nothing. */
export function passwordProblem(password: unknown): string | null {
  if (typeof password !== 'string') return 'Lykilorðið verður að vera texti.';
  if (password.length < PASSWORD_MIN) return `Lykilorðið þarf að vera minnst ${PASSWORD_MIN} stafir.`;
  if (password.length > PASSWORD_MAX) return `Lykilorðið má mest vera ${PASSWORD_MAX} stafir.`;
  return null;
}

const passwordsFile = () => path.join(process.env.VERCEL && !hasKV() ? '/tmp/jod-profiles' : path.join(process.cwd(), 'src', 'data', 'profiles'), '_passwords.json');

async function readPasswordFile(): Promise<Record<string, string>> {
  try { return JSON.parse(await fs.readFile(passwordsFile(), 'utf-8')) as Record<string, string>; }
  catch { return {}; }
}

export async function getPasswordHash(username: string): Promise<string | null> {
  const name = canonicalUsername(username).toLowerCase();
  if (hasKV()) {
    const { getRedis } = await import('./redis');
    return (await getRedis().get(`crew:password:${name}`)) ?? null;
  }
  return (await readPasswordFile())[name] ?? null;
}

/** Set (a hash) or clear (null) a member's password. */
export async function setPasswordHash(username: string, hash: string | null): Promise<void> {
  const name = canonicalUsername(username).toLowerCase();
  if (hasKV()) {
    const { getRedis } = await import('./redis');
    if (hash) await getRedis().set(`crew:password:${name}`, hash);
    else await getRedis().del(`crew:password:${name}`);
    return;
  }
  const all = await readPasswordFile();
  if (hash) all[name] = hash; else delete all[name];
  await fs.mkdir(path.dirname(passwordsFile()), { recursive: true });
  await fs.writeFile(passwordsFile(), JSON.stringify(all, null, 2) + '\n', 'utf-8');
}

export const hasPassword = async (username: string) => (await getPasswordHash(username)) !== null;

/* ─── sign-in links ──────────────────────────────────────────────────────── */

export const INVITE_TTL = 60 * 60 * 24 * 7;
export const INVITE_USES = 5;

export interface Invite {
  key:       string;
  username:  string;
  uses:      number;
  maxUses:   number;
  createdAt: string;
  expiresAt: string;
}

const g = globalThis as typeof globalThis & { __jodInvites?: Map<string, Invite> };
const memInvites = (g.__jodInvites ??= new Map());
const inviteKey = (key: string) => `crew-invite:${key}`;
const userIndex = (username: string) => `crew-invites:${username.toLowerCase()}`;
const KEY_SHAPE = /^[A-Za-z0-9_-]{20,64}$/;

const alive = (inv: Invite | null | undefined): inv is Invite =>
  !!inv && inv.uses < inv.maxUses && Date.parse(inv.expiresAt) > Date.now();

async function readInvite(key: string): Promise<Invite | null> {
  if (!KEY_SHAPE.test(key)) return null;
  if (hasKV()) {
    const { rGet } = await import('./redis');
    return rGet<Invite>(inviteKey(key));
  }
  return memInvites.get(key) ?? null;
}

async function writeInvite(inv: Invite): Promise<void> {
  if (hasKV()) {
    const { getRedis } = await import('./redis');
    const ttl = Math.max(1, Math.ceil((Date.parse(inv.expiresAt) - Date.now()) / 1000));
    await getRedis().set(inviteKey(inv.key), JSON.stringify(inv), 'EX', ttl);
    return;
  }
  memInvites.set(inv.key, inv);
}

export async function createInvite(username: string, maxUses = INVITE_USES): Promise<Invite> {
  const name = canonicalUsername(username);
  const now = Date.now();
  const inv: Invite = {
    key:       randomBytes(24).toString('base64url'),
    username:  name,
    uses:      0,
    maxUses:   Math.max(1, Math.min(50, Math.floor(maxUses))),
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + INVITE_TTL * 1000).toISOString(),
  };
  await writeInvite(inv);
  if (hasKV()) {
    const { getRedis } = await import('./redis');
    await getRedis().multi().rpush(userIndex(name), inv.key).expire(userIndex(name), INVITE_TTL * 2).exec();
  }
  return inv;
}

/** Spend one use of a key. Returns the member it is for, or null if it is
    unknown, closed, used up or past its week. */
export async function consumeInvite(key: string): Promise<string | null> {
  const inv = await readInvite(key);
  if (!alive(inv)) return null;
  inv.uses += 1;
  await writeInvite(inv);
  return inv.username;
}

/** Shut a link before its time: used up on the spot. */
export async function closeInvite(key: string): Promise<boolean> {
  const inv = await readInvite(key);
  if (!inv) return false;
  inv.uses = inv.maxUses;
  await writeInvite(inv);
  return true;
}

/** A member's open links, newest first, for the admin panel. */
export async function listInvites(username: string): Promise<Invite[]> {
  const name = canonicalUsername(username);
  let all: Invite[] = [];
  if (hasKV()) {
    const { getRedis } = await import('./redis');
    const keys = await getRedis().lrange(userIndex(name), 0, -1);
    const found = await Promise.all(keys.map(k => readInvite(k)));
    all = found.filter(alive);
  } else {
    all = Array.from(memInvites.values()).filter(inv => inv.username === name).filter(alive);
  }
  return all.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

/** The link a key is opened with. */
export const inviteUrl = (origin: string, key: string) => `${origin.replace(/\/$/, '')}/api/crew/invite?lykill=${key}`;

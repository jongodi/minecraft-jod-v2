// When each member last looked at the board, so what is new to them is the
// same on their phone and their computer. Redis in production (one hash), a
// small file beside the profiles in development. Only ever moves forward.
// Server only.
import { promises as fs } from 'fs';
import path from 'path';
import { canonicalUsername } from '@/lib/crew-types';

const KEY = 'board:seen';
const hasKV = () => !!process.env.REDIS_URL;
const dataDir = () => (process.env.VERCEL && !hasKV() ? '/tmp/jod-profiles' : path.join(process.cwd(), 'src', 'data', 'profiles'));
const seenFile = () => path.join(dataDir(), '_seen.json');

async function readFile(): Promise<Record<string, string>> {
  try { return JSON.parse(await fs.readFile(seenFile(), 'utf-8')) as Record<string, string>; }
  catch { return {}; }
}

const valid = (v: unknown): string | null => (typeof v === 'string' && !Number.isNaN(Date.parse(v)) ? v : null);

/** When the member last looked; null if never. */
export async function getSeen(username: string): Promise<string | null> {
  const name = canonicalUsername(username).toLowerCase();
  if (hasKV()) {
    const { getRedis } = await import('./redis');
    return valid(await getRedis().hget(KEY, name));
  }
  return valid((await readFile())[name]);
}

/* Move the mark up inside Redis, so two tabs marking at once can never set
   it back: the marks are ISO times in UTC, which compare as text. */
const MOVE_UP = `
local cur = redis.call('HGET', KEYS[1], ARGV[1])
if (not cur) or cur < ARGV[2] then
  redis.call('HSET', KEYS[1], ARGV[1], ARGV[2])
  return ARGV[2]
end
return cur`;

/** Moves the member's mark up to `at` (never past now, never back). Returns the mark kept. */
export async function markSeen(username: string, at: string, now = Date.now()): Promise<string> {
  const name = canonicalUsername(username).toLowerCase();
  const iso = new Date(Math.min(Date.parse(at), now)).toISOString();
  if (hasKV()) {
    const { getRedis } = await import('./redis');
    return String(await getRedis().eval(MOVE_UP, 1, KEY, name, iso));
  }
  const prev = await getSeen(name);
  if (prev && prev >= iso) return prev;
  const all = await readFile();
  all[name] = iso;
  await fs.mkdir(dataDir(), { recursive: true });
  await fs.writeFile(seenFile(), JSON.stringify(all, null, 2) + '\n', 'utf-8');
  return iso;
}

/* When each member was last in the game: noted by the status check while
   the server burns (src/lib/server-status.ts), read by the roll call and the
   crew's room, which say "síðast inni í gær kl. 21:40" under a head that is
   not in. One hash in the store, a member's name to the moment they were
   last seen. Nothing without the store. Server only. */
import { CREW_USERNAMES, canonicalUsername, isCrewUsername } from '@/lib/crew-types';

const SEEN_KEY = 'status:seen';

/** The members in the game now, each noted as seen at `at`. */
export async function noteSeenNow(names: string[], at = Date.now()): Promise<void> {
  const crew = names.filter(n => isCrewUsername(n));
  if (!process.env.REDIS_URL || crew.length === 0) return;
  const iso = new Date(at).toISOString();
  const fields: Record<string, string> = {};
  for (const n of crew) fields[canonicalUsername(n).toLowerCase()] = iso;
  const { getRedis } = await import('@/lib/redis');
  await getRedis().hset(SEEN_KEY, fields);
}

/** Each member's last moment in the game, by their name as the crew list
    spells it; a member never seen is left out. Empty without the store. */
export async function readLastSeen(): Promise<Record<string, string>> {
  if (!process.env.REDIS_URL) return {};
  const { getRedis } = await import('@/lib/redis');
  const raw = await getRedis().hgetall(SEEN_KEY);
  const out: Record<string, string> = {};
  for (const name of CREW_USERNAMES) {
    const v = raw[name.toLowerCase()];
    if (v && !Number.isNaN(Date.parse(v))) out[name] = v;
  }
  return out;
}

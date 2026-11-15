/* Afrek á deginum sjálfum: the crew's advancements read while they play, not
   only with the daily copy at noon. An advancement won at nine in the
   evening used to reach the board, the chat and the member's own toast the
   next day; read on the five-minute job's beat (src/app/api/cron/nights) it
   is there the same evening.

   The read is the daily job's own (refreshAdvancements), ten requests to
   exaroton, so it is not made on every beat: once when one of the crew is
   first seen in, then every half hour while any of them is, and once more
   on the first beat that finds the world empty again, since the game writes
   a player's file as they leave. A world nobody is in is never read.
   What is found is dated by the beat that found it, as the daily copy dates
   its own. A read that fails is left to the next half hour, or to noon. */
import { isCrewUsername } from '@/lib/crew-types';
import type { StatusResponse } from '@/lib/server-status';

/** how long between reads while the crew plays */
export const BEAT_S = 30 * 60;
/** how long the note that someone has been in is kept, should the job itself stop running */
const PLAYING_S = 12 * 3600;
const BEAT_KEY = 'adv:beat';
const PLAYING_KEY = 'adv:playing';

/** How many of the crew a live answer from exaroton shows in the game; null
    for an answer that cannot say (a failed lookup, or the fallback's, which
    lists nobody by name when the server hides them). */
export function crewOnline(body: Pick<StatusResponse, 'source' | 'online' | 'players'>): number | null {
  if (body.source !== 'exaroton') return null;
  if (!body.online) return 0;
  return (body.players?.list ?? []).filter(p => isCrewUsername(p.name)).length;
}

/* one import shared by readers at once: two of a mocked module at the same time hang vitest */
let redisModule: Promise<typeof import('@/lib/redis')> | undefined;
async function redis() {
  redisModule ??= import('@/lib/redis');
  return (await redisModule).getRedis();
}

/** One beat: reads the advancements if this is a beat to read them on.
    'read' when they were, 'idle' when it was not time, 'off' without the
    key or the store. Throws what the read throws. */
export async function advancementsBeat(body: Pick<StatusResponse, 'source' | 'online' | 'players'>, now = new Date()): Promise<'read' | 'idle' | 'off'> {
  const token = process.env.EXAROTON_API_KEY;
  if (!token || !process.env.REDIS_URL) return 'off';
  const crew = crewOnline(body);
  if (crew === null) return 'idle';
  const r = await redis();
  let due: boolean;
  if (crew > 0) {
    await r.set(PLAYING_KEY, now.toISOString(), 'EX', PLAYING_S);
    /* taken by one beat in a half hour, whichever instance runs it */
    due = (await r.set(BEAT_KEY, now.toISOString(), 'EX', BEAT_S, 'NX')) === 'OK';
  } else {
    /* the first beat after the last of them left takes the note with it, so the read is made once */
    due = (await r.del(PLAYING_KEY)) > 0;
  }
  if (!due) return 'idle';
  const { refreshAdvancements } = await import('@/lib/advancements');
  await refreshAdvancements(token, now);
  return 'read';
}

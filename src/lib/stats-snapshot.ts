import { getCachedStats, setCachedStats, type GameStats, type PlayerStat } from '@/lib/stats';

/** The snapshot freshened from a read of the stats files, and the players as
    the board shows them. A member whose file could not be read keeps their
    last numbers rather than zeros. The snapshot (the board's fallback and the
    wall's bounty) is written with them kept, so one name Mojang no longer
    answers for, a member who renamed, does not freeze it for everyone else;
    it is written only when someone's file came through with numbers in it. */
export async function keepSnapshot(read: GameStats): Promise<PlayerStat[]> {
  let players = read.players;
  if (read.failed.length) {
    const last = new Map((await getCachedStats())?.players.map(p => [p.username, p]));
    players = players.map(p => (read.failed.includes(p.username) && last.get(p.username)) || p);
  }
  const anyRead = Object.keys(read.counters).length > 0;
  if (anyRead && players.some(p => p.playTimeTicks > 0 || p.deaths > 0 || p.mobKills > 0)) await setCachedStats(players);
  return players;
}

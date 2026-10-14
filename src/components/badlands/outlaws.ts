/* What each of the crew is wanted for, read off the same numbers and in the
   same order as the wanted board in the crew's room (Wanted.tsx), so the
   roll call and the board never disagree: on each charge the crew are
   ranked by their number (lower first where lower is better), and the one
   on top is that charge's outlaw. */
import { STAT_TABS, isLowerBetter, type StatKey } from './data';

/** One charge as it stands against a member: their place on it and their number. */
export interface Charge { id: StatKey; rank: number; value: number }

export interface Outlaw {
  name: string;
  /** the charge they stand highest on (the board's order breaks a tie); null with nothing against them */
  best: Charge | null;
  /** the charges they are the outlaw of, in the board's order */
  led: StatKey[];
  /** how many charges they are in the top three of */
  top3: number;
}

export type StatRow = { username: string } & Partial<Record<StatKey, number>>;

/** Every member's standing, by name in lower case, and who is most wanted:
    the outlaw of the most charges (then the most places in a top three,
    then the board's own order). Nobody is most wanted on a board with no
    outlaw on it. */
export function outlaws(players: StatRow[]): { byName: Map<string, Outlaw>; mostWanted: string | null } {
  const byName = new Map<string, Outlaw>(players.map(p => [p.username.toLowerCase(), { name: p.username, best: null, led: [], top3: 0 }]));
  for (const tab of STAT_TABS) {
    const low = isLowerBetter(tab.id);
    const rows = players
      .map(p => ({ name: p.username.toLowerCase(), value: p[tab.id] ?? 0 }))
      .filter(r => r.value > 0)
      .sort((a, b) => (low ? a.value - b.value : b.value - a.value));
    rows.forEach((r, i) => {
      const o = byName.get(r.name);
      if (!o) return;
      const rank = i + 1;
      if (rank === 1) o.led.push(tab.id);
      if (rank <= 3) o.top3++;
      if (!o.best || rank < o.best.rank) o.best = { id: tab.id, rank, value: r.value };
    });
  }
  let most: Outlaw | null = null;
  for (const o of byName.values()) {
    if (!o.led.length) continue;
    if (!most || o.led.length > most.led.length || (o.led.length === most.led.length && o.top3 > most.top3)) most = o;
  }
  return { byName, mostWanted: most?.name ?? null };
}

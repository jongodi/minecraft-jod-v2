import RollCall from '@/components/wall/RollCall';
import { STAT_TABS } from '@/components/badlands/data';
import type { StatRow } from '@/components/badlands/outlaws';
import { getCachedStats, withCharges } from '@/lib/stats';

/* The roll call is drawn with the last snapshot of the game's numbers, one
   quick read, so every poster says what its member is wanted for, and the
   most wanted hangs large, at first paint: drawn in the browser, the board
   would have rearranged itself under the visitor a moment in. Kept for five
   minutes; the snapshot itself changes no oftener than the stats are read. */
export const revalidate = 300;

export default async function CrewPage() {
  const snapshot = await getCachedStats().catch(() => null);
  const players = snapshot ? await withCharges(snapshot.players).catch(() => snapshot.players) : null;
  /* only the numbers the posters read, not the whole stat file */
  const rows: StatRow[] | null = players?.map(p => ({
    username: p.username,
    ...Object.fromEntries(STAT_TABS.map(t => [t.id, Number(p[t.id as keyof typeof p]) || 0])),
  })) ?? null;
  return <RollCall initialPlayers={rows} />;
}

import RollCall from '@/components/wall/RollCall';
import { STAT_TABS } from '@/components/badlands/data';
import type { StatRow } from '@/components/badlands/outlaws';
import { getCachedStats, withCharges } from '@/lib/stats';
import { crewSummaries } from '@/lib/crew-summary';
import { viewNights } from '@/lib/play-night-view';

/* The roll call is drawn with the last snapshot of the game's numbers and
   each member's line (their wall's counts, their cover print), two quick
   reads, so every poster says what its member is wanted for, the most
   wanted hangs large with its print, at first paint: drawn in the browser,
   the board would have rearranged itself under the visitor a moment in, and
   its largest paint (that print) came only after the browser had asked. Kept
   for five minutes; the browser asks for the lines afresh on arrival. */
export const revalidate = 300;

export default async function CrewPage() {
  /* and with the next fire: the line about it stands above the posters, and asked for by the browser it came a
     moment in and pushed the whole board down (a layout shift of 0.05 whenever a night was planned) */
  const [snapshot, crew, nights] = await Promise.all([getCachedStats().catch(() => null), crewSummaries().catch(() => null), viewNights(null).catch(() => undefined)]);
  const players = snapshot ? await withCharges(snapshot.players).catch(() => snapshot.players) : null;
  /* only the numbers the posters read, not the whole stat file */
  const rows: StatRow[] | null = players?.map(p => ({
    username: p.username,
    ...Object.fromEntries(STAT_TABS.map(t => [t.id, Number(p[t.id as keyof typeof p]) || 0])),
  })) ?? null;
  return <RollCall initialPlayers={rows} initialCrew={crew} initialNights={nights} />;
}

/* What a wanted poster posts against a member, in one place for the two
   posters that print it: the roll call's (RollCall.tsx) and the member's own,
   larger, at the top of their wall (Wall.tsx). DESIGN.md has the poster
   pressed be the poster arrived at; when each file worked the bounty out for
   itself, the wall went on printing play time after the roll call had moved
   to the charge a member stands highest on, and the two disagreed. Both read
   the same standing (outlaws.ts) through here, so they cannot drift again. */
import { STAT_TABS, type StatKey } from '@/components/badlands/data';
import { outlaws, type Charge, type Outlaw, type StatRow } from '@/components/badlands/outlaws';

export const tabOf = (id: StatKey) => STAT_TABS.find(t => t.id === id)!;

/** The three lines a poster prints under the name (PosterCharge.tsx). */
export interface Posted {
  /** the alias, when they are the charge's outlaw; it is printed in red in place of a place */
  alias: string | null;
  /** their place on the charge when someone else is its outlaw: 2 for "2. sæti"; null on a wall's play time, posted with no standing in hand */
  place: number | null;
  /** the charge itself */
  charge: string;
  /** the bounty: their number on the charge, in its own unit */
  bounty: string;
}

/** What a poster says a member is wanted for, read off the charge they stand highest on. */
export function posted(best: Charge): Posted {
  const tab = tabOf(best.id);
  const led = best.rank === 1;
  return { alias: led ? tab.nick : null, place: led ? null : best.rank, charge: tab.label, bounty: tab.unit(best.value) };
}

/** Where a member stands on the board, read off the crew's numbers the way
    the roll call reads them: the server reads it from the last snapshot, so
    a wall's first paint already posts the bounty the roll call posts (even
    for one who leads nothing, whose standing only the others' numbers can
    say), and the wall reads it again from the live numbers when they come. */
export function standingOf(players: StatRow[], username: string): Outlaw | undefined {
  return outlaws(players).byName.get(username.toLowerCase());
}

/** What a member's own poster posts under their name: the roll call's lines,
    from the standing the server reads for the first paint and the live
    numbers confirm. Where the numbers in hand carry no standing for them,
    their play time under its own charge, so the bounty is never a bare
    number with nothing to say what it counts. */
export function wallPosted(best: Charge | null, playTimeHours: number | null | undefined): Posted | null {
  if (best) return posted(best);
  if (!playTimeHours || playTimeHours <= 0) return null;
  const tab = tabOf('playTimeHours');
  return { alias: null, place: null, charge: tab.label, bounty: tab.unit(playTimeHours) };
}

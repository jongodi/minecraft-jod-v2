/* What a wanted poster posts against a member, in one place for the two
   posters that print it: the roll call's (RollCall.tsx) and the member's own,
   larger, at the top of their wall (Wall.tsx). DESIGN.md has the poster
   pressed be the poster arrived at; when each file worked the bounty out for
   itself, the wall went on printing play time after the roll call had moved
   to the charge a member stands highest on, and the two disagreed. Both read
   the same standing (outlaws.ts) through here, so they cannot drift again. */
import { STAT_TABS, type StatKey } from '@/components/badlands/data';
import type { Charge } from '@/components/badlands/outlaws';

export const tabOf = (id: StatKey) => STAT_TABS.find(t => t.id === id)!;

/** The three lines a poster prints under the name. */
export interface Posted {
  /** the alias, when they are the charge's outlaw; it is printed in red in place of a place */
  alias: string | null;
  /** their place on the charge when someone else is its outlaw: 2 for "2. sæti" */
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

/** The charge a member stands highest on, as far as the charges they lead
    and their own numbers can tell it before the whole crew's numbers have
    come: the first charge they are the outlaw of, in the board's order, is
    the one outlaws() picks for them, since nothing ranks above first and the
    board's order breaks a tie. One who leads nothing stands highest on
    something only the others' numbers can say, so that waits for them. */
export function bestOfLed(led: readonly StatKey[], numbers: Partial<Record<StatKey, number>> | null | undefined): Charge | null {
  const id = led[0];
  const value = id && numbers ? numbers[id] ?? 0 : 0;
  return id && value > 0 ? { id, rank: 1, value } : null;
}

/** The bounty on a member's own poster: the roll call's, and their play time
    only while where they stand is not known yet, so the line is there from
    the first paint and never pushes the poster down when the numbers come. */
export function wallBounty(best: Charge | null, playTimeHours: number | null | undefined): string | null {
  if (best) return posted(best).bounty;
  return playTimeHours && playTimeHours > 0 ? tabOf('playTimeHours').unit(playTimeHours) : null;
}

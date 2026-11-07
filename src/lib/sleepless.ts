/* Who on the crew has not slept: the game sends phantoms after a player who
   has gone three of its days without a bed (minecraft:time_since_rest,
   72000 ticks), and the hero sends two over that member's figure (Mesa.tsx).
   Counted on the server from the stats the page is drawn with, so the number
   rides in the page's markup; the browser only says it. Shared by both. */
import { plural } from '@/lib/format';

/** A day in the game: twenty minutes, at twenty ticks a second. */
export const DAY_TICKS = 24_000;
/** The game's own line: phantoms come for a player three days without rest. */
export const PHANTOM_TICKS = 3 * DAY_TICKS;

/** Each member the phantoms would come for, by their name in lower case, to
    the whole nights they have gone without a bed. Nobody else is named. */
export function sleeplessOf(players: ReadonlyArray<{ username: string; timeSinceRest: number }>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const p of players) {
    if (p.timeSinceRest >= PHANTOM_TICKS) out[p.username.toLowerCase()] = Math.floor(p.timeSinceRest / DAY_TICKS);
  }
  return out;
}

/** "hefur ekki sofið í 4 nætur", in agreement with the number ("í 1 nótt", "í 21 nótt") */
export const awakeWords = (nights: number) => `hefur ekki sofið í ${nights} ${plural(nights, 'nótt', 'nætur')}`;

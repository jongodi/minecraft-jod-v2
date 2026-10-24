/* Kvöldið í tölum: what the game counted of a play night (src/lib/play-night.ts).

   The day after a night, the daily job settles who came from the daily stats
   copies either side of the evening (src/lib/daily-stats.ts). The rest of the
   difference between those two copies is what the evening did: how long the
   crew were in the world, how often they died, what they felled and how far
   they went on their own feet. It is kept with the night, by member, together
   with the advancements those who came were given during the evening, read to
   the minute from the game's own times (src/lib/advancements.ts). The copies
   are taken once a day, so the counts run from the copy before the evening to
   the one after it; the advancements are the evening's alone.

   The page is given a summary (summaryOf): the totals, the night's own
   outlaws in the wanted board's names (Draugur kvöldsins and the rest), and
   the advancements with their titles. */
import { advancementOf, type Done, type Frame } from '@/lib/advancements';
import type { Counters } from '@/lib/stats';

/** What one member did over an evening: the difference between the daily copies either side of it. */
export interface NightTally {
  ticks:    number;
  deaths:   number;
  mobKills: number;
  travelCm: number;
}

/** What the game counted of a night, kept with it once it is settled. */
export interface NightNumbers {
  /** by member who came, as the night spells them, where both copies could be read */
  by: Record<string, NightTally>;
  /** the advancements those who came were given during the evening, in the order they came */
  advancements: { username: string; id: string; at: string }[];
}

type Copy = Record<string, Partial<Counters>>;

const find = <T,>(rec: Record<string, T> | null, name: string): T | undefined =>
  rec ? Object.entries(rec).find(([k]) => k.toLowerCase() === name.toLowerCase())?.[1] : undefined;

/** Each one who came, by what their counters went up between the two copies.
    One missing from either copy is left out, and so is one whose counter went
    down: their stats file was started over, and the difference says nothing. */
export function tallyOf(came: readonly string[], before: Copy | null, after: Copy | null): Record<string, NightTally> {
  const by: Record<string, NightTally> = {};
  for (const name of came) {
    const a = find(before, name);
    const b = find(after, name);
    if (!a || !b) continue;
    const up = (k: 'playTimeTicks' | 'deaths' | 'mobKills' | 'travelCm') => (b[k] ?? 0) - (a[k] ?? 0);
    const tally = { ticks: up('playTimeTicks'), deaths: up('deaths'), mobKills: up('mobKills'), travelCm: up('travelCm') };
    if (Object.values(tally).some(v => v < 0)) continue;
    by[name] = tally;
  }
  return by;
}

/** The advancements those who came were given between `from` and `to` (ms), in the order they came. */
export function eveningAdvancements(came: readonly string[], players: Record<string, Done> | null, from: number, to: number): NightNumbers['advancements'] {
  const list: NightNumbers['advancements'] = [];
  for (const name of came) {
    for (const [id, at] of Object.entries(find(players, name) ?? {})) {
      const t = Date.parse(at);
      if (t >= from && t <= to) list.push({ username: name, id, at });
    }
  }
  return list.sort((a, b) => a.at.localeCompare(b.at) || a.username.localeCompare(b.username));
}

/** The charges a night has an outlaw of, in the wanted board's names. */
const CHARGES = [
  { key: 'deaths',   nick: 'Draugur kvöldsins' },
  { key: 'mobKills', nick: 'Slátrari kvöldsins' },
  { key: 'travelCm', nick: 'Flakkari kvöldsins' },
] as const;

/** A night's numbers as the page shows them. */
export interface NightSummary {
  /** hours in the world, everyone who came together */
  hours:    number;
  deaths:   number;
  mobKills: number;
  travelCm: number;
  /** each charge one member led outright that evening, of two or more counted */
  outlaws:  { nick: string; charge: typeof CHARGES[number]['key']; username: string; value: number }[];
  advancements: { username: string; title: string; description: string; frame: Frame }[];
}

/** The summary of a night's numbers; null when there are none, or nothing came of the evening. */
export function summaryOf(numbers: NightNumbers | null | undefined): NightSummary | null {
  if (!numbers) return null;
  const rows = Object.entries(numbers.by);
  const sum = (k: keyof NightTally) => rows.reduce((s, [, t]) => s + t[k], 0);
  const outlaws: NightSummary['outlaws'] = [];
  if (rows.length >= 2) {
    for (const { key, nick } of CHARGES) {
      const [first, second] = [...rows].sort(([, a], [, b]) => b[key] - a[key]);
      if (first[1][key] > 0 && first[1][key] > second[1][key]) outlaws.push({ nick, charge: key, username: first[0], value: first[1][key] });
    }
  }
  const advancements = numbers.advancements.flatMap(a => {
    const def = advancementOf(a.id);
    return def ? [{ username: a.username, title: def.title, description: def.description, frame: def.frame }] : [];
  });
  const summary = { hours: sum('ticks') / 72000, deaths: sum('deaths'), mobKills: sum('mobKills'), travelCm: sum('travelCm'), outlaws, advancements };
  const told = summary.hours > 0 || summary.deaths > 0 || summary.mobKills > 0 || summary.travelCm > 0 || advancements.length > 0;
  return told ? summary : null;
}

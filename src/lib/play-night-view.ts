/* The play nights as the page shows them (src/lib/play-night.ts), for anyone:
   what /api/playnight answers, and what the home page is drawn with on the
   server so the hero's line is there at first paint. Server only. */
import { MAX_PLANNED, currentNights, decidesAt, heldNights, phaseOf, yesFor, type HeldNight, type NightState, type Phase } from '@/lib/play-night';
import { summaryOf, type NightSummary, type RecordKey } from '@/lib/night-numbers';

export interface PublicNight {
  id: string;
  by: string;
  note: string;
  phase: Phase;
  options: { id: string; at: string; yes: string[] }[];
  /** everyone who has answered, yes or no: a member left off it has not said */
  answered: string[];
  chosen: string | null;
  chosenBy: string | null;
  /** when an unchosen night is decided on its own */
  decidesAt: string;
  startedBy: string | null;
  /** seen during the evening, or settled the day after */
  came: string[];
  /** what the game counted of the evening, once it is settled (src/lib/night-numbers.ts) */
  numbers: NightSummary | null;
}

/** The crew's habit, read off the nights that were held: the weekday and hour most of them fell on. */
export interface NightHabit { weekday: number; hour: number; of: number; total: number }

/** The weekday and hour most held nights fell on (heldNights in
    src/lib/play-night.ts: the annals as well as the fires), once three or
    more have been held and that weekday carries at least a third of them;
    null otherwise. */
export function habitOf(held: HeldNight[]): NightHabit | null {
  if (held.length < 3) return null;
  const byDay = new Map<number, number[]>();
  for (const n of held) {
    const d = new Date(n.at);
    byDay.set(d.getUTCDay(), [...(byDay.get(d.getUTCDay()) ?? []), d.getUTCHours()]);
  }
  const [weekday, hours] = [...byDay.entries()].sort((a, b) => b[1].length - a[1].length)[0];
  if (hours.length * 3 < held.length) return null;
  const sorted = [...hours].sort((a, b) => a - b);
  return { weekday, hour: sorted[sorted.length >> 1], of: hours.length, total: held.length };
}

export interface PlayNightResponse {
  /** those planned, soonest first, then the last one over while its embers glow */
  nights: PublicNight[];
  /** the crew's usual evening, if they have one */
  habit?: NightHabit | null;
  me: string | null;
  /** how many can be planned at once */
  max: number;
}

/** Nothing planned, nobody signed in: the answer without a store, and the fallback. */
export const NO_NIGHTS: PlayNightResponse = { nights: [], me: null, max: MAX_PLANNED };

export const publicOf = ({ night, votes, seen }: NightState, now: number): PublicNight => ({
  id: night.id, by: night.by, note: night.note, phase: phaseOf(night, now),
  options: night.options.map(o => ({ ...o, yes: yesFor(votes, o.id) })),
  answered: Object.keys(votes).sort((a, b) => a.localeCompare(b)),
  chosen: night.chosen, chosenBy: night.chosenBy,
  decidesAt: new Date(decidesAt(night)).toISOString(),
  startedBy: night.startedBy,
  came: night.outcome?.came ?? seen,
  numbers: summaryOf(night.outcome?.numbers),
});

/** The nights as anyone sees them; `me` is the caller's to know, since the
    page is drawn for everyone and only the API knows who is asking. */
export async function viewNights(me: string | null = null, now = Date.now()): Promise<PlayNightResponse> {
  if (!process.env.REDIS_URL) return { ...NO_NIGHTS, me };
  const { all, shown } = await currentNights(now);
  /* every night held, the annals' as well: the night before is in them by the time a weekly night's embers glow */
  const held = await heldNights(all);
  return { nights: shown.map(s => withRecords(publicOf(s, now), held)), me, max: MAX_PLANNED, habit: habitOf(held) };
}

/** The totals a settled night tops every settled night before it on: a Met
    stamp for the slip. Only against nights that were counted, and only where
    there was at least one night before to beat. */
export function withRecords(night: PublicNight, held: HeldNight[]): PublicNight {
  if (!night.numbers) return night;
  const at = Date.parse(night.options.find(o => o.id === night.chosen)?.at ?? night.options[0].at);
  const before = held
    .filter(n => n.id !== night.id && n.numbers && Date.parse(n.at) < at)
    .map(n => ({ came: n.came.length, sum: summaryOf(n.numbers) }))
    .filter((b): b is { came: number; sum: NightSummary } => !!b.sum);
  if (!before.length) return night;
  const best = (k: 'hours' | 'deaths' | 'mobKills' | 'travelCm') => Math.max(...before.map(b => b.sum[k]));
  const records: RecordKey[] = [];
  for (const k of ['hours', 'deaths', 'mobKills', 'travelCm'] as const) if (night.numbers[k] > 0 && night.numbers[k] > best(k)) records.push(k);
  if (night.came.length > Math.max(...before.map(b => b.came))) records.push('came');
  return records.length ? { ...night, numbers: { ...night.numbers, records } } : night;
}

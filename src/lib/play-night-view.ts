/* The play nights as the page shows them (src/lib/play-night.ts), for anyone:
   what /api/playnight answers, and what the home page is drawn with on the
   server so the hero's line is there at first paint. Server only. */
import { MAX_PLANNED, currentNights, decidesAt, phaseOf, yesFor, type NightState, type Phase } from '@/lib/play-night';

export interface PublicNight {
  id: string;
  by: string;
  note: string;
  phase: Phase;
  options: { id: string; at: string; yes: string[] }[];
  chosen: string | null;
  chosenBy: string | null;
  /** when an unchosen night is decided on its own */
  decidesAt: string;
  startedBy: string | null;
  /** seen during the evening, or settled the day after */
  came: string[];
}

export interface PlayNightResponse {
  /** those planned, soonest first, then the last one over while its embers glow */
  nights: PublicNight[];
  me: string | null;
  /** how many can be planned at once */
  max: number;
}

/** Nothing planned, nobody signed in: the answer without a store, and the fallback. */
export const NO_NIGHTS: PlayNightResponse = { nights: [], me: null, max: MAX_PLANNED };

export const publicOf = ({ night, votes, seen }: NightState, now: number): PublicNight => ({
  id: night.id, by: night.by, note: night.note, phase: phaseOf(night, now),
  options: night.options.map(o => ({ ...o, yes: yesFor(votes, o.id) })),
  chosen: night.chosen, chosenBy: night.chosenBy,
  decidesAt: new Date(decidesAt(night)).toISOString(),
  startedBy: night.startedBy,
  came: night.outcome?.came ?? seen,
});

/** The nights as anyone sees them; `me` is the caller's to know, since the
    page is drawn for everyone and only the API knows who is asking. */
export async function viewNights(me: string | null = null, now = Date.now()): Promise<PlayNightResponse> {
  if (!process.env.REDIS_URL) return { ...NO_NIGHTS, me };
  const { shown } = await currentNights(now);
  return { nights: shown.map(s => publicOf(s, now)), me, max: MAX_PLANNED };
}

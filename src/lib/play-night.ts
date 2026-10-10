/* Næsta spilakvöld: a play night, lit as a fire.

   A crew member lights one with up to three possible times and a line of
   text; the others answer each time they can make (none: kemst ekki). The
   proposer can choose the night; otherwise the leading time is fixed three
   hours before the earliest one, a tie going to the earliest, and a fire
   nobody answered goes out. From half an hour before the chosen time those
   who said yes can start the server. Who came is seen live (the status check
   notes the crew online during the evening) and, the next day, from the
   daily stats copy: anyone whose play time went up that evening came. Those
   who said yes and didn't are counted on the wanted board as Svikarinn; one
   whose stats could not be read is given the benefit of the doubt.

   Up to five nights can be planned at once, as far as a year ahead, as long
   as no two fall on the same evening (who was seen, and who didn't come,
   would be counted twice). The nights are one Redis hash, a night to a field,
   each night's answers a hash of its own and who was seen a set, so two
   people answering or lighting at once can't write over each other. Nothing
   runs on a timer: the phase is worked out from the clock whenever the
   nights are read, and choosing a night is saved then. */

export const MAX_OPTIONS = 3;
/** nights planned at once: lit and not yet over */
export const MAX_PLANNED = 5;
export const MAX_NOTE = 80;
/** the leading time is fixed this long before the earliest one */
export const CHOOSE_BEFORE_MS = 3 * 3600_000;
/** those who said yes can start the server this long before */
export const START_BEFORE_MS = 30 * 60_000;
/** an evening lasts this long, for who was seen and when it is over */
export const EVENING_MS = 6 * 3600_000;
/** embers are shown this long after the evening, unless a new fire is lit */
export const EMBERS_MS = 7 * 24 * 3600_000;
/** how far ahead a time may be: a year, so a night can be planned for any date */
export const AHEAD_MS = 366 * 24 * 3600_000;

export interface NightOption { id: string; at: string }

export interface Night {
  id:        string;
  by:        string;
  createdAt: string;
  note:      string;
  options:   NightOption[];
  chosen:    string | null;
  /** 'auto' when the leading time was fixed on its own */
  chosenBy:  string | null;
  cancelled: boolean;
  startedBy: string | null;
  /** filled in the day after, by the daily job */
  outcome:   { came: string[]; noShows: string[] } | null;
}

/** username → the option ids they can make; [] is kemst ekki */
export type Votes = Record<string, string[]>;

export type Phase = 'open' | 'chosen' | 'soon' | 'live' | 'over';

export const optionOf = (night: Night, id: string | null) => night.options.find(o => o.id === id) ?? null;
const t = (iso: string) => new Date(iso).getTime();

export function yesFor(votes: Votes, optionId: string): string[] {
  return Object.entries(votes).filter(([, ids]) => ids.includes(optionId)).map(([u]) => u).sort((a, b) => a.localeCompare(b));
}

/** The time most can make; a tie goes to the earliest. Null when nobody can make any. */
export function leader(night: Night, votes: Votes): NightOption | null {
  let best: NightOption | null = null;
  let most = 0;
  for (const o of [...night.options].sort((a, b) => t(a.at) - t(b.at))) {
    const n = yesFor(votes, o.id).length;
    if (n > most) { best = o; most = n; }
  }
  return best;
}

/** When an unchosen night is decided: three hours before its earliest time. */
export const decidesAt = (night: Night) => Math.min(...night.options.map(o => t(o.at))) - CHOOSE_BEFORE_MS;

/** What choosing on its own would do now: the option to fix, 'out' for a fire
    nobody answered, or null while it isn't time yet (or it is already chosen). */
export function autoChoice(night: Night, votes: Votes, now: number): NightOption | 'out' | null {
  if (night.chosen || night.cancelled || now < decidesAt(night)) return null;
  return leader(night, votes) ?? 'out';
}

export function phaseOf(night: Night, now: number): Phase {
  const chosen = optionOf(night, night.chosen);
  if (!chosen) return 'open';
  const at = t(chosen.at);
  if (now < at - START_BEFORE_MS) return 'chosen';
  if (now < at) return 'soon';
  if (now < at + EVENING_MS) return 'live';
  return 'over';
}

/** Still something to show: not put out, and not embers older than a week. */
export function isShown(night: Night, now: number): boolean {
  if (night.cancelled) return false;
  const chosen = optionOf(night, night.chosen);
  return !chosen || now < t(chosen.at) + EVENING_MS + EMBERS_MS;
}

/** Lit and not yet over: one of the nights on the calendar. */
export const isPlanned = (night: Night, now: number) => !night.cancelled && phaseOf(night, now) !== 'over';

/** When a night is, for putting nights in order: its chosen time, or its earliest. */
export const whenOf = (night: Night) => t(optionOf(night, night.chosen)?.at ?? night.options.reduce((a, b) => (t(a.at) <= t(b.at) ? a : b)).at);

/** The times a planned night still holds: the chosen one, or every one offered. */
const heldTimes = (night: Night) => (night.chosen ? [optionOf(night, night.chosen)!] : night.options).map(o => t(o.at));

/** A planned night falling on the same evening as one of these times, if any. */
export function clashOf(nights: Night[], at: string[], now: number): Night | null {
  const ms = at.map(t);
  return nights.find(n => isPlanned(n, now) && heldTimes(n).some(h => ms.some(m => Math.abs(m - h) < EVENING_MS))) ?? null;
}

/** The nights as the page shows them: those planned, soonest first, then the
    last one over while its embers glow. */
export function shownNights(nights: Night[], now: number): Night[] {
  const planned = nights.filter(n => isPlanned(n, now)).sort((a, b) => whenOf(a) - whenOf(b));
  const embers = nights.filter(n => !n.cancelled && !isPlanned(n, now) && isShown(n, now)).sort((a, b) => whenOf(b) - whenOf(a))[0];
  return embers ? [...planned, embers] : planned;
}

/** Checks a proposal's times: 1 to 3, from a quarter of an hour ahead to a year, at least half an hour apart. */
export function checkTimes(times: unknown, now: number): { error: string } | { at: string[] } {
  if (!Array.isArray(times) || times.length < 1 || times.length > MAX_OPTIONS) return { error: `Einn til ${MAX_OPTIONS} tímar.` };
  const ms: number[] = [];
  for (const v of times) {
    const m = typeof v === 'string' ? Date.parse(v) : NaN;
    if (!Number.isFinite(m)) return { error: 'Ógildur tími.' };
    if (m < now + 15 * 60_000) return { error: 'Tími verður að vera að minnsta kosti korter fram í tímann.' };
    if (m > now + AHEAD_MS) return { error: 'Tími má vera í mesta lagi ár fram í tímann.' };
    ms.push(m);
  }
  ms.sort((a, b) => a - b);
  for (let i = 1; i < ms.length; i++) if (ms[i] - ms[i - 1] < 30 * 60_000) return { error: 'Tímarnir verða að vera að minnsta kosti hálftíma hver frá öðrum.' };
  return { at: ms.map(m => new Date(m).toISOString()) };
}

/** Who came and who said yes but didn't, from who was seen and the daily copies either side of the evening. */
export function outcomeOf(
  yes: string[], seen: string[],
  before: Record<string, { playTimeTicks: number }> | null,
  after: Record<string, { playTimeTicks: number }> | null,
): { came: string[]; noShows: string[] } {
  const lower = (s: string) => s.toLowerCase();
  const seenSet = new Set(seen.map(lower));
  const played = (u: string) => {
    const a = before && Object.entries(before).find(([k]) => lower(k) === lower(u))?.[1];
    const b = after && Object.entries(after).find(([k]) => lower(k) === lower(u))?.[1];
    if (!a || !b) return null;   /* not known: the benefit of the doubt */
    return b.playTimeTicks > a.playTimeTicks;
  };
  const came: string[] = [];
  const noShows: string[] = [];
  const everyone = new Set([...yes, ...seen]);
  for (const u of everyone) {
    const p = played(u);
    if (seenSet.has(lower(u)) || p === true) came.push(u);
    else if (yes.includes(u) && p === false) noShows.push(u);
  }
  const byName = (a: string, b: string) => a.localeCompare(b);
  return { came: came.sort(byName), noShows: noShows.sort(byName) };
}

// ─── storage ─────────────────────────────────────────────────────────────────

const NIGHTS_KEY = 'playnight:nights';
/* where the one night was kept before there could be several; moved over on first read */
const LEGACY_KEY = 'playnight:current';
const votesKey = (id: string) => `playnight:votes:${id}`;
const seenKey = (id: string) => `playnight:seen:${id}`;
export const NO_SHOWS_KEY = 'playnight:noshows';
/** playnight:settled:<id>, set once a night's no-shows are counted */
const SETTLED_PREFIX = 'playnight:settled:';
/* answers and sightings outlive the night by a month, for the day-after count */
const KEEP_S = 45 * 24 * 3600;
/** seconds to keep a night's answers: until its latest evening is over, then the month */
const keepFor = (night: Night, now: number) =>
  KEEP_S + Math.max(0, Math.ceil((Math.max(...night.options.map(o => t(o.at))) + EVENING_MS - now) / 1000));
const DAY = 24 * 3600_000;

async function redis() {
  const { getRedis } = await import('@/lib/redis');
  return getRedis();
}

export async function readNights(): Promise<Night[]> {
  const r = await redis();
  const legacy = await r.get(LEGACY_KEY);
  if (legacy) {
    try { await r.hset(NIGHTS_KEY, (JSON.parse(legacy) as Night).id, legacy); } catch { /* unreadable: dropped */ }
    await r.del(LEGACY_KEY);
  }
  const nights: Night[] = [];
  for (const v of Object.values(await r.hgetall(NIGHTS_KEY))) { try { nights.push(JSON.parse(v) as Night); } catch { /* skip */ } }
  return nights;
}

export async function writeNight(night: Night): Promise<void> {
  await (await redis()).hset(NIGHTS_KEY, night.id, JSON.stringify(night));
}

function votesOf(raw: Record<string, string>): Votes {
  const votes: Votes = {};
  for (const [u, v] of Object.entries(raw)) { try { votes[u] = JSON.parse(v) as string[]; } catch { /* skip */ } }
  return votes;
}

export async function readVotes(id: string): Promise<Votes> {
  return votesOf(await (await redis()).hgetall(votesKey(id)));
}

export async function writeVote(night: Night, username: string, optionIds: string[], now = Date.now()): Promise<void> {
  const r = await redis();
  await r.hset(votesKey(night.id), username, JSON.stringify(optionIds));
  await r.expire(votesKey(night.id), keepFor(night, now));
}

export async function readSeen(id: string): Promise<string[]> {
  return (await redis()).smembers(seenKey(id));
}

/** Notes crew members online during a chosen night's evening; called by the status check. */
export async function noteSeen(names: string[], now = Date.now()): Promise<void> {
  if (names.length === 0) return;
  const live = (await readNights()).filter(n => !n.cancelled && phaseOf(n, now) === 'live');
  if (live.length === 0) return;
  const r = await redis();
  for (const night of live) {
    await r.sadd(seenKey(night.id), ...names);
    await r.expire(seenKey(night.id), KEEP_S);
  }
}

export async function readNoShows(): Promise<Record<string, number>> {
  const raw = await (await redis()).hgetall(NO_SHOWS_KEY);
  return Object.fromEntries(Object.entries(raw).map(([u, n]) => [u, Number(n) || 0]));
}

export interface NightState { night: Night; votes: Votes; seen: string[] }

/** Every night as it stands now, in the order the page shows them. An
    unchosen night past its time is chosen (or put out) and saved; a night
    put out, or settled and burnt down, is cleared away. */
export async function currentNights(now = Date.now()): Promise<{ all: Night[]; shown: NightState[] }> {
  const r = await redis();
  const read = await readNights();
  /* every night's answers at once, and read once: they were read one night
     after another, then read again for the nights shown */
  const answers = new Map(await Promise.all(read.map(async n => [n.id, votesOf(await r.hgetall(votesKey(n.id)))] as const)));
  const all: Night[] = [];
  for (let night of read) {
    const auto = autoChoice(night, answers.get(night.id) ?? {}, now);
    if (auto === 'out') { night = { ...night, cancelled: true }; await writeNight(night); }
    else if (auto) { night = { ...night, chosen: auto.id, chosenBy: 'auto' }; await writeNight(night); }
    /* an unsettled one is kept for the daily job, unless it never came round in a month */
    const gone = !isShown(night, now) && (night.cancelled || !!night.outcome || now > whenOf(night) + EVENING_MS + 30 * DAY);
    if (gone) { await r.hdel(NIGHTS_KEY, night.id); continue; }
    all.push(night);
  }
  const shown: NightState[] = await Promise.all(shownNights(all, now).map(async night => {
    const phase = phaseOf(night, now);
    const seen = phase === 'live' || phase === 'over' ? await r.smembers(seenKey(night.id)) : [];
    return { night, votes: answers.get(night.id) ?? {}, seen };
  }));
  return { all, shown };
}

/** The day after: once a daily copy taken after a night's evening exists, who
    came and who didn't is settled and the no-shows are counted. */
async function settleOne(night: Night, now: number): Promise<{ id: string; came: string[]; noShows: string[] } | null> {
  const chosen = optionOf(night, night.chosen)!;
  const start = t(chosen.at);
  const end = start + EVENING_MS;

  const { readDay, dayOf } = await import('@/lib/daily-stats');
  /* the last copy taken before the evening began, and the first after it ended */
  const before = [dayOf(new Date(start)), dayOf(new Date(start - DAY))];
  const after = [dayOf(new Date(end)), dayOf(new Date(end + DAY))];
  let copyBefore = null;
  for (const d of before) { const c = await readDay(d); if (c && t(c.takenAt) <= start) { copyBefore = c; break; } }
  let copyAfter = null;
  for (const d of after) { const c = await readDay(d); if (c && t(c.takenAt) >= end) { copyAfter = c; break; } }
  /* the copy after the evening isn't there yet: tomorrow, then */
  if (!copyAfter && now < end + 2 * DAY) return null;

  /* claimed before anything is counted: a daily job delivered twice must not
     charge anyone twice for the same night */
  const r = await redis();
  if (!(await r.set(`${SETTLED_PREFIX}${night.id}`, '1', 'EX', KEEP_S, 'NX'))) return null;
  const votes = await readVotes(night.id);
  const outcome = outcomeOf(yesFor(votes, chosen.id), await readSeen(night.id), copyBefore?.counters ?? null, copyAfter?.counters ?? null);
  await writeNight({ ...night, outcome });
  for (const u of outcome.noShows) await r.hincrby(NO_SHOWS_KEY, u, 1);
  return { id: night.id, ...outcome };
}

/** Settles every night whose evening is over and not yet settled. Called by
    the daily job; returns what it settled (empty if there was nothing to do yet). */
export async function settleNights(now = Date.now()): Promise<{ id: string; came: string[]; noShows: string[] }[]> {
  const done = [];
  for (const night of await readNights()) {
    if (night.cancelled || night.outcome || !night.chosen || phaseOf(night, now) !== 'over') continue;
    const out = await settleOne(night, now);
    if (out) done.push(out);
  }
  return done;
}

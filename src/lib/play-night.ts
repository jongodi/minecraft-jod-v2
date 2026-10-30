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
   nights are read, and choosing a night is saved then.

   A night that was held is kept for good once it leaves the fires: the
   annals (Annáll in the crew's room) hold when it was, who lit it, who said
   they'd come and who came, and what the game counted of the evening
   (src/lib/night-numbers.ts). */

import { eveningAdvancements, tallyOf, type NightNumbers } from '@/lib/night-numbers';
import type { Done } from '@/lib/advancements';

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
  /** when the time was fixed, for the board; left out on nights from before it was kept, and on one lit with a single time */
  chosenAt?: string;
  cancelled: boolean;
  startedBy: string | null;
  /** filled in the day after, by the daily job; the numbers left out on a night settled before they were kept, until the next job counts them */
  outcome:   { came: string[]; noShows: string[]; numbers?: NightNumbers } | null;
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

/** Checks a proposal's times: 1 to 3, from a quarter of an hour ahead to a
    year, at least half an hour apart. With more than one, the first must be
    far enough off for the crew to answer before the night is decided: one
    lit less than three hours ahead was decided the moment it was lit, on the
    proposer's own answer alone. */
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
  if (ms.length > 1 && ms[0] < now + CHOOSE_BEFORE_MS) return { error: 'Með fleiri en einum tíma þarf sá fyrsti að vera minnst þrjá tíma fram í tímann, svo hópurinn nái að svara. Veldu einn tíma eða seinni tíma.' };
  return { at: ms.map(m => new Date(m).toISOString()) };
}

/** A night that has been, as the annals keep it once it leaves the fires. */
export interface PastNight {
  id:        string;
  by:        string;
  note:      string;
  /** the time it was held at */
  at:        string;
  /** who said they would come */
  yes:       string[];
  came:      string[];
  noShows:   string[];
  startedBy: string | null;
  /** what the game counted of the evening, once it is settled */
  numbers?:  NightNumbers;
}

/** What the annals keep of a night: one that was held, settled or not (then
    who was seen stands for who came); nothing of one put out or never chosen. */
export function pastOf(night: Night, votes: Votes, seen: string[]): PastNight | null {
  const chosen = optionOf(night, night.chosen);
  if (night.cancelled || !chosen) return null;
  return {
    id: night.id, by: night.by, note: night.note, at: chosen.at,
    yes: yesFor(votes, chosen.id),
    came: night.outcome?.came ?? [...seen].sort((a, b) => a.localeCompare(b)),
    noShows: night.outcome?.noShows ?? [],
    startedBy: night.startedBy,
    ...(night.outcome?.numbers ? { numbers: night.outcome.numbers } : {}),
  };
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
/** the annals: every night held, by id, kept for good once it leaves the fires */
const PAST_KEY = 'playnight:past';
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

/* A night as it stands is written back only if nobody wrote it since it was
   read; otherwise it is read and changed again. Written whole, a cancel and
   the page's own auto-choice at the decide moment each wrote over the other:
   the fire went out, the put-out letter went, and a visitor's read lit it again. */
const NIGHT_CAS = `
local cur = redis.call('HGET', KEYS[1], ARGV[1])
if (cur or '') ~= ARGV[2] then return 0 end
redis.call('HSET', KEYS[1], ARGV[1], ARGV[3])
return 1
`;
const CAS_TRIES = 4;

/** Changes one night in the store: `change` is given the night as it stands
    now and returns the night as it should be, or null to leave it. May run
    more than once, so it must only read the night it is given. Returns the
    night as it stands after, or null for one that is gone. */
export async function changeNight(id: string, change: (night: Night) => Night | null): Promise<Night | null> {
  const r = await redis();
  for (let attempt = 0; attempt < CAS_TRIES; attempt++) {
    const raw = await r.hget(NIGHTS_KEY, id);
    if (raw === null) return null;
    let night: Night;
    try { night = JSON.parse(raw) as Night; } catch { return null; }
    const next = change(night);
    if (!next) return night;
    const out = JSON.stringify(next);
    if (out === raw) return next;
    if (await r.eval(NIGHT_CAS, 1, NIGHTS_KEY, id, raw, out) === 1) return next;
  }
  throw new Error('Kvöldið breyttist á meðan; reyndu aftur.');
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
    put out, or settled and burnt down, is cleared away, and one that was
    held goes into the annals first (pastNights, below). */
export async function currentNights(now = Date.now()): Promise<{ all: Night[]; shown: NightState[] }> {
  const r = await redis();
  const read = await readNights();
  /* every night's answers at once, and read once: they were read one night
     after another, then read again for the nights shown */
  const answers = new Map(await Promise.all(read.map(async n => [n.id, votesOf(await r.hgetall(votesKey(n.id)))] as const)));
  const all: Night[] = [];
  for (let night of read) {
    if (autoChoice(night, answers.get(night.id) ?? {}, now)) {
      /* decided on the night as it stands in the store, not as it was read: a
         cancel landing in between is kept, and the fire stays out */
      night = await changeNight(night.id, latest => {
        const auto = autoChoice(latest, answers.get(latest.id) ?? {}, now);
        if (auto === 'out') return { ...latest, cancelled: true };
        if (auto) return { ...latest, chosen: auto.id, chosenBy: 'auto', chosenAt: new Date(now).toISOString() };
        return null;
      }) ?? night;
    }
    /* an unsettled one is kept for the daily job, unless it never came round in a month */
    const gone = !isShown(night, now) && (night.cancelled || !!night.outcome || now > whenOf(night) + EVENING_MS + 30 * DAY);
    if (gone) {
      /* written before the night is cleared, so a failed write leaves it to be tried on the next read */
      const past = pastOf(night, answers.get(night.id) ?? {}, night.outcome ? [] : await r.smembers(seenKey(night.id)));
      if (past) await r.hset(PAST_KEY, night.id, JSON.stringify(past));
      await r.hdel(NIGHTS_KEY, night.id);
      continue;
    }
    all.push(night);
  }
  const shown: NightState[] = await Promise.all(shownNights(all, now).map(async night => {
    const phase = phaseOf(night, now);
    const seen = phase === 'live' || phase === 'over' ? await r.smembers(seenKey(night.id)) : [];
    return { night, votes: answers.get(night.id) ?? {}, seen };
  }));
  return { all, shown };
}

/** The annals: every night held that is no longer among the fires the page
    shows, newest first. The kept ones, and any still waiting to be settled.
    `current` is a read of the fires already made (the board's), so they are
    not read and decided twice in one request. */
export async function pastNights(now = Date.now(), current?: { all: Night[]; shown: NightState[] }): Promise<PastNight[]> {
  const { all, shown } = current ?? await currentNights(now);
  const r = await redis();
  const showing = new Set(shown.map(s => s.night.id));
  const kept: PastNight[] = [];
  for (const v of Object.values(await r.hgetall(PAST_KEY))) { try { kept.push(JSON.parse(v) as PastNight); } catch { /* skip */ } }
  /* read on the one client already held: the store is never fetched again for each night at once */
  const waiting = await Promise.all(all
    .filter(n => !showing.has(n.id) && !n.cancelled && phaseOf(n, now) === 'over')
    .map(async n => pastOf(n, votesOf(await r.hgetall(votesKey(n.id))), n.outcome ? [] : await r.smembers(seenKey(n.id)))));
  const ids = new Set(kept.map(p => p.id));
  return [...kept, ...waiting.filter((p): p is PastNight => p !== null && !ids.has(p.id))]
    .sort((a, b) => t(b.at) - t(a.at));
}

/** One night of the annals, for its link; null if it is not there. */
export async function pastNight(id: string): Promise<PastNight | null> {
  return (await pastNights()).find(p => p.id === id) ?? null;
}

/** The last daily copy taken before an evening began, and the first after it ended. */
async function copiesAround(start: number, end: number) {
  const { readDay, dayOf } = await import('@/lib/daily-stats');
  let before = null;
  for (const d of [dayOf(new Date(start)), dayOf(new Date(start - DAY))]) { const c = await readDay(d); if (c && t(c.takenAt) <= start) { before = c; break; } }
  let after = null;
  for (const d of [dayOf(new Date(end)), dayOf(new Date(end + DAY))]) { const c = await readDay(d); if (c && t(c.takenAt) >= end) { after = c; break; } }
  return { before, after };
}

/** What the game counted of an evening at `at` for those who came: the copies
    either side, and the advancements from when the server could be started
    until the evening was over. */
function numbersOf(came: string[], at: string, copies: Awaited<ReturnType<typeof copiesAround>>, advancements: Record<string, Done> | null): NightNumbers {
  const start = t(at);
  return {
    by: tallyOf(came, copies.before?.counters ?? null, copies.after?.counters ?? null),
    advancements: eveningAdvancements(came, advancements, start - START_BEFORE_MS, start + EVENING_MS),
  };
}

/** The day after: once a daily copy taken after a night's evening exists, who
    came and who didn't is settled, the no-shows are counted, and what the
    game counted of the evening is kept with it. */
async function settleOne(night: Night, now: number, advancements: Record<string, Done> | null): Promise<{ id: string; came: string[]; noShows: string[] } | null> {
  const chosen = optionOf(night, night.chosen)!;
  const start = t(chosen.at);
  const end = start + EVENING_MS;

  const copies = await copiesAround(start, end);
  /* the copy after the evening isn't there yet: tomorrow, then */
  if (!copies.after && now < end + 2 * DAY) return null;

  /* claimed before anything is counted: a daily job delivered twice must not
     charge anyone twice for the same night */
  const r = await redis();
  const claim = `${SETTLED_PREFIX}${night.id}`;
  if (!(await r.set(claim, '1', 'EX', KEEP_S, 'NX'))) return null;
  let kept = false;
  try {
    const votes = await readVotes(night.id);
    const outcome = outcomeOf(yesFor(votes, chosen.id), await readSeen(night.id), copies.before?.counters ?? null, copies.after?.counters ?? null);
    await writeNight({ ...night, outcome: { ...outcome, numbers: numbersOf(outcome.came, chosen.at, copies, advancements) } });
    kept = true;
    for (const u of outcome.noShows) await r.hincrby(NO_SHOWS_KEY, u, 1);
    return { id: night.id, ...outcome };
  } catch (e) {
    /* Failed before the outcome was kept: nobody is charged yet, so the
       claim is let go and the next day's run settles it from the same
       copies. A claim held on a failure kept the night unsettled for good. */
    if (!kept) await r.del(claim).catch(() => 0);
    throw e;
  }
}

/** Nights settled before their numbers were kept are counted once, from the
    same daily copies (kept for 400 days): those whose embers still glow, and
    those in the annals. A night whose copies are gone keeps what could be
    counted, its advancements at least, and is not tried again. */
async function countEarlier(nights: Night[], advancements: Record<string, Done>): Promise<void> {
  for (const night of nights) {
    const chosen = optionOf(night, night.chosen);
    if (night.cancelled || !chosen || !night.outcome || night.outcome.numbers) continue;
    const start = t(chosen.at);
    const numbers = numbersOf(night.outcome.came, chosen.at, await copiesAround(start, start + EVENING_MS), advancements);
    await writeNight({ ...night, outcome: { ...night.outcome, numbers } });
  }
  const r = await redis();
  for (const [id, raw] of Object.entries(await r.hgetall(PAST_KEY))) {
    let past: PastNight;
    try { past = JSON.parse(raw) as PastNight; } catch { continue; }
    if (past.numbers) continue;
    const start = t(past.at);
    past.numbers = numbersOf(past.came, past.at, await copiesAround(start, start + EVENING_MS), advancements);
    await r.hset(PAST_KEY, id, JSON.stringify(past));
  }
}

/** Settles every night whose evening is over and not yet settled, and counts
    any settled before the numbers were kept. Called by the daily job, after
    the day's copy and the advancements are read; returns what it settled
    (empty if there was nothing to do yet). */
export async function settleNights(now = Date.now()): Promise<{ id: string; came: string[]; noShows: string[] }[]> {
  const { readStoredAdvancements } = await import('@/lib/advancements');
  const advancements = (await readStoredAdvancements())?.players ?? null;
  const done = [];
  for (const night of await readNights()) {
    if (night.cancelled || night.outcome || !night.chosen || phaseOf(night, now) !== 'over') continue;
    /* each night on its own: one that fails no longer leaves every night after it for another day */
    try {
      const out = await settleOne(night, now, advancements);
      if (out) done.push(out);
    } catch (e) {
      console.error(`[playnight] could not settle ${night.id}, the next run tries again:`, e instanceof Error ? e.message : e);
    }
  }
  /* earlier nights wait for a day the advancements can be read, so none is
     kept without them for good; and a failure there leaves the settling done */
  if (advancements) {
    try { await countEarlier(await readNights(), advancements); }
    catch (e) { console.error('[playnight] could not count the earlier nights:', e instanceof Error ? e.message : e); }
  }
  return done;
}

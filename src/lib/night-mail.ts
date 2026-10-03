// Word of the play nights by post (src/lib/play-night.ts). Server only.
// What the letters say is in src/lib/email-copy.ts, how they look in
// src/lib/email-design.ts.
//
// Four letters, each sent once per night:
//   lit     to everyone but the one who lit it, while the fire is fresh
//   chosen  to everyone but the one who chose, once a night of several times is decided
//   soon    to those who said they'd come, from half an hour before, when the server can be started
//   out     to those who said they'd come, when the fire is put out
// Only members with an address who have not turned the letters off get them.
//
// The play nights run on no timer, so this is asked from two places: right
// after a fire is lit, chosen or put out, and every few minutes by
// /api/cron/nights, which also catches a night chosen on its own and the half
// hour before. Each letter is claimed in Redis before it goes, so the two
// never send it twice; one that fails to go is let go again for the next run.
import { START_BEFORE_MS, currentNights, optionOf, phaseOf, yesFor, type Night, type Votes } from '@/lib/play-night';
import { nightReaders } from '@/lib/crew-email';
import { nightLetter as nightWords, type NightNotice, type Reader } from '@/lib/email-copy';
import { DEFAULT_THEMES, renderLetter, type Theme } from '@/lib/email-design';
import { readThemes } from '@/lib/email-settings';
import { canSendEmail, sendEmails, siteUrl, type Mail } from '@/lib/email';

export type { NightNotice, Reader };

/** a fire's first letter goes only while it is this fresh, so mail switched on later brings no old news */
export const LIT_FRESH_MS = 12 * 3600_000;

const t = (iso: string) => Date.parse(iso);
const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

/** The letters a night owes now, before asking which have gone. */
export function dueNotices(night: Night, now: number): NightNotice[] {
  if (night.cancelled) return [];
  const phase = phaseOf(night, now);
  if (phase === 'live' || phase === 'over') return [];
  const due: NightNotice[] = [];
  if (now - t(night.createdAt) < LIT_FRESH_MS) due.push('lit');
  const chosen = optionOf(night, night.chosen);
  /* a night of one time was chosen when it was lit, and its first letter says when */
  if (chosen && night.options.length > 1) due.push('chosen');
  /* lit inside the half hour, everyone already knows */
  if (chosen && phase === 'soon' && t(night.createdAt) < t(chosen.at) - START_BEFORE_MS) due.push('soon');
  return due;
}

/** Who a letter goes to, from those who want word of the nights. */
export function recipientsOf(kind: NightNotice, night: Night, votes: Votes, readers: Reader[]): Reader[] {
  if (kind === 'lit') return readers.filter(r => !same(r.username, night.by));
  if (kind === 'chosen') return readers.filter(r => !night.chosenBy || night.chosenBy === 'auto' || !same(r.username, night.chosenBy));
  if (kind === 'soon') {
    const yes = night.chosen ? yesFor(votes, night.chosen) : [];
    return readers.filter(r => yes.some(u => same(u, r.username)));
  }
  /* out: whoever said yes to any time, but not the one who put it out */
  const yes = new Set(Object.entries(votes).filter(([, ids]) => ids.length > 0).map(([u]) => u.toLowerCase()));
  return readers.filter(r => yes.has(r.username.toLowerCase()) && !same(r.username, night.by));
}

/** The letter for one reader, in the look chosen for it (src/lib/email-copy.ts has the words). */
export function nightLetter(kind: NightNotice, night: Night, votes: Votes, reader: Reader, theme: Theme = DEFAULT_THEMES[kind]): Mail {
  const site = siteUrl();
  const { subject, html, text } = renderLetter(nightWords(kind, night, votes, reader, site), theme, site);
  return { to: reader.address, subject, html, text };
}

// ─── sending, once ───────────────────────────────────────────────────────────

const mailedKey = (id: string) => `playnight:mailed:${id}`;
const KEEP_S = 45 * 24 * 3600;

async function redis() {
  const { getRedis } = await import('@/lib/redis');
  return getRedis();
}

/** True for the one caller that gets to send this letter. */
async function claim(id: string, kind: NightNotice): Promise<boolean> {
  const r = await redis();
  const added = await r.sadd(mailedKey(id), kind);
  await r.expire(mailedKey(id), KEEP_S);
  return added === 1;
}

async function deliver(kind: NightNotice, night: Night, votes: Votes, readers: Reader[], themes: Record<NightNotice, Theme>): Promise<number> {
  const to = recipientsOf(kind, night, votes, readers);
  if (to.length === 0 || !(await claim(night.id, kind))) return 0;
  const res = await sendEmails(to.map(r => nightLetter(kind, night, votes, r, themes[kind])));
  if (res.sent) return to.length;
  console.error(`[night-mail] ${kind} for ${night.id} did not go: ${res.reason}`);
  await (await redis()).srem(mailedKey(night.id), kind);
  return 0;
}

export interface Mailed { id: string; kind: NightNotice; to: number }

/** Sends every letter the planned nights owe now. */
export async function mailNights(now = Date.now()): Promise<Mailed[]> {
  if (!canSendEmail() || !process.env.REDIS_URL) return [];
  const readers = await nightReaders();
  if (readers.length === 0) return [];
  const { shown } = await currentNights(now);
  const themes = await readThemes();
  const done: Mailed[] = [];
  for (const { night, votes } of shown) {
    for (const kind of dueNotices(night, now)) {
      const to = await deliver(kind, night, votes, readers, themes);
      if (to) done.push({ id: night.id, kind, to });
    }
  }
  return done;
}

/** The fire was put out: those who said they'd come are told. Called with
    the night as it was, since a night put out is cleared away on the next read. */
export async function mailNightOut(night: Night, votes: Votes): Promise<Mailed[]> {
  if (!canSendEmail() || !process.env.REDIS_URL) return [];
  const to = await deliver('out', night, votes, await nightReaders(), await readThemes());
  return to ? [{ id: night.id, kind: 'out', to }] : [];
}

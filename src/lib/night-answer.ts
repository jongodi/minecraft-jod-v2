// An answer from a letter: the buttons in a play night's letter ("Ég mæti",
// "Kemst ekki", or one per time) carry a key that lets that member answer that
// night, and nothing else, without signing in. A letter is often opened in a
// mail app's own browser, which has no session, so answering used to mean
// signing in first. Server only.
//
// Opening the link writes nothing: mail scanners and chat previews open links
// to look at them, and the sign-in links taught that lesson (their uses were
// spent that way). The link opens the night with the answer filled in, and the
// member's own press on the site sends it (/api/playnight, action 'vote').
//
// A forwarded letter lets whoever has it answer for its reader, for that one
// night, until it starts. Among eight friends that is the right trade.
import { createHmac, timingSafeEqual } from 'node:crypto';
import { canonicalUsername, isCrewUsername } from '@/lib/crew-types';
import type { Night } from '@/lib/play-night';

/* the site's existing secret, as the letters' pictures use (src/lib/email-design.ts);
   the purpose is part of what is signed, so one key never stands in for the other */
const key = () => process.env.MAIL_ART_SECRET || process.env.CRON_SECRET || process.env.ADMIN_TOKEN || '';
const sign = (night: string, user: string, exp: number) =>
  createHmac('sha256', key()).update(`night-answer|${night}|${user.toLowerCase()}|${exp}`).digest('base64url').slice(0, 22);

/** Answer links can be made: there is a key to sign them with. */
export const canAnswerByLink = () => key().length > 0;

/** The key for one member and one night, good until the last time it offers (answers close when it starts). */
export function answerKey(night: Night, username: string): string {
  const exp = Math.max(...night.options.map(o => Date.parse(o.at)));
  return `${Buffer.from(username, 'utf8').toString('base64url')}.${exp.toString(36)}.${sign(night.id, username, exp)}`;
}

/** Who a key lets answer this night, or null for a key that is wrong, for another night, or past its time. */
export function answerUser(nightId: string, lykill: unknown, now = Date.now()): string | null {
  if (!key() || typeof lykill !== 'string' || lykill.length > 200) return null;
  const [u, e, s] = lykill.split('.');
  if (!u || !e || !s) return null;
  let username: string;
  try { username = Buffer.from(u, 'base64url').toString('utf8'); } catch { return null; }
  const exp = parseInt(e, 36);
  if (!isCrewUsername(username) || !Number.isFinite(exp) || now >= exp) return null;
  const want = Buffer.from(sign(nightId, username, exp)), got = Buffer.from(s);
  return want.length === got.length && timingSafeEqual(want, got) ? canonicalUsername(username) : null;
}

/** A letter's answer link: the night's page with the answer to fill in, `svar`
    an option's id or 'ekki' for none. Null when no key is set, so the letter
    keeps only its plain button. */
export function answerUrl(site: string, night: Night, username: string, svar: string): string | null {
  if (!canAnswerByLink()) return null;
  return `${site}/kvold/${night.id}?svar=${encodeURIComponent(svar)}&lykill=${answerKey(night, username)}#hopur`;
}

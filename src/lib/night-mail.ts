// Word of the play nights by post (src/lib/play-night.ts). Server only.
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
import { dayTime } from '@/lib/night-share';
import { nightReaders } from '@/lib/crew-email';
import { canSendEmail, letter, sendEmails, siteUrl, type Mail } from '@/lib/email';
import { plural } from '@/lib/format';

export type NightNotice = 'lit' | 'chosen' | 'soon' | 'out';

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

export interface Reader { username: string; address: string }

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

const clock = (iso: string) => { const d = new Date(iso); return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`; };

/** The letter itself, for one reader. */
export function nightLetter(kind: NightNotice, night: Night, votes: Votes, reader: Reader): Mail {
  const site = siteUrl();
  const url = `${site}/kvold/${night.id}#hopur`;
  const note = night.note ? [`„${night.note}“`] : [];
  const chosen = optionOf(night, night.chosen);
  const foot = `Þú færð þennan póst af því að netfangið þitt er skráð á JOÐ. Póstinum um spilakvöld má hætta undir „Netfang“ á veggnum þínum: ${site}/crew/${reader.username}`;
  const coming = (others: string[]) => others.length ? [`${others.length} ${plural(others.length, 'ætlar', 'ætla')} að mæta: ${others.join(', ')}.`] : [];

  let subject: string;
  let body: Parameters<typeof letter>[0];
  if (kind === 'lit') {
    subject = night.note ? `${night.by} kveikti bál: ${night.note}` : `${night.by} kveikti bál á JOÐ`;
    body = chosen ? {
      heading: `${night.by} kveikti bál`,
      lines: [...note, dayTime(chosen.at), 'Svaraðu á vefnum hvort þú mætir, svo hin viti af þér.'],
      button: { label: 'Svara', url },
    } : {
      heading: `${night.by} kveikti bál`,
      lines: [...note, 'Hvenær kemst þú?', ...night.options.map(o => dayTime(o.at)),
        `Merktu við alla tímana sem þú kemst. Tíminn sem flest komast á er festur þremur tímum á undan þeim fyrsta, nema ${night.by} velji fyrr.`],
      button: { label: 'Svara', url },
    };
  } else if (kind === 'chosen' && chosen) {
    subject = `Spilakvöldið er ákveðið: ${dayTime(chosen.at)}`;
    body = {
      heading: 'Kvöldið er ákveðið',
      lines: [...note, dayTime(chosen.at), night.chosenBy && night.chosenBy !== 'auto' ? `${night.chosenBy} valdi þennan tíma.` : 'Flest komast þá.',
        ...coming(yesFor(votes, chosen.id)), 'Kemst þú? Svaraðu á vefnum.'],
      button: { label: 'Sjá kvöldið', url },
      links: [{ label: 'Setja í dagatalið', url: `${site}/kvold/${night.id}/dagatal.ics` }],
    };
  } else if (kind === 'soon' && chosen) {
    subject = `Spilakvöldið hefst kl. ${clock(chosen.at)}`;
    body = {
      heading: 'Bálið logar eftir hálftíma',
      lines: [...note, `Kvöldið hefst kl. ${clock(chosen.at)}, og þú sagðist mæta.`,
        ...coming(yesFor(votes, chosen.id).filter(u => !same(u, reader.username))),
        'Sé slökkt á þjóninum getur þú kveikt á honum á vefnum. Vistfangið er play.jodcraft.world.'],
      button: { label: 'Kveikja á þjóninum', url },
    };
  } else {
    subject = night.note ? `Spilakvöldinu var aflýst: ${night.note}` : 'Spilakvöldinu var aflýst';
    body = {
      heading: `${night.by} slökkti bálið`,
      lines: [...note, chosen ? `Kvöldið á ${dayTime(chosen.at).toLocaleLowerCase('is-IS')} fellur niður.` : 'Kvöldið fellur niður; enginn tímanna verður.'],
      button: { label: 'Á vefinn', url: `${site}/#hopur` },
    };
  }
  return { to: reader.address, subject, ...letter({ ...body, foot }) };
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

async function deliver(kind: NightNotice, night: Night, votes: Votes, readers: Reader[]): Promise<number> {
  const to = recipientsOf(kind, night, votes, readers);
  if (to.length === 0 || !(await claim(night.id, kind))) return 0;
  const res = await sendEmails(to.map(r => nightLetter(kind, night, votes, r)));
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
  const done: Mailed[] = [];
  for (const { night, votes } of shown) {
    for (const kind of dueNotices(night, now)) {
      const to = await deliver(kind, night, votes, readers);
      if (to) done.push({ id: night.id, kind, to });
    }
  }
  return done;
}

/** The fire was put out: those who said they'd come are told. Called with
    the night as it was, since a night put out is cleared away on the next read. */
export async function mailNightOut(night: Night, votes: Votes): Promise<Mailed[]> {
  if (!canSendEmail() || !process.env.REDIS_URL) return [];
  const to = await deliver('out', night, votes, await nightReaders());
  return to ? [{ id: night.id, kind: 'out', to }] : [];
}

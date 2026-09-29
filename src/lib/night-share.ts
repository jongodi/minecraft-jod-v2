// The play night as its shared link says it (/kvold): one line for the title,
// one for the description, and what the link card draws. Server only.
import { currentNight, optionOf, phaseOf, yesFor } from '@/lib/play-night';
import { plural } from '@/lib/format';

const DAYS = ['sunnudag', 'mánudag', 'þriðjudag', 'miðvikudag', 'fimmtudag', 'föstudag', 'laugardag'];
const MONTHS = ['jan.', 'feb.', 'mar.', 'apr.', 'maí', 'jún.', 'júl.', 'ágú.', 'sep.', 'okt.', 'nóv.', 'des.'];
const cap = (s: string) => s.charAt(0).toLocaleUpperCase('is-IS') + s.slice(1);
/* Iceland keeps UTC; a link card is drawn once and kept, so no "í kvöld" */
const when = (iso: string) => {
  const d = new Date(iso);
  return `${cap(DAYS[d.getUTCDay()])} ${d.getUTCDate()}. ${MONTHS[d.getUTCMonth()]} kl. ${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
};

export interface SharedNight { title: string; lines: string[]; note: string; count: number; lit: boolean }

/** Changes whenever the card would: the night's address in chat apps' preview caches. */
export const cardVersion = (n: SharedNight) => {
  let h = 0;
  for (const ch of JSON.stringify(n)) h = (Math.imul(31, h) + ch.charCodeAt(0)) | 0;
  return (h >>> 0).toString(36);
};

export async function sharedNight(): Promise<SharedNight> {
  const none: SharedNight = { title: 'Næsta spilakvöld', lines: ['Ekkert bál logar núna'], note: '', count: 0, lit: false };
  if (!process.env.REDIS_URL) return none;
  let cur;
  try { cur = await currentNight(); } catch { return none; }
  if (!cur) return none;
  const { night, votes } = cur;
  const phase = phaseOf(night, Date.now());
  const chosen = optionOf(night, night.chosen);
  if (!chosen) {
    const opts = night.options.map(o => ({ at: o.at, n: yesFor(votes, o.id).length }));
    return {
      title: 'Kvöld í kortunum', note: night.note, lit: true,
      count: Math.max(...opts.map(o => o.n)),
      lines: opts.map(o => `${when(o.at)} · ${o.n} ${plural(o.n, 'getur', 'geta')}`),
    };
  }
  const yes = yesFor(votes, chosen.id).length;
  if (phase === 'over') {
    const came = night.outcome?.came.length;
    return { title: 'Spilakvöldið er búið', note: night.note, lit: false, count: 0, lines: [when(chosen.at), ...(came !== undefined ? [`${came} ${plural(came, 'mætti', 'mættu')}`] : [])] };
  }
  return {
    title: phase === 'live' ? 'Kvöldið er hafið' : 'Næsta spilakvöld', note: night.note, lit: true, count: yes,
    lines: [when(chosen.at), `${yes} ${plural(yes, 'mætir', 'mæta')}`],
  };
}

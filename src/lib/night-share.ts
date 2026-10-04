// A play night as its shared link says it (/kvold for the next one, /kvold/<id>
// for any one): one line for the title, one for the description, and what the
// link card draws. Server only.
import { currentNights, optionOf, phaseOf, yesFor } from '@/lib/play-night';
import type { Metadata } from 'next';
import { plural } from '@/lib/format';
import { SITE_NAME } from '@/components/badlands/data';

const DAYS = ['sunnudag', 'mánudag', 'þriðjudag', 'miðvikudag', 'fimmtudag', 'föstudag', 'laugardag'];
const MONTHS = ['jan.', 'feb.', 'mar.', 'apr.', 'maí', 'jún.', 'júl.', 'ágú.', 'sep.', 'okt.', 'nóv.', 'des.'];
const cap = (s: string) => s.charAt(0).toLocaleUpperCase('is-IS') + s.slice(1);
/** "Laugardag 10. okt. kl. 20:00". Iceland keeps UTC; a link card is drawn
    once and kept, and a letter is read whenever, so no "í kvöld". */
export const dayTime = (iso: string) => {
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

/** The night with this id, or with none the next one; null for an id that isn't shown (any more). */
export async function sharedNight(): Promise<SharedNight>;
export async function sharedNight(id: string | undefined): Promise<SharedNight | null>;
export async function sharedNight(id?: string): Promise<SharedNight | null> {
  const none: SharedNight = { title: 'Næsta spilakvöld', lines: ['Ekkert bál logar núna'], note: '', count: 0, lit: false };
  if (!process.env.REDIS_URL) return id ? null : none;
  let shown;
  try { ({ shown } = await currentNights()); } catch { return id ? null : none; }
  const cur = id ? shown.find(s => s.night.id === id) : shown[0];
  if (!cur) return id ? null : none;
  const { night, votes } = cur;
  const phase = phaseOf(night, Date.now());
  const chosen = optionOf(night, night.chosen);
  if (!chosen) {
    const opts = night.options.map(o => ({ at: o.at, n: yesFor(votes, o.id).length }));
    return {
      title: 'Kvöld í kortunum', note: night.note, lit: true,
      count: Math.max(...opts.map(o => o.n)),
      lines: opts.map(o => `${dayTime(o.at)} · ${o.n} ${plural(o.n, 'getur', 'geta')}`),
    };
  }
  const yes = yesFor(votes, chosen.id).length;
  if (phase === 'over') {
    const came = night.outcome?.came.length;
    return { title: 'Spilakvöldið er búið', note: night.note, lit: false, count: 0, lines: [dayTime(chosen.at), ...(came !== undefined ? [`${came} ${plural(came, 'mætti', 'mættu')}`] : [])] };
  }
  return {
    title: phase === 'live' ? 'Kvöldið er hafið' : 'Næsta spilakvöld', note: night.note, lit: true, count: yes,
    lines: [dayTime(chosen.at), `${yes} ${plural(yes, 'mætir', 'mæta')}`],
  };
}

/** The link preview for a night's page: /kvold (the next night) or /kvold/<id>. */
export function nightMetadata(night: SharedNight, id?: string): Metadata {
  const title = night.title;
  const description = [night.note && `„${night.note}“`, ...night.lines].filter(Boolean).join(' · ');
  const url = id ? `/kvold/${id}` : '/kvold';
  const card = `/kvold/card?${id ? `n=${encodeURIComponent(id)}&` : ''}v=${cardVersion(night)}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title, description, url, type: 'website', locale: 'is_IS', siteName: SITE_NAME,
      images: [{ url: card, width: 1200, height: 630, alt: 'Spilakvöld á JOÐ' }],
    },
    twitter: { card: 'summary_large_image', title, description, images: [card] },
  };
}

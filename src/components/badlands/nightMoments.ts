/* Two moments of a play night that the page marks as the game would.

   When the night begins: the game's /title over whatever is on screen,
   "Kvöldið er hafið", with the night's own note under it (NightTitle.tsx).
   It comes up when the hour chosen arrives while the page is open, or when
   the page is first looked at within the night's first quarter of an hour,
   and once a night in a browser.

   When everyone who said yes has come: fireworks over the campfire for the
   rest of the evening, as on New Year's Eve (Particles.tsx). */
import type { PublicNight } from '@/lib/play-night-view';

/** How long after the hour chosen the title still comes up for one who has just looked. */
export const TITLE_WINDOW_MS = 15 * 60_000;

/** The night the title is for: one with an hour chosen, not yet over. */
export interface TitleNight { id: string; at: number; note: string; by: string; yes: number; came: number }

export function titleNight(nights: readonly PublicNight[]): TitleNight | null {
  for (const n of nights) {
    if (!n.chosen || !(n.phase === 'chosen' || n.phase === 'soon' || n.phase === 'live')) continue;
    const option = n.options.find(o => o.id === n.chosen);
    const at = option ? Date.parse(option.at) : NaN;
    if (!option || Number.isNaN(at)) continue;
    return { id: n.id, at, note: n.note.trim(), by: n.by, yes: option.yes.length, came: n.came.length };
  }
  return null;
}

/** What the title does now: waits for the hour, comes up, or has nothing to say. */
export type TitleState = { kind: 'wait'; ms: number } | { kind: 'show' } | { kind: 'none' };

export function titleState(night: TitleNight | null, now: number, shown: boolean): TitleState {
  if (!night || shown) return { kind: 'none' };
  if (now < night.at) return { kind: 'wait', ms: night.at - now };
  if (now < night.at + TITLE_WINDOW_MS) return { kind: 'show' };
  return { kind: 'none' };
}

/** The line under the title: the night's note, or who lit the fire, and how
    many of those who said yes are in, once anyone is. "Mætt" is the same
    for one as for many, so it never has to guess at anyone's gender. */
export function subtitleParts(night: TitleNight): { what: string; count: string | null } {
  const what = night.note ? `„${night.note}“` : `${night.by} kveikti bálið`;
  return { what, count: night.came > 0 && night.yes > 0 ? `${Math.min(night.came, night.yes)} af ${night.yes} mætt` : null };
}

export function subtitleOf(night: TitleNight): string {
  const { what, count } = subtitleParts(night);
  return count ? `${what} · ${count}` : what;
}

/** Everyone who said yes to the hour chosen has come, on a night still going:
    two or more of them, since one alone is an evening in, not a full house. */
export function fullHouse(nights: readonly PublicNight[]): boolean {
  return nights.some(n => {
    if (n.phase !== 'live' || !n.chosen) return false;
    const yes = n.options.find(o => o.id === n.chosen)?.yes ?? [];
    if (yes.length < 2) return false;
    const came = new Set(n.came.map(c => c.toLowerCase()));
    return yes.every(y => came.has(y.toLowerCase()));
  });
}

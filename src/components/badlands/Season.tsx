'use client';

import { useEffect, useState } from 'react';
import { NO_SEASON, YULE_LADS, seasonAt, seasonFromParam, type Season } from '@/lib/season';

/** The time of year (src/lib/season.ts). The home page is drawn with the
    server's own day (src/lib/home-data.ts) so the snow and the lanterns are
    there at first paint; a page drawn with none works it out in the browser.
    ?arstid= still shows any season on any day. */
export function useSeason(initial: Season = NO_SEASON): Season {
  const [season, setSeason] = useState<Season>(initial);
  useEffect(() => {
    const asked = seasonFromParam(new URLSearchParams(window.location.search).get('arstid'));
    if (asked) setSeason(asked);
    else if (initial === NO_SEASON) setSeason(seasonAt(new Date()));
  // the seed is the page's first value only
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return season;
}

/** The root element's classes for a season: the sky, the snow and the fire read them in CSS. */
export const seasonClass = (s: Season) =>
  `${s.halloween ? ' is-halloween' : ''}${s.snow ? ' is-snow' : ''}${s.fireworks ? ' is-fireworks' : ''}`;

/* Where a Yule Lad can hide: a different one of these each day. */
export type LadSpot = 'hero' | 'mesa' | 'fire';
const SPOTS: LadSpot[] = ['mesa', 'fire', 'hero'];
const spotOf = (lad: number) => SPOTS[(lad * 2) % SPOTS.length];

const FOUND_KEY = () => `jod-jolasveinar-${new Date().getUTCFullYear()}`;
function readFound(): number[] {
  try { const v = JSON.parse(localStorage.getItem(FOUND_KEY()) ?? '[]'); return Array.isArray(v) ? v.filter(n => Number.isInteger(n)) : []; }
  catch { return []; }
}

/** The day's Yule Lad, if he hides here today: a small figure in pixels. A tap
    says who he is, and how many of the thirteen this browser has found this year. */
export function YuleLad({ season, spot }: { season: Season; spot: LadSpot }) {
  const [open, setOpen] = useState(false);
  const [found, setFound] = useState<number[]>([]);
  const lad = season.lad;
  if (lad === null || spotOf(lad) !== spot) return null;
  const who = YULE_LADS[lad];

  const tap = () => {
    const had = readFound();
    const next = had.includes(lad) ? had : [...had, lad];
    try { localStorage.setItem(FOUND_KEY(), JSON.stringify(next)); } catch { /* kept for this visit only */ }
    setFound(next);
    setOpen(o => !o);
  };

  return (
    <span className={`b-lad b-lad--${spot}`}>
      <button type="button" className="b-lad__who" onClick={tap} aria-expanded={open} aria-label={open ? `${who.name}, loka` : 'Einhver felur sig hér'}>
        <svg viewBox="0 0 10 14" shapeRendering="crispEdges" aria-hidden="true">
          {/* the hood, long and red, flopping to one side */}
          <rect x="2" y="0" width="5" height="1" fill="var(--tc-red)" /><rect x="1" y="1" width="7" height="2" fill="var(--tc-red)" /><rect x="7" y="2" width="2" height="1" fill="var(--tc-red)" /><rect x="8" y="3" width="1" height="1" fill="var(--paper)" />
          {/* face and a grey beard */}
          <rect x="2" y="3" width="5" height="2" fill="#D9A77C" /><rect x="3" y="4" width="1" height="1" fill="var(--ink)" /><rect x="5" y="4" width="1" height="1" fill="var(--ink)" />
          <rect x="1" y="5" width="7" height="3" fill="#CFC6B8" />
          {/* wool coat and a rope belt */}
          <rect x="1" y="8" width="7" height="4" fill="var(--tc-brown)" /><rect x="1" y="10" width="7" height="1" fill="var(--tc-yellow)" />
          <rect x="2" y="12" width="2" height="2" fill="var(--ink)" /><rect x="5" y="12" width="2" height="2" fill="var(--ink)" />
        </svg>
      </button>
      {open && (
        <span className="b-lad__note b-paper" role="status">
          <b>{who.name}</b>
          <span>{who.line}</span>
          <small>Þú hefur fundið {found.length} af 13 í ár</small>
        </span>
      )}
    </span>
  );
}

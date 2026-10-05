'use client';

import { useEffect, useState } from 'react';
import type { PlayNightResponse, PublicNight } from '@/app/api/playnight/route';
import { Campfire } from './Bits';
import PlayerHead from './PlayerHead';
import { WhenAt, dayOf, untilAt, usePlayNight } from './night';
import { plural } from '@/lib/format';

/* The hero's one line about the next play night, in a module of its own:
   the hero is on every visitor's first screen, and this line is all of the
   play nights it needs. The board, the form and the calendar (PlayNight.tsx)
   belong to the crew's room and are fetched when it opens; drawn from the
   same file they rode into the first bundle with the hero. */

export const chosenOf = (n: PublicNight) => n.options.find(o => o.id === n.chosen) ?? null;
export const lower = (s: string) => s.toLowerCase();

/** A fire that grows with everyone who can make it: from a spark to a blaze at eight. */
export function Fire({ count, embers = false, big = false }: { count: number; embers?: boolean; big?: boolean }) {
  const size = embers ? 2.5 : (big ? 3.5 : 2.25) + Math.min(8, count) * (big ? 0.45 : 0.3);
  return <span className="b-night__fire" style={{ '--fire': `${size}rem` } as React.CSSProperties}><Campfire embers={embers} /></span>;
}

export function Heads({ names, lit }: { names: string[]; lit?: (n: string) => boolean }) {
  if (names.length === 0) return null;
  return (
    <span className="b-night__heads">
      {names.map(n => <span key={n} className={`b-night__head b-tip${lit?.(n) ? ' is-in' : ''}`} data-tip={n}><PlayerHead name={n} size={24} /></span>)}
    </span>
  );
}

/** One line under the server's lantern about the next fire; a tap opens the
    crew's room, where they all are. Drawn on the server with the page's own
    answer, so it is there at first paint and nothing under it moves. */
export function NightLine({ initial, href = '#hopur' }: { initial?: PlayNightResponse; href?: string }) {
  const { state } = usePlayNight(initial);
  const night = state?.nights[0];
  /* on the day the line counts down on its own clock, so it keeps moving
     even when a poll fails or answers nothing new */
  const counting = night?.phase === 'chosen' || night?.phase === 'soon';
  const [, setMinute] = useState(0);
  useEffect(() => {
    if (!counting) return;
    const id = setInterval(() => setMinute(m => m + 1), 30_000);
    return () => clearInterval(id);
  }, [counting]);
  if (!night) return null;
  const planned = state!.nights.filter(n => n.phase !== 'over').length;
  const chosen = chosenOf(night);
  const yes = chosen?.yes ?? [];
  let text: string;
  if (night.phase === 'open') {
    const most = Math.max(...night.options.map(o => o.yes.length));
    text = `Kvöld í kortunum · ${night.options.length} ${plural(night.options.length, 'tími', 'tímar')}${most ? ` · allt að ${most} geta` : ''}`;
  } else if (night.phase === 'live') {
    text = `Kvöldið er hafið · ${night.came.filter(n => yes.some(y => lower(y) === lower(n))).length} af ${yes.length} komin`;
  } else if (night.phase === 'over') {
    text = `${dayOf(chosen!.at)} · ${night.came.length} ${plural(night.came.length, 'mætti', 'mættu')}`;
  } else {
    /* on the day, the line counts down to the fire */
    const until = untilAt(chosen!.at);
    text = `${WhenAt(chosen!.at)}${until ? `, ${until}` : ''} · ${yes.length} ${plural(yes.length, 'mætir', 'mæta')}`;
  }
  return (
    <a href={href} className={`b-nightline${night.phase === 'over' ? ' is-embers' : ''}`}>
      <Fire count={night.phase === 'open' ? Math.max(...night.options.map(o => o.yes.length)) : yes.length} embers={night.phase === 'over'} />
      <span className="b-nightline__text">
        <span className="b-nightline__kicker">{night.phase === 'over' ? 'Síðasta spilakvöld' : 'Næsta spilakvöld'}{planned > 1 && ` · ${planned} á dagskrá`}</span>
        {/* "í kvöld" and the minutes left are told from the clock, which the server read a moment before the browser does */}
        <span suppressHydrationWarning>{text}</span>
        {night.phase !== 'open' && <Heads names={night.phase === 'over' ? night.came : yes} />}
      </span>
    </a>
  );
}

'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { PlayNightResponse, PublicNight } from '@/app/api/playnight/route';
import { usePlayNight } from './night';
import { justBegun } from './signal';
import { plural } from '@/lib/format';
import { playSound } from '@/effects/ambience';

/* how long the title stands, with its coming and going (badlands.css, b-title-card) */
const SHOWN_MS = 5000;

/** Kvöldið er hafið: at the moment a play night's hour comes, a page that is
    open says so the way the game says a thing to everyone at once, with its
    /title: large words across the middle of the screen that come up, stand a
    few seconds and go, and a smaller line under them. A play night is when
    the site waits in a tab, and until now the hour passed there with one word
    changing beside the lantern. Shown once, only on the page that saw the
    hour come (justBegun in signal.ts), over whatever is up (the top layer, as
    the toast). It takes no press and is not read out: the crew's room says
    the same in a live region. With the wind and the fire on, the chime the
    server's coming on plays. */
export default function NightTitle({ nights }: { nights: PlayNightResponse }) {
  const { state } = usePlayNight(nights);
  const before = useRef<Record<string, PublicNight['phase']>>({});
  const [begun, setBegun] = useState<PublicNight | null>(null);
  const card = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const now = state?.nights ?? [];
    const night = justBegun(before.current, now);
    before.current = Object.fromEntries(now.map(n => [n.id, n.phase]));
    if (night) { setBegun(night); playSound('chime'); }
  }, [state]);
  useEffect(() => {
    if (!begun) return;
    const t = setTimeout(() => setBegun(null), SHOWN_MS);
    return () => clearTimeout(t);
  }, [begun]);
  useLayoutEffect(() => {
    if (!begun) return;
    try { card.current?.showPopover?.(); } catch { /* no top layer here: the title stays where it is drawn */ }
  }, [begun]);

  if (!begun) return null;
  const yes = begun.options.find(o => o.id === begun.chosen)?.yes.length ?? 0;
  return (
    <div ref={card} popover="manual" className="b-title-card" aria-hidden="true" style={{ ['--shown' as string]: `${SHOWN_MS}ms` }}>
      <span className="b-title-card__big">Kvöldið er hafið</span>
      <span className="b-title-card__small">{begun.note ? `„${begun.note}“` : yes > 0 ? `${yes} ${plural(yes, 'mætir', 'mæta')}` : 'Sjáumst inni'}</span>
    </div>
  );
}

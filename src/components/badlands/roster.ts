'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/** One of the crew as the land shows them: standing there, on the way in,
    or on the way out. */
export interface OnRidge { name: string; phase: 'here' | 'coming' | 'going' }

/* longer than the climb itself (badlands.css), should its end never be heard */
const WALK_MS = 1200;

/** Who stands on the ridge, with the ones who came in or went out while the
    page was looked at kept on their way: a newcomer climbs up into view, a
    leaver climbs down out of it, and only then is the ridge as the status says. `known` is
    whether the names are an answer at all; the first answer is where the
    page starts, not news, and under reduced motion everyone simply is or
    isn't there. `settle` is for when a figure's climb has ended. */
export function useRoster(names: string[], known: boolean): { roster: OnRidge[]; settle: (name: string) => void } {
  const [roster, setRoster] = useState<OnRidge[]>(() => names.map(name => ({ name, phase: 'here' })));
  const started = useRef(false);
  const key = names.join('|');

  useEffect(() => {
    if (!known) return;
    const still = !started.current || window.matchMedia('(prefers-reduced-motion: reduce)').matches || document.hidden;
    started.current = true;
    setRoster(cur => {
      if (still) return names.map(name => ({ name, phase: 'here' }));
      const now = new Set(names);
      const next: OnRidge[] = cur
        .filter(r => now.has(r.name) || r.phase !== 'coming')
        .map(r => (now.has(r.name) ? (r.phase === 'going' ? { name: r.name, phase: 'coming' } : r) : { name: r.name, phase: 'going' }));
      for (const name of names) if (!next.some(r => r.name === name)) next.push({ name, phase: 'coming' });
      return next;
    });
  // the names, by their key: a new array with the same names is no change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, known]);

  const settle = useCallback((name: string) => setRoster(cur => cur
    .filter(r => !(r.name === name && r.phase === 'going'))
    .map(r => (r.name === name && r.phase === 'coming' ? { name, phase: 'here' } : r))), []);

  /* a climb whose end the browser never tells (a hidden tab, a hidden figure) is settled anyway */
  useEffect(() => {
    const moving = roster.filter(r => r.phase !== 'here');
    if (!moving.length) return;
    const t = setTimeout(() => moving.forEach(r => settle(r.name)), WALK_MS);
    return () => clearTimeout(t);
  }, [roster, settle]);

  return { roster, settle };
}

'use client';

/* The game's /title when a play night begins (nightMoments.ts): "Kvöldið er
   hafið" cut from the strata as the name is, at a third of its size, the
   night's note under it on the hard band small words sit on. The game's own
   timing: in over ten ticks, held seventy, out over twenty (badlands.css),
   the light coming and going in whole ticks. Once a night in a browser;
   never over a dialog, where it waits for the dialog to close. The words are
   said once in a live region that is on the page before them. */
import { useEffect, useMemo, useRef, useState } from 'react';
import { usePlayNight } from './night';
import { modalOpen } from './hooks';
import { subtitleOf, titleNight, titleState, type TitleNight } from './nightMoments';

const TITLE = 'Kvöldið er hafið';
const seenKey = (id: string) => `jod-title-${id}`;
/* a timeout's longest wait; a night further off is asked about again at the next answer */
const LONGEST = 2 ** 31 - 1;

export default function NightTitle() {
  const { state } = usePlayNight();
  const night = useMemo(() => titleNight(state?.nights ?? []), [state]);
  /* the night's id and hour are what the timer hangs on; the counts in the
     line under the title are read when it comes up */
  const id = night?.id, at = night?.at;
  const latest = useRef(night);
  latest.current = night;
  const [on, setOn] = useState<TitleNight | null>(null);

  useEffect(() => {
    if (!night) return;
    const seen = () => { try { return localStorage.getItem(seenKey(night.id)) === '1'; } catch { return false; } };
    let timer: number | undefined;
    const check = () => {
      window.clearTimeout(timer);
      if (document.visibilityState !== 'visible') return;
      const s = titleState(night, Date.now(), seen());
      if (s.kind === 'wait') timer = window.setTimeout(check, Math.min(s.ms + 50, LONGEST));
      else if (s.kind === 'show') {
        if (modalOpen()) { timer = window.setTimeout(check, 2000); return; }
        try { localStorage.setItem(seenKey(night.id), '1'); } catch { /* shown again next time, no harm */ }
        setOn(latest.current ?? night);
      }
    };
    check();
    document.addEventListener('visibilitychange', check);
    return () => { window.clearTimeout(timer); document.removeEventListener('visibilitychange', check); };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hung on the night and its hour, not on each answer's counts
  }, [id, at]);

  return (
    <>
      <p className="b-visually-hidden" role="status">{on ? `${TITLE}. ${subtitleOf(on)}` : ''}</p>
      {on && (
        <div className="b-titlecmd" aria-hidden="true" onAnimationEnd={e => { if (e.target === e.currentTarget) setOn(null); }}>
          <p className="b-titlecmd__title">{TITLE}</p>
          <p className="b-titlecmd__sub">{subtitleOf(on)}</p>
        </div>
      )}
    </>
  );
}

'use client';

import { useEffect, useRef, useState } from 'react';
import { SoundIcon } from '@/components/badlands/Bits';
import { ambienceHeld, ambienceRunning, isRemembered, remember, startAmbience, stopAmbience } from './ambience';

/** The wind-and-fire toggle. A remembered "on" waits for the first tap or
    key, since browsers will not start audio before a gesture; on a page
    reached from another one in the same tab the gesture has usually been
    given, so the wind comes straight back. The toggle says "on" only once
    the sound is really playing: a phone counts a finger lifted, not one
    put down, as the gesture, and a sound started on the touch down stayed
    silent under a toggle that said it was on (and its next tap turned it
    off). The sound belongs to the page the toggle is on and goes with it,
    whichever way it was turned on: a sound turned on here used to keep
    playing on the next page under a toggle that said it was off. */
export default function AmbienceToggle({ className }: { className?: string }) {
  const [on, setOn] = useState(false);
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isRemembered()) return () => stopAmbience();
    let alive = true;
    const disarm = () => { window.removeEventListener('pointerup', arm); window.removeEventListener('keydown', arm); };
    /* armed until the sound is really playing; each gesture asks again */
    const tryStart = () => {
      if (!startAmbience()) { disarm(); return; }
      ambienceRunning().then(playing => { if (alive && playing) { disarm(); setOn(true); } });
    };
    /* A gesture on the toggle itself is the toggle's own to answer: starting
       the sound here as well had its click stop it again at once. */
    const arm = (e: Event) => {
      if (button.current?.contains(e.target as Node)) { disarm(); return; }
      tryStart();
    };
    window.addEventListener('pointerup', arm);
    window.addEventListener('keydown', arm);
    const nav = navigator as Navigator & { userActivation?: { hasBeenActive: boolean } };
    if (nav.userActivation?.hasBeenActive) tryStart();
    return () => { alive = false; disarm(); stopAmbience(); };
  }, []);

  /* "on" but held back (a phone suspends audio in another app): a press brings it back rather than turning it off */
  const toggle = () => {
    if (on && !ambienceHeld()) { stopAmbience(); setOn(false); remember(false); }
    else if (startAmbience()) { setOn(true); remember(true); }
  };

  return (
    /* a pressed button, named by what it plays: aria-pressed says whether it is playing */
    <button ref={button} type="button" className={`b-sound${on ? ' is-on' : ''}${className ? ` ${className}` : ''}`} onClick={toggle} aria-pressed={on}>
      <SoundIcon on={on} />
      <span className="b-sound__label">Vindur og eldur</span>
    </button>
  );
}

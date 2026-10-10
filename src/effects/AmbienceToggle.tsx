'use client';

import { useEffect, useRef, useState } from 'react';
import { SoundIcon } from '@/components/badlands/Bits';
import { isRemembered, remember, startAmbience, stopAmbience } from './ambience';

/** The wind-and-fire toggle. A remembered "on" waits for the first tap or
    key, since browsers will not start audio before a gesture; on a page
    reached from another one in the same tab the gesture has already been
    given, so the wind comes straight back. The sound belongs to the page
    the toggle is on and goes with it, whichever way it was turned on: a
    sound turned on here used to keep playing on the next page under a
    toggle that said it was off. */
export default function AmbienceToggle({ className }: { className?: string }) {
  const [on, setOn] = useState(false);
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isRemembered()) return () => stopAmbience();
    const nav = navigator as Navigator & { userActivation?: { hasBeenActive: boolean } };
    if (nav.userActivation?.hasBeenActive && startAmbience()) {
      setOn(true);
      return () => stopAmbience();
    }
    /* One gesture arms it, whichever comes first. A gesture on the toggle
       itself is the toggle's own to answer: starting the sound here as well
       had its click stop it again at once. */
    const arm = (e: Event) => {
      disarm();
      if (button.current?.contains(e.target as Node)) return;
      if (startAmbience()) setOn(true);
    };
    const disarm = () => { window.removeEventListener('pointerdown', arm); window.removeEventListener('keydown', arm); };
    window.addEventListener('pointerdown', arm);
    window.addEventListener('keydown', arm);
    return () => { disarm(); stopAmbience(); };
  }, []);

  const toggle = () => {
    if (on) { stopAmbience(); setOn(false); remember(false); }
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

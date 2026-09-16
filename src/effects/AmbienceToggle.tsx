'use client';

import { useEffect, useState } from 'react';
import { SoundIcon } from '@/components/badlands/Bits';
import { isRemembered, remember, startAmbience, stopAmbience } from './ambience';

/** The wind-and-fire toggle. A remembered "on" waits for the first tap or
    key, since browsers will not start audio before a gesture. */
export default function AmbienceToggle({ className }: { className?: string }) {
  const [on, setOn] = useState(false);

  useEffect(() => {
    if (!isRemembered()) return;
    const arm = () => { if (startAmbience()) setOn(true); };
    window.addEventListener('pointerdown', arm, { once: true });
    window.addEventListener('keydown', arm, { once: true });
    return () => { window.removeEventListener('pointerdown', arm); window.removeEventListener('keydown', arm); stopAmbience(); };
  }, []);

  const toggle = () => {
    if (on) { stopAmbience(); setOn(false); remember(false); }
    else if (startAmbience()) { setOn(true); remember(true); }
  };

  return (
    <button type="button" className={`b-sound${on ? ' is-on' : ''}${className ? ` ${className}` : ''}`} onClick={toggle} aria-pressed={on} aria-label={on ? 'Slökkva á vindi og eldi' : 'Kveikja á vindi og eldi'} title={on ? 'Slökkva á umhverfishljóði' : 'Kveikja á umhverfishljóði: vindur og eldur'}>
      <SoundIcon on={on} />
    </button>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { CopyIcon } from './Bits';
import { SERVER_IP } from './data';
import { useCopy, useReducedMotionPref } from './hooks';

const TICKER = 'Afritað. Límdu það inn í leikinn.';
const TICK_MS = 28;

/** The one action: copy the address. On click a telegraph ticker types the
    confirmation and the button takes a stamp. Screen readers hear it too. */
export default function CopyAddress({ hint = 'smelltu til að afrita vistfangið', className }: { hint?: string; className?: string }) {
  const [copied, copy] = useCopy(SERVER_IP);
  const reduce = useReducedMotionPref();
  const [typed, setTyped] = useState('');

  useEffect(() => {
    if (!copied) { setTyped(''); return; }
    if (reduce) { setTyped(TICKER); return; }
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setTyped(TICKER.slice(0, i));
      if (i >= TICKER.length) clearInterval(id);
    }, TICK_MS);
    return () => clearInterval(id);
  }, [copied, reduce]);

  return (
    <div className={`b-copy${copied ? ' is-copied' : ''}${className ? ` ${className}` : ''}`}>
      <button type="button" className="b-copy__btn" onClick={copy} aria-label={`Afrita vistfang þjónsins, ${SERVER_IP}`}>
        <CopyIcon />
        <span className="b-copy__addr">{SERVER_IP}</span>
        <span className="b-copy__stamp" aria-hidden="true">Afritað</span>
      </button>
      <p className={`b-copy__hint${copied ? ' is-ticker' : ''}`} aria-live="polite">{copied ? typed : hint}</p>
    </div>
  );
}

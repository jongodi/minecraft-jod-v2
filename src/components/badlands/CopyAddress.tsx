'use client';

import { useEffect, useRef } from 'react';
import { CopyIcon } from './Bits';
import { SERVER_IP } from './data';
import { useCopy } from './hooks';

/** The one action: copy the address. The copy icon and the address say what
    the button does; on a press the button takes a stamp, AFRITAÐ, struck
    across its corner, which says it was done right where the eye already is.
    No toast for a copy that went through: the stamp is the answer, and a
    screen reader hears the same word from the live region beside the button.
    One that failed (an in-app browser that refuses both ways of copying) is
    not stamped, since a stamp marks a thing done: the toast puts the address
    on paper, the live region says it failed, and the address on the button
    is selected, so a long press copies it by hand. */
export default function CopyAddress({ className }: { className?: string }) {
  const [copied, copy, failed] = useCopy(SERVER_IP, { toast: false });
  const addr = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = addr.current;
    const sel = window.getSelection();
    if (!failed || !el || !sel) return;
    const range = document.createRange();
    range.selectNodeContents(el);
    sel.removeAllRanges();
    sel.addRange(range);
  }, [failed]);
  return (
    <div className={`b-copy${copied ? ' is-copied' : ''}${className ? ` ${className}` : ''}`}>
      <button type="button" className="b-copy__btn" onClick={copy} aria-label={`Afrita vistfang þjónsins, ${SERVER_IP}`}>
        <CopyIcon />
        <span ref={addr} className="b-copy__addr">{SERVER_IP}</span>
        <span className="b-copy__stamp" aria-hidden="true">Afritað</span>
      </button>
      <span className="b-visually-hidden" role="status">{copied ? 'Afritað' : failed ? 'Afritun tókst ekki' : ''}</span>
    </div>
  );
}

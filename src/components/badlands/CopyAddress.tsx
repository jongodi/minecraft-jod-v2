'use client';

import { CopyIcon } from './Bits';
import { SERVER_IP } from './data';
import { useCopy } from './hooks';

/** The one action: copy the address. The copy icon and the address say what
    the button does; on a press the button takes a stamp, AFRITAÐ, struck
    across its corner, which says it was done right where the eye already is.
    No toast here: the stamp is the answer, and a screen reader hears the same
    word from the live region beside the button. */
export default function CopyAddress({ className }: { className?: string }) {
  const [copied, copy] = useCopy(SERVER_IP, { toast: false });
  return (
    <div className={`b-copy${copied ? ' is-copied' : ''}${className ? ` ${className}` : ''}`}>
      <button type="button" className="b-copy__btn" onClick={copy} aria-label={`Afrita vistfang þjónsins, ${SERVER_IP}`}>
        <CopyIcon />
        <span className="b-copy__addr">{SERVER_IP}</span>
        <span className="b-copy__stamp" aria-hidden="true">Afritað</span>
      </button>
      <span className="b-visually-hidden" role="status">{copied ? 'Afritað' : ''}</span>
    </div>
  );
}

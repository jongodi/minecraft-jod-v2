'use client';

import { CopyIcon } from './Bits';
import { SERVER_IP } from './data';
import { useCopy } from './hooks';

/** The one action: copy the address. The copy icon and the address say what
    the button does; the toast under the plank says it was done, and a screen
    reader hears the same from the toast's live region. */
export default function CopyAddress({ className }: { className?: string }) {
  const [, copy] = useCopy(SERVER_IP);
  return (
    <div className={`b-copy${className ? ` ${className}` : ''}`}>
      <button type="button" className="b-copy__btn" onClick={copy} aria-label={`Afrita vistfang þjónsins, ${SERVER_IP}`}>
        <CopyIcon />
        <span className="b-copy__addr">{SERVER_IP}</span>
      </button>
    </div>
  );
}

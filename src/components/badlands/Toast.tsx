'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { Seal } from './Bits';

/* A confirmation in the shape every Minecraft player knows: the advancement
   toast that drops in from the top of the screen when something was done.
   Here it is a slip of paper nailed under the plank, for the address copied
   from the bar and a link copied. Where the game shows the item, the slip
   carries JOÐ's seal: what was copied is made good. It says what
   was done and to what, and nothing more. One at a time; a new one takes the
   place of the one showing. Screen readers hear it once, from a live region
   that is on the page before anything is written to it. The hero's own copy
   button answers with its stamp instead (CopyAddress). */

export interface ToastMessage {
  id: number;
  /** what was done: "Afritað" */
  title: string;
  /** the thing itself, in the bitmap face: the address, a link's subject */
  data?: string;
}

const SHOW_MS = 2600;

let current: ToastMessage | null = null;
let seq = 0;
let timer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach(l => l());
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };

/** Show a toast. Replaces the one showing, and leaves on its own. */
export function toast(title: string, data?: string): void {
  clearTimeout(timer);
  current = { id: ++seq, title, data };
  notify();
  timer = setTimeout(() => { current = null; notify(); }, SHOW_MS);
}

/** Where the toasts land. Rendered once, by the bar, so it is on every page. */
export default function ToastHost() {
  const shown = useSyncExternalStore(subscribe, () => current, () => null);
  /* the slip stays a beat after its message is gone, to leave the way it came */
  const [kept, setKept] = useState<ToastMessage | null>(null);
  useEffect(() => {
    if (shown) { setKept(shown); return; }
    const t = setTimeout(() => setKept(null), 400);
    return () => clearTimeout(t);
  }, [shown]);
  const message = shown ?? kept;

  return (
    <div className="b-toasts" role="status" aria-live="polite" aria-atomic="true">
      {message && (
        <div key={message.id} className={`b-toast b-paper${shown ? '' : ' is-leaving'}`} onAnimationEnd={e => { if (!shown && e.target === e.currentTarget) setKept(null); }}>
          <span className="b-paper__nail" aria-hidden="true" />
          <Seal />
          <span className="b-toast__text">
            <b className="b-toast__title">{message.title}</b>
            {message.data && <span className="b-toast__data">{message.data}</span>}
          </span>
        </div>
      )}
    </div>
  );
}

'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { CloseIcon } from './Bits';
import { useInert } from './hooks';

interface Props {
  id: string;
  open: boolean;
  title: string;
  /** one short line beside the title, in the label face */
  note?: ReactNode;
  onClose: () => void;
  children: ReactNode;
}

/** A room that opens over the world: a plank across the top with the title
    and the way out, the room itself below it. It rises from the foot of the
    frame and never covers the top of the world, so the map stays in view
    behind it. The room scrolls inside itself; the page does not move. */
export default function Drawer({ id, open, title, note, onClose, children }: Props) {
  const close = useRef<HTMLButtonElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const wasOpen = useRef(false);
  /* what had focus when the room opened: a door, the lantern, the night's line */
  const opener = useRef<HTMLElement | null>(null);
  const root = useInert<HTMLElement>(!open);

  /* Focus lands on the way out when the room opens, and the room starts at
     its top each time. When it closes, focus goes back to whatever opened
     it, rather than being left on a room that has just gone inert. */
  useEffect(() => {
    if (open && !wasOpen.current) {
      const from = document.activeElement;
      opener.current = from instanceof HTMLElement && from !== document.body && !root.current?.contains(from) ? from : null;
      close.current?.focus({ preventScroll: true });
      if (body.current) body.current.scrollTop = 0;
    } else if (!open && wasOpen.current) {
      const at = document.activeElement;
      const lost = !at || at === document.body || !!root.current?.contains(at);
      if (lost && opener.current?.isConnected) opener.current.focus({ preventScroll: true });
      opener.current = null;
    }
    wasOpen.current = open;
  }, [open, root]);

  return (
    <section
      ref={root}
      id={`${id}-room`}
      className={`b-room${open ? ' is-open' : ''}`}
      aria-labelledby={`${id}-title`}
      aria-hidden={!open}
    >
      <div className="b-room__plank">
        <h2 id={`${id}-title`} className="b-room__title">{title}</h2>
        {note && <p className="b-room__note">{note}</p>}
        <button ref={close} type="button" className="b-room__close" onClick={onClose} aria-label={`Loka: ${title}`}>
          <CloseIcon />
        </button>
      </div>
      <div ref={body} className="b-room__body">
        {children}
      </div>
    </section>
  );
}

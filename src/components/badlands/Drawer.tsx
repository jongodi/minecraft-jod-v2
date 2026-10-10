'use client';

import { useEffect, useRef, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
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

  /* The plank is a handle: pulled down, the room follows the finger, and let
     go far enough or fast enough it closes, as a sheet on a phone does;
     otherwise it settles back. The ✕ on the plank stays a button. Only the
     plank moves the room, so a thumb scrolling the room never closes it. */
  const drag = useRef<{ id: number; y: number; dy: number; at: number; v: number } | null>(null);
  const onDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!open || e.button !== 0 || (e.target as Element).closest('button')) return;
    drag.current = { id: e.pointerId, y: e.clientY, dy: 0, at: performance.now(), v: 0 };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    const el = root.current;
    if (!d || e.pointerId !== d.id || !el) return;
    const dy = Math.max(0, e.clientY - d.y);
    const now = performance.now();
    d.v = (dy - d.dy) / Math.max(1, now - d.at);
    d.dy = dy;
    d.at = now;
    el.style.transition = 'none';
    el.style.transform = `translateY(${dy}px)`;
  };
  const onUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || e.pointerId !== d.id) return;
    drag.current = null;
    const el = root.current;
    if (el) { el.style.transition = ''; el.style.transform = ''; }
    if (d.dy > 96 || (d.dy > 24 && d.v > 0.5)) onClose();
  };

  return (
    <section
      ref={root}
      id={`${id}-room`}
      className={`b-room${open ? ' is-open' : ''}`}
      aria-labelledby={`${id}-title`}
      aria-hidden={!open}
    >
      <div className="b-room__plank" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
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

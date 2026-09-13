'use client';

import { useEffect, useRef, type ReactNode } from 'react';

export default function AtlasDialog({ label, onClose, children, wide = false }: {
  label: string; onClose: () => void; children: ReactNode; wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    dialog?.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      dialog?.close();
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, []);
  return (
    <dialog ref={ref} className={`atlas-dialog${wide ? ' atlas-dialog--wide' : ''}`}
      aria-label={label} onCancel={onClose} onClick={event => {
        if (event.target === event.currentTarget) {
          const box = event.currentTarget.getBoundingClientRect();
          if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) onClose();
        }
      }}>
      <button className="atlas-dialog__close" aria-label="Close dialog" onClick={onClose} autoFocus>×</button>
      {children}
    </dialog>
  );
}

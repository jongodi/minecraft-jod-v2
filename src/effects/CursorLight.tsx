'use client';

import { useEffect, useState } from 'react';

/* A warm light that follows a fine pointer. It writes --cx and --cy on the
   root, which the overlay and every paper notice read. Nothing on touch. */

const LERP = 0.18;

export default function CursorLight() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const fine = window.matchMedia('(pointer: fine) and (hover: hover)');
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!fine.matches || reduce.matches) return;
    setEnabled(true);

    const root = document.documentElement;
    let tx = -999, ty = -999, cx = -999, cy = -999, raf = 0, seen = false;
    const step = () => {
      cx += (tx - cx) * LERP; cy += (ty - cy) * LERP;
      root.style.setProperty('--cx', `${cx.toFixed(1)}px`);
      root.style.setProperty('--cy', `${cy.toFixed(1)}px`);
      raf = Math.abs(tx - cx) + Math.abs(ty - cy) > 0.5 ? requestAnimationFrame(step) : 0;
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      tx = e.clientX; ty = e.clientY;
      if (!seen) { seen = true; cx = tx; cy = ty; root.style.setProperty('--cursor-on', '1'); }
      if (!raf) raf = requestAnimationFrame(step);
    };
    const onLeave = () => { tx = -999; ty = -999; if (!raf) raf = requestAnimationFrame(step); };
    window.addEventListener('pointermove', onMove, { passive: true });
    document.documentElement.addEventListener('pointerleave', onLeave);
    return () => {
      window.removeEventListener('pointermove', onMove);
      document.documentElement.removeEventListener('pointerleave', onLeave);
      cancelAnimationFrame(raf);
      root.style.removeProperty('--cx'); root.style.removeProperty('--cy'); root.style.removeProperty('--cursor-on');
    };
  }, []);

  return enabled ? <div className="b-light" aria-hidden="true" /> : null;
}

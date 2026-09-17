'use client';

import { useEffect, useRef, useState } from 'react';

/* A warm light that follows a fine pointer. It is one fixed layer moved by
   transform, so a pointer frame costs a composite and nothing else. Writing
   the position to custom properties on :root instead would invalidate the
   computed style of every element on the page, sixty times a second.
   Nothing on touch. */

const LERP = 0.18;

export default function CursorLight() {
  const [enabled, setEnabled] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fine = window.matchMedia('(pointer: fine) and (hover: hover)');
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!fine.matches || reduce.matches) return;
    setEnabled(true);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!enabled || !el) return;

    let tx = -9999, ty = -9999, cx = -9999, cy = -9999, raf = 0, seen = false;
    const draw = () => { el.style.transform = `translate3d(${cx.toFixed(1)}px, ${cy.toFixed(1)}px, 0)`; };
    const step = () => {
      cx += (tx - cx) * LERP; cy += (ty - cy) * LERP;
      draw();
      raf = Math.abs(tx - cx) + Math.abs(ty - cy) > 0.5 ? requestAnimationFrame(step) : 0;
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      tx = e.clientX; ty = e.clientY;
      if (!seen) { seen = true; cx = tx; cy = ty; draw(); el.classList.add('is-on'); }
      if (!raf) raf = requestAnimationFrame(step);
    };
    const onLeave = () => { tx = -9999; ty = -9999; if (!raf) raf = requestAnimationFrame(step); };
    window.addEventListener('pointermove', onMove, { passive: true });
    document.documentElement.addEventListener('pointerleave', onLeave);
    return () => {
      window.removeEventListener('pointermove', onMove);
      document.documentElement.removeEventListener('pointerleave', onLeave);
      cancelAnimationFrame(raf);
    };
  }, [enabled]);

  return enabled ? <div ref={ref} className="b-light" aria-hidden="true" /> : null;
}

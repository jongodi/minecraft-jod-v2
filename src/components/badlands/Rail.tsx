'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowIcon } from './Bits';
import { useReducedMotionPref } from './hooks';

interface Props {
  children: ReactNode;
  className?: string;
  /** aria-label for the scrolling strip */
  label?: string;
  /** the two arrows' labels, for fine pointers */
  prevLabel?: string;
  nextLabel?: string;
  /** re-measure the ends when this changes (the number of items, usually) */
  count?: number;
}

/** A strip that scrolls sideways: the places along the foot of the world and
    the posters on the board. Both ends fall off into the dark while there is
    more that way, a wheel walks it, and lanterns at the ends nudge it for a
    fine pointer. One component, so the two rails behave the same. */
export default function Rail({ children, className, label, prevLabel = 'Fyrri', nextLabel = 'Næstu', count }: Props) {
  const rail = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });
  const reduce = useReducedMotionPref();

  /* Which end we are at. Sampled once per frame, committed only when changed. */
  const raf = useRef(0);
  const measure = useCallback(() => {
    raf.current = 0;
    const el = rail.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    const next = { start: el.scrollLeft <= 6, end: el.scrollLeft >= max - 6 };
    setEdges(prev => (prev.start === next.start && prev.end === next.end ? prev : next));
  }, []);
  const onScroll = useCallback(() => { if (!raf.current) raf.current = requestAnimationFrame(measure); }, [measure]);
  useEffect(() => {
    measure();
    window.addEventListener('resize', onScroll, { passive: true });
    return () => { window.removeEventListener('resize', onScroll); cancelAnimationFrame(raf.current); raf.current = 0; };
  }, [measure, onScroll, count]);

  /* A mouse wheel has no sideways: over the rail, its up and down walk the items. */
  useEffect(() => {
    const el = rail.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      const max = el.scrollWidth - el.clientWidth;
      if (max <= 0) return;
      const at = el.scrollLeft;
      if ((e.deltaY < 0 && at <= 0) || (e.deltaY > 0 && at >= max)) return;
      e.preventDefault();
      el.scrollLeft = at + e.deltaY;
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const nudge = (dir: 1 | -1) => {
    const el = rail.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: reduce ? 'auto' : 'smooth' });
  };

  return (
    <div className={`b-railwrap${className ? ` ${className}` : ''}`}>
      <div ref={rail} onScroll={onScroll} className={`b-rail${edges.start ? ' at-start' : ''}${edges.end ? ' at-end' : ''}`} aria-label={label}>
        {children}
      </div>
      <button type="button" className="b-railwrap__arrow b-railwrap__arrow--l" onClick={() => nudge(-1)} disabled={edges.start} aria-label={prevLabel}><ArrowIcon flip /></button>
      <button type="button" className="b-railwrap__arrow b-railwrap__arrow--r" onClick={() => nudge(1)}  disabled={edges.end}   aria-label={nextLabel}><ArrowIcon /></button>
    </div>
  );
}

/** Scroll the rail item carrying `data-rail-item="<id>"` into view. */
export function revealRailItem(id: string | number, within?: HTMLElement | null) {
  const root = within ?? document;
  root.querySelector<HTMLElement>(`[data-rail-item="${id}"]`)?.scrollIntoView({ inline: 'nearest', block: 'nearest', behavior: 'smooth' });
}

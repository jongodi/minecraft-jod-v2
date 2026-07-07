'use client';

import { useRef, useCallback, useEffect, useState, type CSSProperties, type ReactNode } from 'react';

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const m = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(m.matches);
    const h = () => setReduced(m.matches);
    m.addEventListener?.('change', h);
    return () => m.removeEventListener?.('change', h);
  }, []);
  return reduced;
}

interface GlassProps {
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** Tint the surface with the theme accent. */
  tint?: boolean;
  /** Square corners (for edge-to-edge panels). */
  flush?: boolean;
  onClick?: () => void;
  title?: string;
}

/**
 * A liquid-glass surface. The specular highlight tracks the pointer via CSS
 * custom properties (--mx/--my), rAF-throttled and disabled under reduced
 * motion. All the optics live in .glass (see tokens); this just feeds it input.
 */
export function Glass({ children, className = '', style, tint, flush, onClick, title }: GlassProps) {
  const ref = useRef<HTMLDivElement>(null);
  const rafRef = useRef(0);
  const reduced = usePrefersReducedMotion();

  const onMove = useCallback((e: React.PointerEvent) => {
    if (reduced) return;
    const el = ref.current;
    if (!el || rafRef.current) return;
    const { clientX, clientY } = e;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0;
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) return;
      el.style.setProperty('--mx', ((clientX - r.left) / r.width).toFixed(3));
      el.style.setProperty('--my', ((clientY - r.top) / r.height).toFixed(3));
    });
  }, [reduced]);

  useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); }, []);

  return (
    <div
      ref={ref}
      className={`glass${tint ? ' tint-accent' : ''}${flush ? ' flush' : ''}${className ? ' ' + className : ''}`}
      style={style}
      onPointerMove={onMove}
      onClick={onClick}
      title={title}
    >
      {children}
    </div>
  );
}

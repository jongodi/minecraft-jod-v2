'use client';

import { useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';

/* Small hand-made things: tape, pins, stamps, a rope, a trail. */

export function Tape({ at, r }: { at: 'tl' | 'tr' | 'br' | 'top'; r?: number }) {
  return <span className={`j-tape j-tape--${at}`} style={r !== undefined ? ({ '--r': `${r}deg` } as CSSProperties) : undefined} aria-hidden="true" />;
}

export function Pin({ red, style }: { red?: boolean; style?: CSSProperties }) {
  return <span className={`j-pin${red ? ' j-pin--red' : ''}`} style={style} aria-hidden="true" />;
}

export function Stamp({ children, r = -5, small, onClick, className, copied }:
  { children: React.ReactNode; r?: number; small?: boolean; onClick?: () => void; className?: string; copied?: boolean }) {
  const cls = `j-stamp${small ? ' j-stamp--small' : ''}${onClick ? ' j-stamp--btn' : ''}${copied ? ' is-copied' : ''}${className ? ` ${className}` : ''}`;
  const style = { '--r': `${r}deg` } as CSSProperties;
  return onClick
    ? <button className={cls} style={style} onClick={onClick}>{children}</button>
    : <span className={cls} style={style}>{children}</span>;
}

/** A hand-drawn arrow, pointing right by default. */
export function Arrow({ flip, className }: { flip?: boolean; className?: string }) {
  return (
    <svg className={`j-arrow${className ? ` ${className}` : ''}`} viewBox="0 0 64 40" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={flip ? { transform: 'scaleX(-1)' } : undefined} aria-hidden="true">
      <path d="M3 30 C 18 8, 34 6, 58 14" />
      <path d="M48 6 L58 14 L46 20" />
    </svg>
  );
}

/** A rough underline stroke. */
export function Under() {
  return (
    <svg className="j-under" viewBox="0 0 300 12" preserveAspectRatio="none" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
      <path d="M3 8 C 60 2, 120 10, 180 5 S 270 6, 297 4" />
    </svg>
  );
}

/** The sagging rope the portraits hang from. */
export function Rope() {
  return (
    <svg className="j-rope__line" viewBox="0 0 1200 64" preserveAspectRatio="none" fill="none" stroke="currentColor" aria-hidden="true">
      <path d="M0 8 C 300 44, 900 44, 1200 8" strokeWidth="5" />
      <path d="M0 8 C 300 44, 900 44, 1200 8" strokeWidth="1.5" stroke="#e4d5ae" strokeDasharray="6 10" strokeOpacity="0.7" />
    </svg>
  );
}

export function Star({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="11" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <path d="M12 3.5 l2.3 5.4 5.8 0.5 -4.4 3.8 1.3 5.7 -5 -3 -5 3 1.3 -5.7 -4.4 -3.8 5.8 -0.5 z" fill="currentColor" />
    </svg>
  );
}

export function BulletHole({ x, y }: { x: number; y: number }) {
  return (
    <svg className="j-arena__hole" style={{ left: `${x}%`, top: `${y}%` }} viewBox="0 0 34 34" aria-hidden="true">
      {[0, 40, 85, 130, 175, 220, 265, 310].map((a, i) => {
        const r = (a * Math.PI) / 180;
        const len = 10 + (i % 3) * 3;
        return <line key={a} x1={17 + Math.cos(r) * 6} y1={17 + Math.sin(r) * 6} x2={17 + Math.cos(r) * (6 + len)} y2={17 + Math.sin(r) * (6 + len)} stroke="#15100b" strokeWidth="1.2" strokeOpacity="0.8" />;
      })}
      <circle cx="17" cy="17" r="6" fill="#15100b" />
      <circle cx="15.5" cy="15.5" r="2" fill="#3b2719" />
    </svg>
  );
}

/** A dashed trail wandering down behind the whole page. It draws
    itself as you scroll: the dash offset follows scroll progress. */
export function TrailLine() {
  const ref = useRef<SVGPathElement>(null);
  useEffect(() => {
    const path = ref.current;
    if (!path) return;
    const paint = () => {
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(1, (window.scrollY + window.innerHeight * 0.6) / (max + window.innerHeight * 0.6)) : 1;
      path.style.strokeDashoffset = String(1 - p);
    };
    paint();
    window.addEventListener('scroll', paint, { passive: true });
    window.addEventListener('resize', paint);
    return () => { window.removeEventListener('scroll', paint); window.removeEventListener('resize', paint); };
  }, []);
  const d = 'M 88 40 C 96 120, 60 160, 30 220 S 8 330, 40 380 S 96 470, 70 540 S 10 640, 24 720 S 90 820, 60 900 S 30 960, 50 1000';
  return (
    <svg className="j-trailline" viewBox="0 0 100 1000" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <mask id="jTrailMask" maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="1000">
          {/* a solid copy of the trail, revealed from the top as the reader scrolls */}
          <path ref={ref} d={d} pathLength={1} fill="none" stroke="#fff" strokeWidth="6" vectorEffect="non-scaling-stroke" style={{ strokeDasharray: '1 1', strokeDashoffset: 1 }} />
        </mask>
      </defs>
      <path d={d} pathLength={1} mask="url(#jTrailMask)" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

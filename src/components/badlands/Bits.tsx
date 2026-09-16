import type { CSSProperties } from 'react';

/* Small pixel-drawn things shared across the site. Every shape is made of
   whole-unit rectangles so it stays crisp at any integer scale. */

const STRATA = ['var(--tc-white)', 'var(--tc-yellow)', 'var(--tc-orange)', 'var(--tc-red)', 'var(--tc-brown)'];

/** The logo mark: a slice of strata with a pixel J cut into it. */
export function Mark({ className }: { className?: string }) {
  const bands = [[0, 3], [3, 5], [8, 8], [16, 6], [22, 10]];
  return (
    <svg className={className} viewBox="0 0 32 32" aria-hidden="true" shapeRendering="crispEdges">
      {bands.map(([y, h], i) => <rect key={y} x="0" y={y} width="32" height={h} fill={STRATA[i]} />)}
      <g fill="var(--paper)">
        <rect x="10" y="6" width="14" height="4" />
        <rect x="16" y="10" width="4" height="12" />
        <rect x="8" y="16" width="4" height="6" />
        <rect x="8" y="22" width="12" height="4" />
      </g>
    </svg>
  );
}

/** A lantern. Lit or dark is decided by the parent's class. */
export function Lantern({ lit, className, style }: { lit: boolean; className?: string; style?: CSSProperties }) {
  return (
    <span className={`b-lantern${lit ? ' is-lit' : ''}${className ? ` ${className}` : ''}`} style={style} aria-hidden="true">
      <svg viewBox="0 0 12 18">
        <g fill="currentColor">
          <rect x="4" y="0" width="4" height="1" />
          <rect x="3" y="1" width="1" height="2" />
          <rect x="8" y="1" width="1" height="2" />
          <rect x="2" y="3" width="8" height="2" />
          <rect x="2" y="5" width="1" height="8" />
          <rect x="9" y="5" width="1" height="8" />
          <rect x="1" y="13" width="10" height="2" />
          <rect x="3" y="15" width="6" height="1" />
        </g>
        <rect className="b-lantern__glass" x="3" y="5" width="6" height="8" />
        <rect className="b-lantern__flame" x="5" y="8" width="2" height="3" />
      </svg>
    </span>
  );
}

/** A stepped band of terracotta between two hours of the evening. */
export function Strata({ flip, className }: { flip?: boolean; className?: string }) {
  const cls = ['b-strata', 'b-strata--top', flip ? 'b-strata--flip' : '', className ?? ''].filter(Boolean).join(' ');
  return (
    <svg className={cls} viewBox="0 0 240 16" preserveAspectRatio="none" aria-hidden="true">
      <rect x="0" y="0" width="240" height="16" fill="var(--tc-brown)" />
      <path d="M0 6 H24 V3 H60 V5 H96 V2 H132 V4 H168 V1 H204 V4 H240 V16 H0 Z" fill="var(--tc-red)" />
      <path d="M0 9 H40 V7 H88 V10 H140 V8 H190 V6 H240 V16 H0 Z" fill="var(--tc-orange)" />
      <path d="M0 12 H60 V11 H120 V13 H180 V12 H240 V16 H0 Z" fill="var(--tc-yellow)" />
      <rect x="0" y="14" width="240" height="2" fill="var(--tc-white)" />
    </svg>
  );
}

const SUN_ROWS = [[3, 6], [2, 8], [1, 10], [1, 10], [0, 12], [0, 12], [0, 12], [0, 12], [1, 10], [1, 10], [2, 8], [3, 6]];

/** A pixel sun, twelve rows. */
export function Sun() {
  return (
    <svg viewBox="0 0 12 12" aria-hidden="true">
      {SUN_ROWS.map(([x, w], y) => <rect key={y} x={x} y={y} width={w} height="1" fill="currentColor" />)}
    </svg>
  );
}

const STAR_TILE: Array<[number, number, number]> = [
  [12, 18, 2], [58, 7, 1], [91, 40, 2], [140, 22, 1], [176, 66, 2], [33, 84, 1], [118, 96, 2], [64, 132, 1],
  [160, 150, 2], [21, 168, 1], [99, 176, 1], [189, 118, 1], [136, 184, 2], [76, 52, 1], [8, 120, 1], [172, 12, 1],
];

/** Stars at pixel scale, tiled. */
export function Stars({ className }: { className?: string }) {
  return (
    <svg className={className} aria-hidden="true">
      <defs>
        <pattern id="b-stars" width="200" height="200" patternUnits="userSpaceOnUse">
          {STAR_TILE.map(([x, y, s]) => <rect key={`${x}-${y}`} x={x} y={y} width={s} height={s} fill="currentColor" />)}
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#b-stars)" />
    </svg>
  );
}

const FLAMES: ReadonlyArray<ReadonlyArray<[number, number, number, number, string]>> = [
  /* x, y, w, h, colour: three frames of the same fire */
  [[7, 2, 2, 2, 'var(--sun)'], [6, 4, 4, 2, 'var(--sun)'], [5, 6, 6, 2, 'var(--ember)'], [4, 8, 8, 3, 'var(--ember)'], [6, 6, 2, 4, 'var(--sun)']],
  [[8, 1, 2, 3, 'var(--sun)'], [6, 4, 5, 2, 'var(--sun)'], [4, 6, 7, 2, 'var(--ember)'], [4, 8, 8, 3, 'var(--ember)'], [7, 6, 2, 4, 'var(--sun)']],
  [[6, 3, 2, 2, 'var(--sun)'], [5, 5, 5, 1, 'var(--sun)'], [5, 6, 6, 2, 'var(--ember)'], [3, 8, 10, 3, 'var(--ember)'], [6, 6, 3, 4, 'var(--sun)']],
];

/** The campfire in the footer: a three-frame pixel flame on two logs. */
export function Campfire() {
  return (
    <span className="b-fire" aria-hidden="true">
      <svg viewBox="0 0 16 16">
        {FLAMES.map((frame, i) => (
          <g key={i} className="b-fire__frame" style={{ animationDelay: `${-i * 300}ms` }}>
            {frame.map(([x, y, w, h, fill]) => <rect key={`${x}-${y}`} x={x} y={y} width={w} height={h} fill={fill} />)}
          </g>
        ))}
        <rect x="2" y="11" width="12" height="2" fill="var(--wood)" />
        <rect x="1" y="13" width="14" height="1" fill="var(--wood)" />
        <rect x="3" y="12" width="3" height="1" fill="var(--tc-red)" />
        <rect x="10" y="12" width="3" height="1" fill="var(--tc-red)" />
      </svg>
    </span>
  );
}

/** Copy icon: two overlapping pixel sheets. */
export function CopyIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" fill="currentColor">
      <path d="M2 2h8v2H4v6H2V2zm4 4h8v8H6V6zm2 2v4h4V8H8z" />
    </svg>
  );
}

/** A pixel arrow pointing left or right. */
export function ArrowIcon({ flip }: { flip?: boolean }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" fill="currentColor" style={flip ? { transform: 'scaleX(-1)' } : undefined} shapeRendering="crispEdges">
      <path d="M2 7h8V5h2v2h2v2h-2v2h-2V9H2V7z" />
    </svg>
  );
}

/** Sound: a small speaker, with waves when on. */
export function SoundIcon({ on }: { on: boolean }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" fill="currentColor">
      <path d="M2 6h3l4-3v10l-4-3H2V6z" />
      {on && <path d="M11 5h2v6h-2V5zm3-2h1v10h-1V3z" />}
    </svg>
  );
}

export function Star({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" aria-hidden="true" fill="currentColor" shapeRendering="crispEdges">
      <path d="M7 1h2v4h4v2h-2v2h2v2h-2v2h-2v2H7v-2H5v-2H3V9h2V7H3V5h4V1z" />
    </svg>
  );
}

export function BulletHole({ x, y }: { x: number; y: number }) {
  return (
    <svg className="b-arena__hole" style={{ left: `${x}%`, top: `${y}%` }} viewBox="0 0 34 34" aria-hidden="true">
      {[0, 40, 85, 130, 175, 220, 265, 310].map((a, i) => {
        const r = (a * Math.PI) / 180;
        const len = 10 + (i % 3) * 3;
        return <line key={a} x1={17 + Math.cos(r) * 6} y1={17 + Math.sin(r) * 6} x2={17 + Math.cos(r) * (6 + len)} y2={17 + Math.sin(r) * (6 + len)} stroke="var(--night)" strokeWidth="1.2" strokeOpacity="0.8" />;
      })}
      <circle cx="17" cy="17" r="6" fill="var(--night)" />
      <circle cx="15.5" cy="15.5" r="2" fill="var(--tc-brown)" />
    </svg>
  );
}

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

/** A stepped band of terracotta: the ground under the bar's plank. */
export function Strata({ className }: { className?: string }) {
  const cls = ['b-strata', 'b-strata--top', className ?? ''].filter(Boolean).join(' ');
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

/** The sun as the game draws it: a square, not a disc. A white-hot core in
    a body of sunlight, inside a ring of glow that lets the sky through.
    Every player knows this shape from the sky over their own world, and no
    letter of the name beside it is square. */
export function Sun() {
  return (
    <svg viewBox="0 0 12 12" aria-hidden="true">
      <rect x="0" y="0" width="12" height="12" fill="currentColor" opacity="0.35" />
      <rect x="1" y="1" width="10" height="10" fill="currentColor" />
      <rect className="b-sun__core" x="3" y="3" width="6" height="6" />
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

/** The campfire in the footer: a three-frame pixel flame on two logs. A play
    night's fire is the same one; burnt down, only embers glow on the logs. */
export function Campfire({ embers = false, className }: { embers?: boolean; className?: string } = {}) {
  return (
    <span className={`b-fire${className ? ` ${className}` : ''}`} aria-hidden="true">
      <svg viewBox="0 0 16 16">
        {embers ? (
          <g>
            <rect x="5" y="10" width="2" height="1" fill="var(--ember)" />
            <rect x="8" y="9" width="1" height="2" fill="var(--ember)" />
            <rect x="10" y="10" width="1" height="1" fill="var(--sun)" />
          </g>
        ) : FLAMES.map((frame, i) => (
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
    <svg viewBox="0 0 16 16" aria-hidden="true" fill="currentColor" shapeRendering="crispEdges">
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

/** A pixel cross, the way out of anything that opens over the page. The
    system's own ✕ is not in any of the three faces, so it would be drawn
    smooth in a fallback font; this one is on the grid. */
export function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" aria-hidden="true" fill="currentColor" shapeRendering="crispEdges">
      <path d="M3 3h2v2H3zm2 2h2v2H5zm6-2h2v2h-2zm-2 2h2v2H9zM7 7h2v2H7zM5 9h2v2H5zm4 0h2v2H9zm-6 2h2v2H3zm8 0h2v2h-2z" />
    </svg>
  );
}

/** A pixel tick: an answer given. */
export function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" aria-hidden="true" fill="currentColor" shapeRendering="crispEdges">
      <path d="M12 3h2v2h-2zm-2 2h2v2h-2zM8 7h2v2H8zM6 9h2v2H6zM2 7h2v2H2zm2 2h2v2H4zm2 2h2v2H6z" />
    </svg>
  );
}

/** The world's tools, drawn so a phone can carry them as keys without words:
    the moon for night, the folded paper map with its trail to an X, and a
    framed picture. */
export function MoonIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" aria-hidden="true" fill="currentColor" shapeRendering="crispEdges">
      <path d="M4 0h8v2H4zM2 2h6v2H2zM0 4h6v6H0zm0 6h8v2H0zm14 0h2v2h-2zM2 12h12v2H2zm2 2h8v2H4z" />
    </svg>
  );
}

export function FoldedMapIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" aria-hidden="true" fill="currentColor" shapeRendering="crispEdges">
      <path fillRule="evenodd" d="M0 3h5v11H0zm1 7v2h2v-2z" />
      <path fillRule="evenodd" d="M5 1h6v11H5zm1 6v2h2V7z" opacity="0.55" />
      <path fillRule="evenodd" d="M11 3h5v11h-5zm1 2h1v1h-1zm2 0h1v1h-1zm-1 1h1v1h-1zm-1 1h1v1h-1zm2 0h1v1h-1z" />
    </svg>
  );
}

export function PictureIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" aria-hidden="true" fill="currentColor" shapeRendering="crispEdges">
      <path fillRule="evenodd" d="M1 2h14v12H1zm2 2v8h10V4z" />
      <path d="M10 5h2v2h-2zM6 7h2v1H6zM5 8h4v1H5zM4 9h6v1H4zm7 0h1v1h-1zm-7 1h8v2H4z" />
    </svg>
  );
}

/** A wall calendar: two rings, the month's band and a few days, for the day a fire is lit for. */
export function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" aria-hidden="true" fill="currentColor" shapeRendering="crispEdges">
      <path d="M4 0h2v2H4zm6 0h2v2h-2z" />
      <path fillRule="evenodd" d="M1 2h14v13H1zm1 4v8h12V6z" />
      <path d="M4 8h2v2H4zm3 0h2v2H7zm3 0h2v2h-2zm-6 3h2v2H4zm3 0h2v2H7z" />
    </svg>
  );
}

/** The pixel chevron: the way a month is turned, the way back up the evening. */
export function ChevronIcon({ dir, className }: { dir: 'left' | 'right' | 'down' | 'up'; className?: string }) {
  const d = {
    left:  'M9 3h2v2H9zM7 5h2v2H7zM5 7h2v2H5zm2 2h2v2H7zm2 2h2v2H9z',
    right: 'M5 3h2v2H5zm2 2h2v2H7zm2 2h2v2H9zM7 9h2v2H7zm-2 2h2v2H5z',
    down:  'M3 5h2v2H3zm2 2h2v2H5zm2 2h2v2H7zm2-2h2v2H9zm2-2h2v2h-2z',
    up:    'M7 5h2v2H7zM5 7h2v2H5zm4 0h2v2H9zM3 9h2v2H3zm8 0h2v2h-2z',
  }[dir];
  return (
    <svg className={className} viewBox="0 0 16 16" aria-hidden="true" fill="currentColor" shapeRendering="crispEdges">
      <path d={d} />
    </svg>
  );
}

/** Zoom in, zoom out and the whole map, for the painted sheet. */
export function ZoomIcon({ kind }: { kind: 'in' | 'out' | 'fit' }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" fill="currentColor" shapeRendering="crispEdges">
      {kind === 'in'  && <path d="M7 3h2v4h4v2H9v4H7V9H3V7h4z" />}
      {kind === 'out' && <path d="M3 7h10v2H3z" />}
      {kind === 'fit' && <path d="M2 2h5v2H4v3H2zm7 0h5v5h-2V4H9zM2 9h2v3h3v2H2zm10 0h2v5H9v-2h3z" />}
    </svg>
  );
}

/** Sound: a small pixel speaker, with two waves when on. */
export function SoundIcon({ on }: { on: boolean }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" fill="currentColor" shapeRendering="crispEdges">
      <path d="M2 6h3v4H2zM5 4h2v8H5zM7 2h2v12H7z" />
      {on && <path d="M11 5h2v6h-2zm3-2h1v10h-1z" />}
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

/** A bullet hole in the arena's sky: a pixel burst, drawn on the same grid as everything else. */
export function BulletHole({ x, y }: { x: number; y: number }) {
  return (
    <svg className="b-arena__hole" style={{ left: `${x}%`, top: `${y}%` }} viewBox="0 0 16 16" aria-hidden="true" shapeRendering="crispEdges">
      <g fill="var(--night)" fillOpacity="0.8">
        <path d="M7 0h2v4H7zM7 12h2v4H7zM0 7h4v2H0zM12 7h4v2h-4z" />
        <path d="M2 2h1v1H2zm1 1h1v1H3zm1 1h1v1H4zM13 2h1v1h-1zm-1 1h1v1h-1zm-1 1h1v1h-1zM2 13h1v1H2zm1-1h1v1H3zm1-1h1v1H4zM13 13h1v1h-1zm-1-1h1v1h-1zm-1-1h1v1h-1z" />
      </g>
      <rect x="5" y="5" width="6" height="6" fill="var(--night)" />
      <rect x="6" y="6" width="2" height="2" fill="var(--tc-brown)" />
    </svg>
  );
}

/* Engraved-line ornaments shared across the site. All inherit
   `currentColor` so the same shapes work in brass on walnut and
   in ink on parchment. */

export function Divider({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 260 22" fill="none" stroke="currentColor" strokeWidth="1" aria-hidden="true">
      <line x1="0" y1="11" x2="96" y2="11" />
      <line x1="164" y1="11" x2="260" y2="11" />
      <path d="M104 11 l7 -7 7 7 -7 7 z" />
      <path d="M142 11 l7 -7 7 7 -7 7 z" />
      <path d="M130 2 l2.6 6 6.4 0.6 -4.9 4.2 1.5 6.4 -5.6 -3.4 -5.6 3.4 1.5 -6.4 -4.9 -4.2 6.4 -0.6 z" fill="currentColor" stroke="none" />
      <circle cx="100" cy="11" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="160" cy="11" r="1.3" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function Corner({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 44 44" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true">
      <path d="M2 42 V10 Q2 2 10 2 H42" />
      <path d="M7 42 V14 Q7 7 14 7 H42" strokeOpacity="0.55" />
      <path d="M12 12 l5 -5 5 5 -5 5 z" fill="currentColor" stroke="none" />
      <circle cx="26" cy="7" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="7" cy="26" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function Star({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="11" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <path d="M12 3.5 l2.3 5.4 5.8 0.5 -4.4 3.8 1.3 5.7 -5 -3 -5 3 1.3 -5.7 -4.4 -3.8 5.8 -0.5 z" fill="currentColor" />
      <circle cx="12" cy="12" r="1.6" fill="var(--pitch)" />
    </svg>
  );
}

export function Lantern({ lit, className }: { lit: boolean; className?: string }) {
  return (
    <svg className={`f-lantern${lit ? ' is-lit' : ''}${className ? ` ${className}` : ''}`} viewBox="0 0 22 30" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true">
      <path d="M8 3 h6 M11 3 v3" />
      <path d="M5 6 h12 l1.5 4 h-15 z" />
      <path d="M4.5 10 v13 h13 v-13" />
      <path d="M4.5 23 l-1.5 3 h16 l-1.5 -3" />
      <path d="M8 12 v9 M14 12 v9" strokeOpacity="0.5" />
      <path className="flame" d="M11 20 c-2.2 -1.8 -2.4 -4 -0.6 -6 c0.2 1.2 0.8 1.6 1.4 2 c0.6 -1 0.6 -2 0.4 -3 c2.2 1.8 2.4 4.6 -1.2 7 z" fill="currentColor" stroke="none" />
    </svg>
  );
}

/* Deterministic ragged edge so server and client render the same path. */
function tornPath(seed: number): string {
  let s = seed;
  const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  const pts: string[] = ['M0 22'];
  for (let x = 0; x <= 1200; x += 24) pts.push(`L${x} ${(4 + rnd() * 14).toFixed(1)}`);
  pts.push('L1200 22 Z');
  return pts.join(' ');
}
const TORN_TOP = tornPath(11);
const TORN_BOTTOM = tornPath(29);

export function TornEdge({ side }: { side: 'top' | 'bottom' }) {
  return (
    <svg className={`f-torn f-torn--${side}`} viewBox="0 0 1200 22" preserveAspectRatio="none" aria-hidden="true">
      <path d={side === 'top' ? TORN_TOP : TORN_BOTTOM} />
    </svg>
  );
}

export function BulletHole({ x, y }: { x: number; y: number }) {
  return (
    <svg className="f-qd__hole" style={{ left: `${x}%`, top: `${y}%` }} viewBox="0 0 34 34" aria-hidden="true">
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

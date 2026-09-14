'use client';

import { useEffect, useRef } from 'react';

/* Fixed pseudo-random star field so server and client render the same SVG. */
function stars(count: number, seed = 7): Array<[number, number, number]> {
  const out: Array<[number, number, number]> = [];
  let s = seed;
  const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  for (let i = 0; i < count; i++) out.push([Math.round(rnd() * 1600), Math.round(rnd() * 480), 0.8 + rnd() * 1.6]);
  return out;
}
const STARS = stars(70);

function Cactus({ x, h, arms = 'both' }: { x: number; h: number; arms?: 'both' | 'left' | 'right' }) {
  const top = 900 - h;
  return (
    <g>
      <rect x={x - 11} y={top} width={22} height={h} rx={3} />
      {(arms === 'both' || arms === 'left') && (
        <>
          <rect x={x - 34} y={top + h * 0.35} width={24} height={12} rx={3} />
          <rect x={x - 34} y={top + h * 0.12} width={12} height={h * 0.28} rx={3} />
        </>
      )}
      {(arms === 'both' || arms === 'right') && (
        <>
          <rect x={x + 10} y={top + h * 0.45} width={24} height={12} rx={3} />
          <rect x={x + 22} y={top + h * 0.2} width={12} height={h * 0.3} rx={3} />
        </>
      )}
    </g>
  );
}

interface Props { online: boolean | null }

/** Full-bleed dusk landscape behind the hero. The sun is the server
    status: up when the server answers, a moon when it doesn't. Layers
    drift at different rates with scroll and pointer. */
export default function Landscape({ online }: Props) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const layers = Array.from(el.querySelectorAll<SVGGElement>('[data-depth]'));
    let mx = 0, my = 0, raf = 0;

    const paint = () => {
      raf = 0;
      const y = Math.min(window.scrollY, window.innerHeight);
      for (const l of layers) {
        const d = Number(l.dataset.depth);
        l.style.transform = `translate(${mx * d * 40}px, ${y * d * 0.45 + my * d * 16}px)`;
      }
    };
    const queue = () => { if (!raf) raf = requestAnimationFrame(paint); };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      mx = (e.clientX / window.innerWidth - 0.5) * 2;
      my = (e.clientY / window.innerHeight - 0.5) * 2;
      queue();
    };
    window.addEventListener('scroll', queue, { passive: true });
    window.addEventListener('pointermove', onMove, { passive: true });
    paint();
    return () => {
      window.removeEventListener('scroll', queue);
      window.removeEventListener('pointermove', onMove);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const cls = online === false ? 'f-land is-offline' : 'f-land';

  return (
    <div ref={root} className={cls} aria-hidden="true">
      <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice">
        <defs>
          <linearGradient id="fSky" x1="0" y1="0" x2="0" y2="1">
            <stop className="sky-top" offset="0" />
            <stop className="sky-mid" offset="0.55" />
            <stop className="sky-low" offset="1" />
          </linearGradient>
          <radialGradient id="fHalo" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0"   stopColor="#f2c66d" stopOpacity="0.55" />
            <stop offset="0.5" stopColor="#c9502a" stopOpacity="0.25" />
            <stop offset="1"   stopColor="#c9502a" stopOpacity="0" />
          </radialGradient>
        </defs>

        <rect width="1600" height="900" fill="url(#fSky)" />

        <g className="f-land__stars" fill="#f4e8d0">
          {STARS.map(([x, y, r], i) => <circle key={i} cx={x} cy={y} r={r} />)}
        </g>

        {/* sun (server online) */}
        <g className="f-land__sun f-land__sun--day">
          <circle className="f-land__halo" cx="900" cy="560" r="300" fill="url(#fHalo)" />
          <circle cx="900" cy="560" r="112" fill="#f2c66d" />
          <circle cx="900" cy="560" r="112" fill="#e8a13a" opacity="0.35" />
        </g>

        {/* moon (server offline) */}
        <g className="f-land__sun f-land__sun--night">
          <circle cx="640" cy="200" r="54" fill="#ddd6c6" />
          <circle cx="622" cy="186" r="9" fill="#c4bcaa" />
          <circle cx="656" cy="214" r="6" fill="#c4bcaa" />
          <circle cx="648" cy="180" r="4" fill="#c4bcaa" />
        </g>

        {/* far mesas */}
        <g className="f-land__layer" data-depth="0.18" fill="#3a1b33">
          <path d="M0 700 L120 700 L160 640 L260 640 L300 700 L420 700 L470 610 L560 610 L600 700 L700 700 L760 650 L900 650 L950 700 L1080 700 L1120 620 L1260 620 L1300 700 L1450 700 L1500 660 L1600 660 L1600 900 L0 900 Z" />
        </g>

        {/* buttes + windmill */}
        <g className="f-land__layer" data-depth="0.34" fill="#241019">
          <path d="M0 790 L200 790 L240 740 L330 740 L360 790 L520 790 L560 720 L640 720 L680 790 L860 790 L900 750 L1000 750 L1040 790 L1240 790 L1290 730 L1400 730 L1440 790 L1600 790 L1600 900 L0 900 Z" />
          <g stroke="#241019" strokeWidth="5" strokeLinecap="round">
            <line x1="686" y1="792" x2="697" y2="690" />
            <line x1="714" y1="792" x2="703" y2="690" />
            <line x1="690" y1="760" x2="710" y2="760" />
            <line x1="688" y1="730" x2="712" y2="730" />
            <line x1="695" y1="700" x2="705" y2="700" />
          </g>
          <g className="f-land__blades" stroke="#241019" strokeWidth="4" strokeLinecap="round">
            {[0, 45, 90, 135, 180, 225, 270, 315].map(a => (
              <g key={a} transform={`rotate(${a} 700 685)`}>
                <line x1="700" y1="685" x2="700" y2="640" />
                <line x1="700" y1="646" x2="712" y2="656" strokeWidth="7" />
              </g>
            ))}
            <circle cx="700" cy="685" r="5" fill="#241019" stroke="none" />
          </g>
        </g>

        {/* near ground, cacti, fence */}
        <g className="f-land__layer" data-depth="0.55" fill="#120b09">
          <path d="M0 855 Q400 828 800 848 T1600 842 L1600 900 L0 900 Z" />
          <Cactus x={230}  h={140} />
          <Cactus x={640}  h={110} arms="left" />
          <Cactus x={960}  h={165} />
          <Cactus x={1380} h={120} arms="right" />
          <g stroke="#120b09" strokeWidth="6" strokeLinecap="round">
            {[1060, 1130, 1200, 1270].map(x => <line key={x} x1={x} y1="845" x2={x} y2="800" />)}
            <line x1="1060" y1="812" x2="1270" y2="812" strokeWidth="4" />
            <line x1="1060" y1="830" x2="1270" y2="830" strokeWidth="4" />
          </g>
        </g>
      </svg>
    </div>
  );
}

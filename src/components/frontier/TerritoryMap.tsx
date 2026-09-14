'use client';

import { useEffect, useRef, useState } from 'react';
import type { MapLocation, MapZone, MapPath } from '@/lib/map-types';
import { DEFAULT_LOCATIONS, DEFAULT_ZONES, DEFAULT_PATHS } from '@/lib/map-types';
import SectionHead from './SectionHead';
import type { Plate } from './data';

const TYPE: Record<MapLocation['type'], string> = {
  surface: 'surface', underground: 'underground', island: 'island', aerial: 'from the air',
};

/* Survey sheet: sepia ink on aged paper, brass tacks for pins. */
const INK    = '#3b2719';
const PAPER  = '#e3d3ae';
const LAND   = '#d6c297';
const WATER  = '#6b7f7a';
const BRASS  = '#c9a24a';
const WAX    = '#9b3b2a';

const LAND_PATH = 'M 435 60 C 528 45, 674 78, 752 142 C 810 194, 822 262, 818 330 C 814 402, 786 460, 746 502 C 700 550, 635 582, 555 596 C 476 610, 396 604, 320 582 C 232 558, 155 512, 110 458 C 62 400, 50 336, 56 278 C 62 218, 88 166, 132 136 C 182 100, 298 70, 435 60 Z';

const pretty = (s: string) => s.toLowerCase().replace(/(^|\s)\S/g, c => c.toUpperCase());

interface Props { plates: Plate[] }

export default function TerritoryMap({ plates }: Props) {
  const [locations, setLocations] = useState<MapLocation[]>(DEFAULT_LOCATIONS);
  const [zones,     setZones]     = useState<MapZone[]>(DEFAULT_ZONES);
  const [paths,     setPaths]     = useState<MapPath[]>(DEFAULT_PATHS);
  const [selectedId, setSelected] = useState<number>(DEFAULT_LOCATIONS[0]?.id ?? 0);
  const [surveyed, setSurveyed]   = useState(false);
  const sheet = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/map')
      .then(r => (r.ok ? r.json() : null))
      .then((cfg: { locations?: MapLocation[]; zones?: MapZone[]; paths?: MapPath[] } | null) => {
        if (cfg?.locations?.length) setLocations(cfg.locations);
        if (cfg?.zones?.length)     setZones(cfg.zones);
        if (cfg?.paths)             setPaths(cfg.paths);
      })
      .catch(() => {});
  }, []);

  /* rivers and roads draw themselves once the sheet is in view */
  useEffect(() => {
    const el = sheet.current;
    if (!el || !('IntersectionObserver' in window)) { setSurveyed(true); return; }
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSurveyed(true); obs.disconnect(); } }, { threshold: 0.3 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const selected = locations.find(l => l.id === selectedId) ?? locations[0] ?? null;
  const plate    = selected ? plates.find(p => Number(p.id) === selected.id) ?? null : null;

  return (
    <section id="territory" className="f-band">
      <div className="f-wrap f-band__inner">
        <SectionHead
          kicker="Chapter II · Territory"
          title="The surveyor's map"
          lede="Every claim in the world, from the first base to the newest. Pick a tack or a name and its photograph comes up."
        />

        <div className="f-map">
          <div ref={sheet} className={`f-map__sheet${surveyed ? ' is-surveyed' : ''}`}>
            <svg viewBox="0 0 1000 650" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Survey map of the JOÐ world">
              <defs>
                <filter id="fBurn" x="-5%" y="-5%" width="110%" height="110%">
                  <feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="3" seed="4" result="n" />
                  <feDisplacementMap in="SourceGraphic" in2="n" scale="18" xChannelSelector="R" yChannelSelector="G" />
                </filter>
                <radialGradient id="fAge" cx="0.5" cy="0.5" r="0.72">
                  <stop offset="0.55" stopColor={PAPER} />
                  <stop offset="0.86" stopColor="#c9b184" />
                  <stop offset="1" stopColor="#7a5230" />
                </radialGradient>
                <pattern id="fHatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                  <line x1="0" y1="0" x2="0" y2="7" stroke={WATER} strokeOpacity="0.45" strokeWidth="1" />
                </pattern>
                <pattern id="fGrid" width="100" height="100" patternUnits="userSpaceOnUse">
                  <path d="M100 0 H0 V100" fill="none" stroke={INK} strokeOpacity="0.08" strokeWidth="1" />
                </pattern>
                <radialGradient id="fTack" cx="0.35" cy="0.3" r="0.8">
                  <stop offset="0" stopColor="#f0d98a" />
                  <stop offset="0.6" stopColor={BRASS} />
                  <stop offset="1" stopColor="#7a5c1e" />
                </radialGradient>
                <radialGradient id="fWax" cx="0.35" cy="0.3" r="0.8">
                  <stop offset="0" stopColor="#c25a45" />
                  <stop offset="0.7" stopColor={WAX} />
                  <stop offset="1" stopColor="#5e2116" />
                </radialGradient>
              </defs>

              {/* the sheet, with burnt, ragged edges */}
              <rect x="14" y="14" width="972" height="622" fill="url(#fAge)" filter="url(#fBurn)" />
              <rect x="14" y="14" width="972" height="622" fill="url(#fHatch)" filter="url(#fBurn)" opacity="0.9" />
              <rect x="14" y="14" width="972" height="622" fill="url(#fGrid)" />

              {/* landmass with contour offsets */}
              <path d={LAND_PATH} fill={LAND} stroke={INK} strokeWidth="1.5" />
              <path d={LAND_PATH} fill="none" stroke={INK} strokeOpacity="0.4" strokeWidth="0.8" transform="translate(500 325) scale(1.035) translate(-500 -325)" />
              <path d={LAND_PATH} fill="none" stroke={INK} strokeOpacity="0.2" strokeWidth="0.8" transform="translate(500 325) scale(1.07) translate(-500 -325)" />

              {zones.filter(z => z.kind === 'land').map(z => (
                <ellipse key={z.id} cx={z.cx} cy={z.cy} rx={z.rx} ry={z.ry} fill={LAND} stroke={INK} strokeOpacity="0.6" />
              ))}
              {zones.filter(z => z.kind === 'lake').map(z => (
                <g key={z.id}>
                  <ellipse cx={z.cx} cy={z.cy} rx={z.rx} ry={z.ry} fill="url(#fHatch)" stroke={INK} strokeOpacity="0.55" />
                  {z.label && <text x={z.cx} y={z.cy + z.ry + 14} textAnchor="middle" fill={INK} fillOpacity="0.7" fontSize="10" fontStyle="italic" fontFamily="var(--font-body)">{z.label}</text>}
                </g>
              ))}
              {zones.filter(z => z.kind === 'mountain').map(z => (
                <g key={z.id} fill="none" stroke={INK} strokeOpacity="0.75">
                  <polygon points={`${z.cx},${z.cy - z.ry} ${z.cx - z.rx},${z.cy + z.ry} ${z.cx + z.rx},${z.cy + z.ry}`} fill={PAPER} />
                  <line x1={z.cx} y1={z.cy - z.ry} x2={z.cx + z.rx * 0.35} y2={z.cy + z.ry * 0.4} />
                  {z.label && <text x={z.cx} y={z.cy + z.ry + 14} textAnchor="middle" fill={INK} fillOpacity="0.7" stroke="none" fontSize="10" fontStyle="italic" fontFamily="var(--font-body)">{z.label}</text>}
                </g>
              ))}

              {/* named regions */}
              {zones.filter(z => z.kind === 'zone').map(z => (
                <g key={z.id}>
                  <ellipse cx={z.cx} cy={z.cy} rx={z.rx} ry={z.ry} fill="none" stroke={WAX} strokeOpacity="0.75" strokeWidth="1.2" strokeDasharray="6 4" />
                  <text x={z.cx} y={z.cy - z.ry - 8} textAnchor="middle" fill={WAX} fontSize="11" fontFamily="var(--font-body)" fontWeight="600" letterSpacing="2">{z.label}</text>
                </g>
              ))}

              {/* rivers and roads, drawn on arrival */}
              {paths.map(p => {
                if (p.points.length < 2) return null;
                const pts = p.points.map(([x, y]) => `${x},${y}`).join(' ');
                const river = p.kind === 'river';
                return (
                  <g key={p.id} fill="none" strokeLinecap="round" strokeLinejoin="round">
                    {river && <polyline className="f-trail" points={pts} stroke={WATER} strokeOpacity="0.4" strokeWidth="7" />}
                    <polyline className="f-trail" points={pts} stroke={river ? WATER : INK} strokeWidth={river ? 2 : 1.5} strokeDasharray={p.kind === 'road' ? undefined : undefined} />
                  </g>
                );
              })}

              {/* mushroom isle and small rocks */}
              <ellipse cx="872" cy="260" rx="56" ry="44" fill={LAND} stroke={INK} strokeWidth="1.2" />
              {[[856, 247], [878, 238], [894, 256], [864, 268], [886, 272]].map(([x, y], i) => (
                <circle key={i} cx={x} cy={y} r="4" fill="none" stroke={WAX} strokeWidth="1.2" />
              ))}
              <ellipse cx="895" cy="490" rx="20" ry="14" fill={LAND} stroke={INK} strokeOpacity="0.7" />
              <ellipse cx="68"  cy="545" rx="24" ry="16" fill={LAND} stroke={INK} strokeOpacity="0.7" />
              <ellipse cx="780" cy="120" rx="16" ry="11" fill={LAND} stroke={INK} strokeOpacity="0.7" />

              {/* tacks */}
              {locations.map(loc => {
                const active = loc.id === selected?.id;
                return (
                  <g
                    key={loc.id}
                    className="f-pin"
                    onClick={() => setSelected(loc.id)}
                    role="button"
                    tabIndex={0}
                    aria-label={`${loc.label}, ${TYPE[loc.type]}`}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelected(loc.id); } }}
                  >
                    <circle className="f-pin__hit" cx={loc.x} cy={loc.y} r="26" />
                    {active && <circle cx={loc.x} cy={loc.y} r="22" fill="none" stroke={WAX} strokeWidth="1" strokeDasharray="3 3" />}
                    <g className="f-pin__body">
                      <ellipse cx={loc.x + 2} cy={loc.y + 3} rx="13" ry="12" fill={INK} fillOpacity="0.35" />
                      <circle cx={loc.x} cy={loc.y} r="13" fill={active ? 'url(#fWax)' : 'url(#fTack)'} stroke={INK} strokeWidth="1" />
                      <text x={loc.x} y={loc.y + 4.5} textAnchor="middle" fill={active ? '#f4ecd8' : INK} fontSize="12" fontWeight="700" fontFamily="var(--font-title)">{loc.id}</text>
                    </g>
                    {loc.type === 'underground' && <line x1={loc.x} y1={loc.y + 15} x2={loc.x} y2={loc.y + 27} stroke={INK} strokeWidth="1.5" strokeDasharray="2 2" />}
                    {loc.type === 'aerial' && <circle cx={loc.x} cy={loc.y - 21} r="5" fill="none" stroke={INK} strokeWidth="1.2" />}
                  </g>
                );
              })}

              {/* compass rose */}
              <g transform="translate(930 572)" fill="none" stroke={INK}>
                <circle r="30" strokeOpacity="0.7" />
                <circle r="22" strokeOpacity="0.35" />
                <path d="M0 -30 L6 -6 L0 -10 L-6 -6 Z" fill={WAX} stroke="none" />
                <path d="M0 30 L6 6 L0 10 L-6 6 Z M30 0 L6 6 L10 0 L6 -6 Z M-30 0 L-6 6 L-10 0 L-6 -6 Z" fill={INK} fillOpacity="0.7" stroke="none" />
                <path d="M0 -18 L4 -4 L0 -6 L-4 -4 Z M0 18 L4 4 L0 6 L-4 4 Z M18 0 L4 4 L6 0 L4 -4 Z M-18 0 L-4 4 L-6 0 L-4 -4 Z" fill={BRASS} stroke="none" transform="rotate(45)" />
                <circle r="2.2" fill={INK} stroke="none" />
                <text y="-36" textAnchor="middle" fill={INK} stroke="none" fontSize="12" fontWeight="700" fontFamily="var(--font-title)">N</text>
              </g>

              {/* title block */}
              <text x="40" y="52" fill={INK} fontSize="18" fontFamily="var(--font-wood)">JOÐ · Survival World</text>
              <text x="40" y="70" fill={INK} fillOpacity="0.7" fontSize="10" fontFamily="var(--font-body)" fontStyle="italic">{locations.length} claims surveyed · 2024 to {new Date().getFullYear()}</text>
              <rect x="30" y="30" width="940" height="590" fill="none" stroke={INK} strokeOpacity="0.55" strokeWidth="1" />
              <rect x="36" y="36" width="928" height="578" fill="none" stroke={INK} strokeOpacity="0.3" strokeWidth="0.6" />
            </svg>
          </div>

          <aside className="f-map__side">
            {selected && (
              <figure className="f-figure" aria-live="polite">
                {plate ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={plate.src} alt={plate.title} loading="lazy" />
                ) : (
                  <div style={{ aspectRatio: '16 / 10', background: 'var(--walnut)' }} />
                )}
                <figcaption>
                  <div className="f-figure__title">{selected.id}. {pretty(selected.label)}</div>
                  <div className="f-figure__sub">{selected.sublabel.toLowerCase().replace(/\s*·\s*/g, ', ')} · {TYPE[selected.type]}</div>
                </figcaption>
              </figure>
            )}

            <ol className="f-ledger-list">
              {locations.map(loc => (
                <li key={loc.id}>
                  <button className={loc.id === selected?.id ? 'is-active' : ''} onClick={() => setSelected(loc.id)}>
                    <span className="f-ledger-list__no">{loc.id}</span>
                    <span className="f-ledger-list__label">{pretty(loc.label)}</span>
                    <span className="f-leader" />
                    <span className="f-ledger-list__type">{TYPE[loc.type]}</span>
                  </button>
                </li>
              ))}
            </ol>
          </aside>
        </div>
      </div>
    </section>
  );
}

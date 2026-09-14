'use client';

import { useEffect, useState } from 'react';
import type { MapLocation, MapZone, MapPath } from '@/lib/map-types';
import { DEFAULT_LOCATIONS, DEFAULT_ZONES, DEFAULT_PATHS } from '@/lib/map-types';
import SectionHead from './SectionHead';
import type { Plate } from './data';

const TYPE: Record<MapLocation['type'], string> = {
  surface: 'surface', underground: 'underground', island: 'island', aerial: 'from the air',
};

/* Survey-sheet palette: paper, ink, one accent. */
const INK    = '#221a15';
const PAPER  = '#ece4d2';
const LAND   = '#e2d8c2';
const ACCENT = '#8c2f24';
const WATER  = '#5f7f88';

const LAND_PATH = 'M 435 60 C 528 45, 674 78, 752 142 C 810 194, 822 262, 818 330 C 814 402, 786 460, 746 502 C 700 550, 635 582, 555 596 C 476 610, 396 604, 320 582 C 232 558, 155 512, 110 458 C 62 400, 50 336, 56 278 C 62 218, 88 166, 132 136 C 182 100, 298 70, 435 60 Z';

interface Props { plates: Plate[] }

export default function TerritoryMap({ plates }: Props) {
  const [locations, setLocations] = useState<MapLocation[]>(DEFAULT_LOCATIONS);
  const [zones,     setZones]     = useState<MapZone[]>(DEFAULT_ZONES);
  const [paths,     setPaths]     = useState<MapPath[]>(DEFAULT_PATHS);
  const [selectedId, setSelected] = useState<number>(DEFAULT_LOCATIONS[0]?.id ?? 0);

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

  const selected = locations.find(l => l.id === selectedId) ?? locations[0] ?? null;
  const plate    = selected ? plates.find(p => Number(p.id) === selected.id) ?? null : null;

  return (
    <section id="territory" className="f-section">
      <div className="f-wrap f-cols">
        <SectionHead
          kicker="Territory"
          title="The map"
          lede="Every claim in the world, from the first base to the newest. Pick a pin or a name and its photograph comes up."
        />

        <div>
          <div className="f-map__frame">
            <svg viewBox="0 0 1000 650" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Survey map of the JOÐ world">
              <defs>
                <pattern id="fHatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                  <line x1="0" y1="0" x2="0" y2="6" stroke={WATER} strokeOpacity="0.35" strokeWidth="1" />
                </pattern>
                <pattern id="fGrid" width="100" height="100" patternUnits="userSpaceOnUse">
                  <path d="M100 0 H0 V100" fill="none" stroke={INK} strokeOpacity="0.07" strokeWidth="1" />
                </pattern>
              </defs>

              <rect width="1000" height="650" fill={PAPER} />
              <rect width="1000" height="650" fill="url(#fHatch)" />
              <rect width="1000" height="650" fill="url(#fGrid)" />

              {/* landmass, with two faint contour offsets */}
              <path d={LAND_PATH} fill={LAND} stroke={INK} strokeWidth="1.4" />
              <path d={LAND_PATH} fill="none" stroke={INK} strokeOpacity="0.28" strokeWidth="0.8" transform="translate(500 325) scale(1.035) translate(-500 -325)" />
              <path d={LAND_PATH} fill="none" stroke={INK} strokeOpacity="0.14" strokeWidth="0.8" transform="translate(500 325) scale(1.07) translate(-500 -325)" />

              {/* terrain from the admin editor */}
              {zones.filter(z => z.kind === 'land').map(z => (
                <ellipse key={z.id} cx={z.cx} cy={z.cy} rx={z.rx} ry={z.ry} fill={LAND} stroke={INK} strokeOpacity="0.5" />
              ))}
              {zones.filter(z => z.kind === 'lake').map(z => (
                <g key={z.id}>
                  <ellipse cx={z.cx} cy={z.cy} rx={z.rx} ry={z.ry} fill="url(#fHatch)" stroke={INK} strokeOpacity="0.4" />
                  {z.label && <text x={z.cx} y={z.cy + z.ry + 14} textAnchor="middle" fill={INK} fillOpacity="0.6" fontSize="10" fontStyle="italic">{z.label}</text>}
                </g>
              ))}
              {zones.filter(z => z.kind === 'mountain').map(z => (
                <g key={z.id} fill="none" stroke={INK} strokeOpacity="0.6">
                  <polygon points={`${z.cx},${z.cy - z.ry} ${z.cx - z.rx},${z.cy + z.ry} ${z.cx + z.rx},${z.cy + z.ry}`} />
                  <line x1={z.cx} y1={z.cy - z.ry} x2={z.cx + z.rx * 0.35} y2={z.cy + z.ry * 0.4} />
                  {z.label && <text x={z.cx} y={z.cy + z.ry + 14} textAnchor="middle" fill={INK} fillOpacity="0.6" stroke="none" fontSize="10" fontStyle="italic">{z.label}</text>}
                </g>
              ))}

              {/* named regions */}
              {zones.filter(z => z.kind === 'zone').map(z => (
                <g key={z.id}>
                  <ellipse cx={z.cx} cy={z.cy} rx={z.rx} ry={z.ry} fill="none" stroke={ACCENT} strokeOpacity="0.7" strokeWidth="1.2" strokeDasharray="6 4" />
                  <text x={z.cx} y={z.cy - z.ry - 8} textAnchor="middle" fill={ACCENT} fontSize="11" className="f-map__text" letterSpacing="1">{z.label}</text>
                </g>
              ))}

              {/* rivers and roads */}
              {paths.map(p => {
                if (p.points.length < 2) return null;
                const pts = p.points.map(([x, y]) => `${x},${y}`).join(' ');
                const river = p.kind === 'river';
                return (
                  <g key={p.id} fill="none" strokeLinecap="round" strokeLinejoin="round">
                    {river && <polyline points={pts} stroke={WATER} strokeOpacity="0.35" strokeWidth="7" />}
                    <polyline points={pts} stroke={river ? WATER : INK} strokeWidth={river ? 2 : 1.5} strokeDasharray={p.kind === 'road' ? '5 4' : p.kind === 'border' ? '2 3' : undefined} />
                  </g>
                );
              })}

              {/* mushroom isle and small rocks */}
              <ellipse cx="872" cy="260" rx="56" ry="44" fill={LAND} stroke={INK} strokeWidth="1.2" />
              {[[856, 247], [878, 238], [894, 256], [864, 268], [886, 272]].map(([x, y], i) => (
                <circle key={i} cx={x} cy={y} r="4" fill="none" stroke={ACCENT} strokeWidth="1.2" />
              ))}
              <ellipse cx="895" cy="490" rx="20" ry="14" fill={LAND} stroke={INK} strokeOpacity="0.6" />
              <ellipse cx="68"  cy="545" rx="24" ry="16" fill={LAND} stroke={INK} strokeOpacity="0.6" />
              <ellipse cx="780" cy="120" rx="16" ry="11" fill={LAND} stroke={INK} strokeOpacity="0.6" />

              {/* pins */}
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
                    {active && <circle cx={loc.x} cy={loc.y} r="22" fill="none" stroke={ACCENT} strokeWidth="1" strokeDasharray="3 3" />}
                    <g className="f-pin__body">
                      <circle cx={loc.x} cy={loc.y} r="13" fill={active ? ACCENT : INK} stroke={PAPER} strokeWidth="2" />
                      <text x={loc.x} y={loc.y + 4.5} textAnchor="middle" fill={PAPER} fontSize="12" fontWeight="600" className="f-map__text">{loc.id}</text>
                    </g>
                    {loc.type === 'underground' && <line x1={loc.x} y1={loc.y + 15} x2={loc.x} y2={loc.y + 27} stroke={INK} strokeWidth="1.5" strokeDasharray="2 2" />}
                    {loc.type === 'aerial' && <circle cx={loc.x} cy={loc.y - 21} r="5" fill="none" stroke={INK} strokeWidth="1.2" />}
                  </g>
                );
              })}

              {/* compass and title block */}
              <g transform="translate(936 574)" fill="none" stroke={INK}>
                <circle r="24" strokeOpacity="0.6" />
                <line x1="0" y1="-18" x2="0" y2="18" strokeOpacity="0.6" />
                <line x1="-18" y1="0" x2="18" y2="0" strokeOpacity="0.6" />
                <polygon points="0,-22 4,-7 -4,-7" fill={ACCENT} stroke="none" />
                <text y="-29" textAnchor="middle" fill={INK} stroke="none" fontSize="11" className="f-map__text">N</text>
              </g>
              <text x="24" y="38" fill={INK} fontSize="13" fontWeight="600" className="f-map__text">JOÐ · survival world</text>
              <text x="24" y="56" fill={INK} fillOpacity="0.6" fontSize="10" className="f-map__text">{locations.length} claims · surveyed 2024–{String(new Date().getFullYear()).slice(-2)}</text>
              <rect x="8" y="8" width="984" height="634" fill="none" stroke={INK} strokeWidth="1.2" />
            </svg>
          </div>

          <div className="f-map__grid">
            <ol className="f-loclist">
              {locations.map(loc => (
                <li key={loc.id}>
                  <button className={loc.id === selected?.id ? 'is-active' : ''} onClick={() => setSelected(loc.id)}>
                    <span className="f-loclist__no">{loc.id}</span>
                    <span className="f-loclist__label">{loc.label.toLowerCase().replace(/(^|\s)\S/g, s => s.toUpperCase())}</span>
                    <span className="f-loclist__type">{TYPE[loc.type]}</span>
                  </button>
                </li>
              ))}
            </ol>

            {selected && (
              <figure className="f-figure" aria-live="polite">
                {plate ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={plate.src} alt={plate.title} loading="lazy" />
                ) : (
                  <div style={{ aspectRatio: '16 / 10', border: '1px solid var(--rule)', borderRadius: 'var(--radius)', background: 'var(--paper-2)' }} />
                )}
                <figcaption>
                  <div className="f-figure__title">{selected.id}. {selected.label.toLowerCase().replace(/(^|\s)\S/g, s => s.toUpperCase())}</div>
                  <div className="f-figure__sub">{selected.sublabel.toLowerCase().replace(/\s*·\s*/g, ', ')} · {TYPE[selected.type]}</div>
                </figcaption>
              </figure>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

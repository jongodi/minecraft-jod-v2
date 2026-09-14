'use client';

import { useEffect, useState } from 'react';
import type { MapLocation, MapZone, MapPath } from '@/lib/map-types';
import { DEFAULT_LOCATIONS, DEFAULT_ZONES, DEFAULT_PATHS } from '@/lib/map-types';
import SectionHead from './SectionHead';
import type { Plate } from './data';

const TYPE: Record<MapLocation['type'], { label: string; color: string }> = {
  surface:     { label: 'Surface',     color: '#8f9d6e' },
  underground: { label: 'Underground', color: '#e8a13a' },
  island:      { label: 'Island',      color: '#d0532f' },
  aerial:      { label: 'Aerial',      color: '#6fa3a8' },
};

const ZONE_COLOR: Record<MapZone['colorKey'], string> = {
  purple: '#a86f8f', blue: '#6fa3a8', orange: '#d0532f', green: '#8f9d6e',
};

const SAND = '#e6cfa3';
const INK  = '#120b09';

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
    <section id="territory" className="f-section f-section--tint">
      <div className="f-wrap">
        <SectionHead
          no="02"
          kicker="Territory"
          title="The lay of the land"
          lede="Every claim on the survival map, old base to new. Pick a pin or a name and the matching screenshot comes up."
        />

        <div className="f-map f-reveal">
          <div className="f-map__frame">
            <svg viewBox="0 0 1000 650" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Map of the JOÐ world">
              <defs>
                <pattern id="fGrid" width="50" height="50" patternUnits="userSpaceOnUse">
                  <path d="M50 0 H0 V50" fill="none" stroke={SAND} strokeOpacity="0.06" strokeWidth="1" />
                </pattern>
                <radialGradient id="fMapLand" cx="0.5" cy="0.45" r="0.6">
                  <stop offset="0" stopColor="#3a2519" />
                  <stop offset="1" stopColor="#2b1b13" />
                </radialGradient>
              </defs>

              <rect width="1000" height="650" fill="#1f130e" />
              <rect width="1000" height="650" fill="url(#fGrid)" />

              {/* landmass with two contour offsets */}
              <path
                d="M 435 60 C 528 45, 674 78, 752 142 C 810 194, 822 262, 818 330 C 814 402, 786 460, 746 502 C 700 550, 635 582, 555 596 C 476 610, 396 604, 320 582 C 232 558, 155 512, 110 458 C 62 400, 50 336, 56 278 C 62 218, 88 166, 132 136 C 182 100, 298 70, 435 60 Z"
                fill="url(#fMapLand)" stroke={SAND} strokeOpacity="0.35" strokeWidth="1.5"
              />
              <path
                d="M 435 60 C 528 45, 674 78, 752 142 C 810 194, 822 262, 818 330 C 814 402, 786 460, 746 502 C 700 550, 635 582, 555 596 C 476 610, 396 604, 320 582 C 232 558, 155 512, 110 458 C 62 400, 50 336, 56 278 C 62 218, 88 166, 132 136 C 182 100, 298 70, 435 60 Z"
                fill="none" stroke={SAND} strokeOpacity="0.12" strokeWidth="1" transform="translate(500 325) scale(1.04) translate(-500 -325)"
              />
              <path
                d="M 435 60 C 528 45, 674 78, 752 142 C 810 194, 822 262, 818 330 C 814 402, 786 460, 746 502 C 700 550, 635 582, 555 596 C 476 610, 396 604, 320 582 C 232 558, 155 512, 110 458 C 62 400, 50 336, 56 278 C 62 218, 88 166, 132 136 C 182 100, 298 70, 435 60 Z"
                fill="none" stroke={SAND} strokeOpacity="0.06" strokeWidth="1" transform="translate(500 325) scale(1.08) translate(-500 -325)"
              />

              {/* land patches and lakes from the admin map editor */}
              {zones.filter(z => z.kind === 'land').map(z => (
                <ellipse key={z.id} cx={z.cx} cy={z.cy} rx={z.rx} ry={z.ry} fill={ZONE_COLOR[z.colorKey]} fillOpacity="0.14" stroke={SAND} strokeOpacity="0.25" />
              ))}
              {zones.filter(z => z.kind === 'lake').map(z => (
                <g key={z.id}>
                  <ellipse cx={z.cx} cy={z.cy} rx={z.rx} ry={z.ry} fill="#6fa3a8" fillOpacity="0.28" />
                  {z.label && <text x={z.cx} y={z.cy + z.ry + 14} textAnchor="middle" fill="#6fa3a8" fontSize="9" className="f-pin__label">{z.label}</text>}
                </g>
              ))}
              {zones.filter(z => z.kind === 'mountain').map(z => (
                <g key={z.id}>
                  <polygon points={`${z.cx},${z.cy - z.ry} ${z.cx - z.rx},${z.cy + z.ry} ${z.cx + z.rx},${z.cy + z.ry}`} fill="#3a2519" stroke={SAND} strokeOpacity="0.3" />
                  <polygon points={`${z.cx},${z.cy - z.ry} ${z.cx - z.rx * 0.35},${z.cy - z.ry * 0.3} ${z.cx + z.rx * 0.35},${z.cy - z.ry * 0.3}`} fill={SAND} fillOpacity="0.45" />
                  {z.label && <text x={z.cx} y={z.cy + z.ry + 14} textAnchor="middle" fill={SAND} fillOpacity="0.6" fontSize="9" className="f-pin__label">{z.label}</text>}
                </g>
              ))}

              {/* named regions */}
              {zones.filter(z => z.kind === 'zone').map(z => (
                <g key={z.id}>
                  <ellipse cx={z.cx} cy={z.cy} rx={z.rx} ry={z.ry} fill={ZONE_COLOR[z.colorKey]} fillOpacity="0.06" stroke={ZONE_COLOR[z.colorKey]} strokeOpacity="0.55" strokeWidth="1.4" strokeDasharray="7 5" />
                  <text x={z.cx} y={z.cy + z.ry + 16} textAnchor="middle" fill={ZONE_COLOR[z.colorKey]} fontSize="10" className="f-pin__label">{z.label}</text>
                </g>
              ))}

              {/* rivers and roads */}
              {paths.map(p => {
                if (p.points.length < 2) return null;
                const pts = p.points.map(([x, y]) => `${x},${y}`).join(' ');
                const c = ZONE_COLOR[p.colorKey];
                return (
                  <g key={p.id} fill="none" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points={pts} stroke={c} strokeOpacity="0.2" strokeWidth="10" />
                    <polyline points={pts} stroke={c} strokeOpacity="0.85" strokeWidth="2.5" strokeDasharray={p.kind === 'road' ? '6 6' : undefined} />
                  </g>
                );
              })}

              {/* mushroom isle + small rocks */}
              <ellipse cx="872" cy="260" rx="56" ry="44" fill="#d0532f" fillOpacity="0.16" stroke="#d0532f" strokeOpacity="0.5" />
              {[[856, 247], [878, 238], [894, 256], [864, 268], [886, 272]].map(([x, y], i) => (
                <circle key={i} cx={x} cy={y} r="4.5" fill="#d0532f" fillOpacity="0.6" />
              ))}
              <ellipse cx="895" cy="490" rx="20" ry="14" fill="#3a2519" stroke={SAND} strokeOpacity="0.25" />
              <ellipse cx="68"  cy="545" rx="24" ry="16" fill="#3a2519" stroke={SAND} strokeOpacity="0.25" />
              <ellipse cx="780" cy="120" rx="16" ry="11" fill="#3a2519" stroke={SAND} strokeOpacity="0.25" />

              {/* pins */}
              {locations.map(loc => {
                const t = TYPE[loc.type];
                const active = loc.id === selected?.id;
                return (
                  <g
                    key={loc.id}
                    className={`f-pin${active ? ' is-active' : ''}`}
                    onClick={() => setSelected(loc.id)}
                    role="button"
                    tabIndex={0}
                    aria-label={`${loc.label}, ${t.label}`}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelected(loc.id); } }}
                  >
                    <circle className="f-pin__hit" cx={loc.x} cy={loc.y} r="26" />
                    {active && <circle className="f-pin__ring" cx={loc.x} cy={loc.y} r="23" fill="none" stroke={t.color} strokeWidth="1.5" strokeDasharray="3 3" />}
                    <g className="f-pin__body">
                      <circle cx={loc.x} cy={loc.y} r="14" fill={t.color} stroke={INK} strokeWidth="2" />
                      <text x={loc.x} y={loc.y + 4.5} textAnchor="middle" fill={INK} fontSize="13" className="f-pin__label">{loc.id}</text>
                    </g>
                    {loc.type === 'underground' && (
                      <line x1={loc.x} y1={loc.y + 16} x2={loc.x} y2={loc.y + 28} stroke={t.color} strokeWidth="1.5" strokeDasharray="2 2" />
                    )}
                    {loc.type === 'aerial' && (
                      <ellipse cx={loc.x} cy={loc.y - 23} rx="5" ry="6" fill="none" stroke={t.color} strokeWidth="1.2" />
                    )}
                  </g>
                );
              })}

              {/* compass */}
              <g transform="translate(930 578)" stroke={SAND} strokeOpacity="0.7" fill="none">
                <circle r="26" />
                <line x1="0" y1="-20" x2="0" y2="20" />
                <line x1="-20" y1="0" x2="20" y2="0" />
                <polygon points="0,-24 5,-8 -5,-8" fill="#d0532f" stroke="none" />
                <text y="-32" textAnchor="middle" fill={SAND} stroke="none" fontSize="11" className="f-pin__label">N</text>
              </g>

              {/* title block */}
              <text x="26" y="40" fill={SAND} fontSize="16" className="f-pin__label">JOÐ · SURVIVAL WORLD</text>
              <text x="26" y="58" fill={SAND} fillOpacity="0.6" fontSize="10" className="f-pin__label">{locations.length} CLAIMS · SURVEYED 2024–{new Date().getFullYear().toString().slice(-2)}</text>
              <rect x="10" y="10" width="980" height="630" fill="none" stroke={SAND} strokeOpacity="0.4" strokeWidth="1.5" />
            </svg>
          </div>

          <aside className="f-map__side">
            {selected && (
              <div className="f-map__detail" aria-live="polite">
                {plate && (
                  <div className="f-map__detail-img">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={plate.src} alt={plate.title} loading="lazy" />
                  </div>
                )}
                <div className="f-map__detail-body">
                  <div className="f-map__detail-kicker f-label">
                    <span>Claim {String(selected.id).padStart(2, '0')}</span>
                    <span style={{ color: TYPE[selected.type].color }}>{TYPE[selected.type].label}</span>
                  </div>
                  <div className="f-map__detail-title">{selected.label}</div>
                  <div className="f-map__detail-sub">{selected.sublabel.toLowerCase().replace(/\s*·\s*/g, ', ')}</div>
                </div>
              </div>
            )}

            <ul className="f-map__list">
              {locations.map(loc => (
                <li key={loc.id}>
                  <button
                    className={`f-map__item${loc.id === selected?.id ? ' is-active' : ''}`}
                    onClick={() => setSelected(loc.id)}
                  >
                    <span className="f-map__item-no">{loc.id}</span>
                    <span className="f-map__item-dot" style={{ background: TYPE[loc.type].color }} />
                    <span className="f-map__item-label">{loc.label}</span>
                  </button>
                </li>
              ))}
            </ul>

            <div className="f-map__legend f-label">
              {(Object.keys(TYPE) as Array<keyof typeof TYPE>).map(k => (
                <span key={k}><span className="f-map__item-dot" style={{ background: TYPE[k].color }} />{TYPE[k].label}</span>
              ))}
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}

'use client';

import { useState, useEffect } from 'react';
import type { MapLocation, MapZone, MapPath } from '@/lib/map-types';
import { DEFAULT_LOCATIONS, DEFAULT_ZONES, DEFAULT_PATHS } from '@/lib/map-types';

/* ─── western colour tokens (mirrors CSS vars) ───────────────────────────── */
const C = {
  paper:    '#ECD9A8',
  paper2:   '#DCC58A',
  paper3:   '#C8AC74',
  ink:      '#2A1410',
  inkSoft:  '#5C3A28',
  inkMid:   '#7A4F33',
  terra:    '#B84D2A',
  burnt:    '#8C2D17',
  cactus:   '#6B7A3F',
  sage:     '#8F9D6E',
  sky:      '#4A8B95',
  dust:     '#D49A5A',
  leather:  '#7E4F2A',
  rope:     '#B58851',
  gold:     '#D9A23B',
  cream:    '#F5E8C4',
} as const;

const TYPE_COLOR: Record<string, string> = {
  surface:     C.cactus,
  underground: C.leather,
  island:      C.terra,
  aerial:      C.sky,
};

const TYPE_LABEL: Record<string, string> = {
  surface:     'SURFACE',
  underground: 'UNDERGROUND',
  island:      'ISLAND',
  aerial:      'AERIAL',
};

/* ─── pin ─────────────────────────────────────────────────────────────────── */
function WesternPin({ loc, index, total, selected, onClick }: {
  loc: MapLocation; index: number; total: number;
  selected: boolean; onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const color   = TYPE_COLOR[loc.type];
  const flipLeft = loc.x > 820;
  const flipUp   = loc.y > 540;

  return (
    <g
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
      style={{ cursor: 'pointer' }}
    >
      {/* pulse ring */}
      <circle cx={loc.x} cy={loc.y} r={10} fill="none" stroke={color} strokeWidth={0.8} opacity={0.18}>
        <animate attributeName="r"       values="8;18;8"    dur="3.5s" repeatCount="indefinite" begin={`${index * 0.45}s`}/>
        <animate attributeName="opacity" values="0.25;0;0.25" dur="3.5s" repeatCount="indefinite" begin={`${index * 0.45}s`}/>
      </circle>

      {/* selection ring */}
      {selected && (
        <circle cx={loc.x} cy={loc.y} r={13} fill="none" stroke={color} strokeWidth={1.5} opacity={0.55}
          strokeDasharray="4 2"
        />
      )}

      {/* cross-hair tick marks */}
      <line x1={loc.x - 13} y1={loc.y} x2={loc.x - 7} y2={loc.y} stroke={color} strokeWidth={0.9} opacity={hovered ? 0.9 : 0.38}/>
      <line x1={loc.x + 7}  y1={loc.y} x2={loc.x + 13} y2={loc.y} stroke={color} strokeWidth={0.9} opacity={hovered ? 0.9 : 0.38}/>
      <line x1={loc.x} y1={loc.y - 13} x2={loc.x} y2={loc.y - 7}  stroke={color} strokeWidth={0.9} opacity={hovered ? 0.9 : 0.38}/>
      <line x1={loc.x} y1={loc.y + 7}  x2={loc.x} y2={loc.y + 13} stroke={color} strokeWidth={0.9} opacity={hovered ? 0.9 : 0.38}/>

      {/* pin diamond */}
      <rect
        x={loc.x - (hovered ? 5.5 : 4)}
        y={loc.y - (hovered ? 5.5 : 4)}
        width={hovered ? 11 : 8}
        height={hovered ? 11 : 8}
        fill={color}
        stroke={C.ink}
        strokeWidth={0.8}
        transform={`rotate(45 ${loc.x} ${loc.y})`}
        opacity={hovered ? 1 : 0.85}
        style={{ transition: 'all 0.18s ease' }}
      />

      {/* underground indicator */}
      {loc.type === 'underground' && (
        <>
          <line x1={loc.x} y1={loc.y + 8} x2={loc.x} y2={loc.y + 20} stroke={color} strokeWidth={1} strokeDasharray="2 2" opacity={0.45}/>
          <polygon points={`${loc.x - 4},${loc.y + 24} ${loc.x + 4},${loc.y + 24} ${loc.x},${loc.y + 30}`} fill={color} opacity={0.4}/>
        </>
      )}

      {/* aerial indicator */}
      {loc.type === 'aerial' && (
        <>
          <ellipse cx={loc.x} cy={loc.y - 15} rx={5} ry={6} fill="none" stroke={color} strokeWidth={0.8} opacity={0.45}/>
          <line x1={loc.x} y1={loc.y - 9} x2={loc.x} y2={loc.y - 5} stroke={color} strokeWidth={0.7} opacity={0.45}/>
        </>
      )}

      {/* tooltip */}
      {hovered && (
        <g>
          <rect
            x={flipLeft ? loc.x - 158 : loc.x + 16}
            y={flipUp   ? loc.y - 62  : loc.y - 10}
            width={142}
            height={54}
            fill={C.cream}
            stroke={C.ink}
            strokeWidth={1.2}
          />
          {/* top colour bar */}
          <rect
            x={flipLeft ? loc.x - 158 : loc.x + 16}
            y={flipUp   ? loc.y - 62  : loc.y - 10}
            width={142}
            height={14}
            fill={color}
          />
          <text
            x={flipLeft ? loc.x - 150 : loc.x + 24}
            y={flipUp   ? loc.y - 52  : loc.y}
            fill={C.cream}
            fontFamily="'IM Fell English SC', serif"
            fontSize={7}
            letterSpacing={1.2}
          >
            {String(loc.id).padStart(2, '0')} / {String(total).padStart(2, '0')} · {TYPE_LABEL[loc.type]}
          </text>
          <text
            x={flipLeft ? loc.x - 150 : loc.x + 24}
            y={flipUp   ? loc.y - 34  : loc.y + 18}
            fill={C.ink}
            fontFamily="'IM Fell English SC', serif"
            fontSize={11}
            fontWeight={700}
            letterSpacing={0.5}
          >
            {loc.label}
          </text>
          <text
            x={flipLeft ? loc.x - 150 : loc.x + 24}
            y={flipUp   ? loc.y - 22  : loc.y + 30}
            fill={C.inkSoft}
            fontFamily="'Special Elite', monospace"
            fontSize={7}
            letterSpacing={0.8}
          >
            {loc.sublabel}
          </text>
        </g>
      )}
    </g>
  );
}

/* ─── western zone / land colours ───────────────────────────────────────── */
const LAND_FILLS: Record<string, string> = {
  purple: 'rgba(124,79,50,0.15)',
  blue:   'rgba(74,139,149,0.12)',
  orange: 'rgba(184,77,42,0.12)',
  green:  'rgba(107,122,63,0.14)',
};

const ZONE_STYLES: Record<string, { stroke: string; fill: string }> = {
  purple: { stroke: 'rgba(140,45,23,0.35)',  fill: 'rgba(140,45,23,0.07)'  },
  blue:   { stroke: 'rgba(74,139,149,0.35)', fill: 'rgba(74,139,149,0.07)' },
  orange: { stroke: 'rgba(184,77,42,0.35)',  fill: 'rgba(184,77,42,0.07)'  },
  green:  { stroke: 'rgba(107,122,63,0.35)', fill: 'rgba(107,122,63,0.07)' },
};

const PATH_COLORS: Record<string, { outer: string; mid: string; inner: string }> = {
  blue:   { outer: 'rgba(74,139,149,0.15)',  mid: 'rgba(74,139,149,0.4)',  inner: 'rgba(74,139,149,0.7)'  },
  orange: { outer: 'rgba(184,77,42,0.15)',   mid: 'rgba(184,77,42,0.4)',   inner: 'rgba(184,77,42,0.7)'   },
  green:  { outer: 'rgba(107,122,63,0.15)',  mid: 'rgba(107,122,63,0.4)',  inner: 'rgba(107,122,63,0.7)'  },
  purple: { outer: 'rgba(140,45,23,0.15)',   mid: 'rgba(140,45,23,0.4)',   inner: 'rgba(140,45,23,0.7)'   },
};

/* ─── main component ──────────────────────────────────────────────────────── */
export default function WesternMap() {
  const [selected,  setSelected]  = useState<MapLocation | null>(null);
  const [locations, setLocations] = useState<MapLocation[]>(DEFAULT_LOCATIONS);
  const [zones,     setZones]     = useState<MapZone[]>(DEFAULT_ZONES);
  const [paths,     setPaths]     = useState<MapPath[]>(DEFAULT_PATHS);

  useEffect(() => {
    fetch('/api/map')
      .then(r => r.ok ? r.json() : null)
      .then((cfg: { locations?: MapLocation[]; zones?: MapZone[]; paths?: MapPath[] } | null) => {
        if (cfg?.locations?.length) setLocations(cfg.locations);
        if (cfg?.zones?.length)     setZones(cfg.zones);
        if (cfg?.paths)             setPaths(cfg.paths);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="w-wmap w-reveal" data-no-shoot="">

      {/* SVG map */}
      <div className="w-wmap__frame">
        <svg
          viewBox="0 0 1000 650"
          xmlns="http://www.w3.org/2000/svg"
          style={{ width: '100%', height: '100%', display: 'block' }}
        >
          <defs>
            {/* parchment vignette */}
            <radialGradient id="wVignette" cx="50%" cy="50%" r="65%">
              <stop offset="55%" stopColor="transparent"/>
              <stop offset="100%" stopColor={C.paper3} stopOpacity={0.6}/>
            </radialGradient>
            {/* land gradient */}
            <radialGradient id="wLand" cx="50%" cy="45%" r="55%">
              <stop offset="0%"   stopColor={C.paper2}/>
              <stop offset="100%" stopColor={C.paper3}/>
            </radialGradient>
            {/* paper texture overlay */}
            <filter id="wPaper">
              <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" result="noise"/>
              <feColorMatrix type="saturate" values="0" in="noise" result="greyNoise"/>
              <feBlend in="SourceGraphic" in2="greyNoise" mode="multiply" result="blend"/>
              <feComponentTransfer in="blend">
                <feFuncA type="linear" slope="1"/>
              </feComponentTransfer>
            </filter>
          </defs>

          {/* base parchment */}
          <rect width="1000" height="650" fill={C.paper}/>

          {/* subtle paper grain */}
          <rect width="1000" height="650" fill="url(#wPaper)" opacity={0.08} pointerEvents="none"/>

          {/* grid — faint ink lines */}
          {[100,200,300,400,500,600,700,800,900].map(x => (
            <line key={`gx${x}`} x1={x} y1={0} x2={x} y2={650}
              stroke={C.inkSoft} strokeWidth={0.3} opacity={0.12}/>
          ))}
          {[100,200,300,400,500,600].map(y => (
            <line key={`gy${y}`} x1={0} y1={y} x2={1000} y2={y}
              stroke={C.inkSoft} strokeWidth={0.3} opacity={0.12}/>
          ))}

          {/* scatter dots — old map decorations */}
          {[
            [48,195],[52,430],[920,155],[945,435],[962,295],
            [68,555],[938,548],[32,318],[978,82],[920,582],
            [840,82],[48,88],[750,600],[955,195],
          ].map(([x,y], i) => (
            <circle key={i} cx={x} cy={y} r={1.8} fill={C.inkSoft} opacity={0.18}/>
          ))}

          {/* terrain land patches */}
          {zones.filter(z => z.kind === 'land').map(z => (
            <ellipse key={z.id} cx={z.cx} cy={z.cy} rx={z.rx} ry={z.ry}
              fill={LAND_FILLS[z.colorKey] ?? 'rgba(124,79,50,0.12)'}
              stroke={C.inkSoft} strokeWidth={0.6} opacity={0.8}
            />
          ))}

          {/* main landmass outline */}
          <path
            d="M 435 60 C 528 45, 674 78, 752 142 C 810 194, 822 262, 818 330 C 814 402, 786 460, 746 502 C 700 550, 635 582, 555 596 C 476 610, 396 604, 320 582 C 232 558, 155 512, 110 458 C 62 400, 50 336, 56 278 C 62 218, 88 166, 132 136 C 182 100, 298 70, 435 60 Z"
            fill="url(#wLand)"
            stroke={C.inkSoft}
            strokeWidth={1.4}
            opacity={0.85}
          />

          {/* water / lakes */}
          {zones.filter(z => z.kind === 'lake').map(z => (
            <g key={z.id}>
              <ellipse cx={z.cx} cy={z.cy} rx={z.rx}   ry={z.ry}   fill={C.sky}   opacity={0.18}/>
              <ellipse cx={z.cx} cy={z.cy} rx={Math.max(1,z.rx-4)} ry={Math.max(1,z.ry-4)} fill={C.sky} opacity={0.22}/>
              <ellipse cx={z.cx} cy={z.cy} rx={Math.max(1,z.rx-8)} ry={Math.max(1,z.ry-8)} fill={C.sky} opacity={0.28}/>
              {z.label && (
                <text x={z.cx} y={z.cy + z.ry + 14}
                  fill={C.sky} fillOpacity={0.6}
                  fontFamily="'IM Fell English SC', serif"
                  fontSize={7} letterSpacing={1.5} textAnchor="middle">
                  {z.label}
                </text>
              )}
            </g>
          ))}

          {/* named zones — dashed rings */}
          {zones.filter(z => z.kind === 'zone').map(z => {
            const c = ZONE_STYLES[z.colorKey] ?? ZONE_STYLES.purple;
            return (
              <g key={z.id}>
                <ellipse cx={z.cx} cy={z.cy} rx={z.rx} ry={z.ry}
                  fill={c.fill} stroke={c.stroke} strokeWidth={1.4} strokeDasharray="8 5"
                />
                <text x={z.cx} y={z.cy + z.ry + 14}
                  fill={c.stroke.replace('0.35','0.55')}
                  fontFamily="'IM Fell English SC', serif"
                  fontSize={8} letterSpacing={2} textAnchor="middle">
                  {z.label}
                </text>
              </g>
            );
          })}

          {/* rivers / roads */}
          {paths.map(p => {
            if (p.points.length < 2) return null;
            const pts = p.points.map(([x, y]) => `${x},${y}`).join(' ');
            const c = PATH_COLORS[p.colorKey] ?? PATH_COLORS.blue;
            return (
              <g key={p.id}>
                <polyline points={pts} fill="none" stroke={c.outer} strokeWidth={12} strokeLinecap="round" strokeLinejoin="round"/>
                <polyline points={pts} fill="none" stroke={c.mid}   strokeWidth={6}  strokeLinecap="round" strokeLinejoin="round"/>
                <polyline points={pts} fill="none" stroke={c.inner} strokeWidth={2}  strokeLinecap="round" strokeLinejoin="round"/>
              </g>
            );
          })}

          {/* mountains */}
          {zones.filter(z => z.kind === 'mountain').map(z => {
            const pts      = `${z.cx},${z.cy - z.ry} ${z.cx - z.rx},${z.cy + z.ry} ${z.cx + z.rx},${z.cy + z.ry}`;
            const snowLine = z.ry * 0.35;
            const snowPts  = `${z.cx},${z.cy - z.ry} ${z.cx - z.rx * 0.35},${z.cy - z.ry + snowLine} ${z.cx + z.rx * 0.35},${z.cy - z.ry + snowLine}`;
            return (
              <g key={z.id}>
                <polygon points={pts}      fill={C.paper3} stroke={C.inkSoft} strokeWidth={0.8} opacity={0.7}/>
                <polygon points={snowPts}  fill={C.cream}  stroke="none" opacity={0.5}/>
                {z.label && (
                  <text x={z.cx} y={z.cy + z.ry + 14}
                    fill={C.inkSoft} fontFamily="'IM Fell English SC', serif"
                    fontSize={7} letterSpacing={1.5} textAnchor="middle">
                    {z.label}
                  </text>
                )}
              </g>
            );
          })}

          {/* mushroom island */}
          <ellipse cx={872} cy={260} rx={56} ry={44} fill={C.terra} opacity={0.12} stroke={C.terra} strokeWidth={1.2} strokeOpacity={0.3}/>
          <ellipse cx={872} cy={260} rx={44} ry={33} fill={C.terra} opacity={0.15}/>
          {[[856,247],[878,238],[894,256],[864,268],[886,272]].map(([x,y],i) => (
            <circle key={i} cx={x} cy={y} r={4.5} fill={C.terra} opacity={0.4}/>
          ))}
          <text x={835} y={316} fill={C.terra} fillOpacity={0.55}
            fontFamily="'IM Fell English SC', serif" fontSize={7} letterSpacing={1.5}>
            MUSHROOM ISLE
          </text>

          {/* small islands */}
          <ellipse cx={895} cy={490} rx={20} ry={14} fill={C.paper3} stroke={C.inkSoft} strokeWidth={0.6} opacity={0.5}/>
          <ellipse cx={68}  cy={545} rx={24} ry={16} fill={C.paper3} stroke={C.inkSoft} strokeWidth={0.6} opacity={0.5}/>
          <ellipse cx={780} cy={120} rx={16} ry={11} fill={C.paper3} stroke={C.inkSoft} strokeWidth={0.5} opacity={0.45}/>

          {/* map border — double ruled line */}
          <rect x={8}  y={8}  width={984} height={634} fill="none" stroke={C.ink}    strokeWidth={2}/>
          <rect x={14} y={14} width={972} height={622} fill="none" stroke={C.inkSoft} strokeWidth={0.8}/>

          {/* axis labels */}
          {[100,200,300,400,500,600,700,800,900].map(x => (
            <text key={`lx${x}`} x={x} y={642} fill={C.inkSoft} fillOpacity={0.35}
              fontFamily="'Special Elite', monospace" fontSize={7} textAnchor="middle" letterSpacing={0.5}>
              {x}
            </text>
          ))}
          {[100,200,300,400,500,600].map(y => (
            <text key={`ly${y}`} x={4} y={y + 3} fill={C.inkSoft} fillOpacity={0.35}
              fontFamily="'Special Elite', monospace" fontSize={7} textAnchor="start" letterSpacing={0.5}>
              {y}
            </text>
          ))}

          {/* location pins */}
          {locations.map((loc, i) => (
            <WesternPin
              key={loc.id}
              loc={loc}
              index={i}
              total={locations.length}
              selected={selected?.id === loc.id}
              onClick={() => setSelected(prev => prev?.id === loc.id ? null : loc)}
            />
          ))}

          {/* compass rose — old western style */}
          <g transform="translate(930, 575)">
            <circle cx={0} cy={0} r={28} fill={C.cream} stroke={C.ink} strokeWidth={1.2} opacity={0.85}/>
            <line x1={0}   y1={-22} x2={0}   y2={22}  stroke={C.ink}    strokeWidth={0.8} opacity={0.55}/>
            <line x1={-22} y1={0}   x2={22}  y2={0}   stroke={C.ink}    strokeWidth={0.8} opacity={0.55}/>
            <line x1={-15} y1={-15} x2={15}  y2={15}  stroke={C.inkSoft} strokeWidth={0.5} opacity={0.3}/>
            <line x1={15}  y1={-15} x2={-15} y2={15}  stroke={C.inkSoft} strokeWidth={0.5} opacity={0.3}/>
            {/* north arrowhead */}
            <polygon points="0,-22 4,-10 0,-15 -4,-10" fill={C.burnt} stroke={C.ink} strokeWidth={0.6}/>
            <polygon points="0,22 4,10 0,15 -4,10"     fill={C.inkSoft} opacity={0.4}/>
            <rect x={-2.5} y={-2.5} width={5} height={5} fill={C.gold} stroke={C.ink} strokeWidth={0.8} transform="rotate(45)"/>
            <text x={0}  y={-27} fill={C.burnt} fontSize={9} textAnchor="middle"
              fontFamily="'Rye', serif" fontWeight="bold">N</text>
            <text x={0}  y={38}  fill={C.inkSoft} fontSize={7} textAnchor="middle"
              fontFamily="'IM Fell English SC', serif" opacity={0.5}>S</text>
            <text x={32} y={4}   fill={C.inkSoft} fontSize={7} textAnchor="start"
              fontFamily="'IM Fell English SC', serif" opacity={0.5}>E</text>
            <text x={-32} y={4}  fill={C.inkSoft} fontSize={7} textAnchor="end"
              fontFamily="'IM Fell English SC', serif" opacity={0.5}>W</text>
          </g>

          {/* map title */}
          <text x={28} y={38} fill={C.ink} fillOpacity={0.75}
            fontFamily="'Rye', serif" fontSize={14} letterSpacing={3}>
            JOÐ SURVEYOR&apos;S CHART
          </text>
          <text x={28} y={52} fill={C.inkSoft} fillOpacity={0.45}
            fontFamily="'Special Elite', monospace" fontSize={7} letterSpacing={2}>
            {locations.length} CLAIMS · SURVIVAL WORLD · EST. MMXXIV
          </text>

          {/* legend */}
          <g transform="translate(28, 590)">
            {Object.entries(TYPE_COLOR).map(([type, color], i) => (
              <g key={type} transform={`translate(${i * 130}, 0)`}>
                <rect x={0} y={-5} width={8} height={8}
                  fill={color} stroke={C.ink} strokeWidth={0.7}
                  transform={`rotate(45 4 -1)`} opacity={0.8}/>
                <text x={14} y={1} fill={C.inkSoft} fillOpacity={0.6}
                  fontFamily="'IM Fell English SC', serif" fontSize={7} letterSpacing={1}>
                  {type.toUpperCase()}
                </text>
              </g>
            ))}
          </g>

          {/* vignette overlay */}
          <rect width="1000" height="650" fill="url(#wVignette)" pointerEvents="none"/>
        </svg>
      </div>

      {/* selected location detail panel */}
      {selected && (() => {
        const color = TYPE_COLOR[selected.type];
        return (
          <div className="w-wmap__detail">
            <div className="w-wmap__detail-no">
              {String(selected.id).padStart(2, '0')}<br/>/{String(locations.length).padStart(2, '0')}
            </div>
            <div className="w-wmap__detail-body">
              <div className="w-wmap__detail-label">{selected.label}</div>
              <div className="w-wmap__detail-sub">{selected.sublabel}</div>
            </div>
            <div className="w-wmap__detail-type" style={{ borderColor: color, color }}>
              {TYPE_LABEL[selected.type]}
            </div>
            <div className="w-wmap__detail-coords">
              X {selected.x} · Z {selected.y}
            </div>
            <button
              className="w-wmap__detail-close"
              onClick={() => setSelected(null)}
              data-no-shoot=""
            >
              ✕
            </button>
          </div>
        );
      })()}

      {/* footer note */}
      <div className="w-wmap__foot">
        ★ {locations.length} CLAIMS MAPPED · JOÐ SURVIVAL WORLD ★
      </div>
    </div>
  );
}

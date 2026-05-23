'use client';

import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import type { MapLocation, MapZone, MapPath } from '@/lib/map-types';
import { DEFAULT_LOCATIONS, DEFAULT_ZONES, DEFAULT_PATHS } from '@/lib/map-types';

type Location = MapLocation;

const TYPE_COLOR: Record<string, string> = {
  surface:     '#00ff41',
  underground: '#c084fc',
  island:      '#f97316',
  aerial:      '#38bdf8',
};

const TYPE_LABEL: Record<string, string> = {
  surface:     'SURFACE',
  underground: 'UNDERGROUND',
  island:      'ISLAND',
  aerial:      'AERIAL',
};

function Pin({ loc, index, total, selected, onClick }: { loc: Location; index: number; total: number; selected: boolean; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  const color = TYPE_COLOR[loc.type];
  const flipLeft = loc.x > 820;
  const flipUp   = loc.y > 540;

  return (
    <g
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
      style={{ cursor: 'pointer' }}
    >
      {selected && (
        <circle cx={loc.x} cy={loc.y} r={14} fill="none" stroke={color} strokeWidth={1.5} opacity={0.7}/>
      )}

      <circle cx={loc.x} cy={loc.y} r={10} fill="none" stroke={color} strokeWidth={0.8} opacity={0.2}>
        <animate attributeName="r"       values="8;18;8"    dur="3s" repeatCount="indefinite" begin={`${index * 0.4}s`}/>
        <animate attributeName="opacity" values="0.3;0;0.3" dur="3s" repeatCount="indefinite" begin={`${index * 0.4}s`}/>
      </circle>

      <rect
        x={loc.x - (hovered ? 5 : 3.5)}
        y={loc.y - (hovered ? 5 : 3.5)}
        width={hovered ? 10 : 7}
        height={hovered ? 10 : 7}
        fill={color}
        opacity={hovered ? 1 : 0.85}
        style={{ transition: 'all 0.2s ease' }}
      />

      <line x1={loc.x - 12} y1={loc.y} x2={loc.x - 7}  y2={loc.y} stroke={color} strokeWidth={0.8} opacity={hovered ? 0.9 : 0.4}/>
      <line x1={loc.x + 7}  y1={loc.y} x2={loc.x + 12} y2={loc.y} stroke={color} strokeWidth={0.8} opacity={hovered ? 0.9 : 0.4}/>
      <line x1={loc.x} y1={loc.y - 12} x2={loc.x} y2={loc.y - 7}  stroke={color} strokeWidth={0.8} opacity={hovered ? 0.9 : 0.4}/>
      <line x1={loc.x} y1={loc.y + 7}  x2={loc.x} y2={loc.y + 12} stroke={color} strokeWidth={0.8} opacity={hovered ? 0.9 : 0.4}/>

      {loc.type === 'underground' && (
        <>
          <line x1={loc.x} y1={loc.y + 8} x2={loc.x} y2={loc.y + 18} stroke={color} strokeWidth={1} strokeDasharray="2 2" opacity={0.5}/>
          <polygon points={`${loc.x - 4},${loc.y + 22} ${loc.x + 4},${loc.y + 22} ${loc.x},${loc.y + 28}`} fill={color} opacity={0.4}/>
        </>
      )}

      {loc.type === 'aerial' && (
        <>
          <ellipse cx={loc.x} cy={loc.y - 14} rx={5} ry={6} fill="none" stroke={color} strokeWidth={0.8} opacity={0.5}/>
          <line x1={loc.x} y1={loc.y - 8} x2={loc.x} y2={loc.y - 4} stroke={color} strokeWidth={0.6} opacity={0.5}/>
        </>
      )}

      {hovered && (
        <g>
          <rect
            x={flipLeft ? loc.x - 154 : loc.x + 18}
            y={flipUp   ? loc.y - 58  : loc.y - 8}
            width={136}
            height={50}
            fill="#060810"
            stroke={color}
            strokeWidth={0.8}
            rx={0}
          />
          <text
            x={flipLeft ? loc.x - 136 : loc.x + 36}
            y={flipUp   ? loc.y - 42  : loc.y + 8}
            fill={color}
            fontFamily="'JetBrains Mono', monospace"
            fontSize={7}
            letterSpacing={1.5}
            opacity={0.55}
          >
            {String(loc.id).padStart(2, '0')} / {String(total).padStart(2, '0')}
          </text>
          <text
            x={flipLeft ? loc.x - 136 : loc.x + 36}
            y={flipUp   ? loc.y - 28  : loc.y + 22}
            fill="#dde1ec"
            fontFamily="'Space Grotesk', sans-serif"
            fontSize={11}
            fontWeight={700}
            letterSpacing={0.5}
          >
            {loc.label}
          </text>
          <text
            x={flipLeft ? loc.x - 136 : loc.x + 36}
            y={flipUp   ? loc.y - 17  : loc.y + 34}
            fill="#505770"
            fontFamily="'JetBrains Mono', monospace"
            fontSize={7}
            letterSpacing={1}
          >
            {loc.sublabel}
          </text>
        </g>
      )}
    </g>
  );
}

const LAND_COLORS: Record<string, string> = {
  purple: '#1a1228',
  blue:   '#0a1828',
  orange: '#180c04',
  green:  '#0a1a0a',
};

export default function MapSection() {
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [locations, setLocations] = useState<Location[]>(DEFAULT_LOCATIONS);
  const [zones,     setZones]     = useState<MapZone[]>(DEFAULT_ZONES);
  const [paths,     setPaths]     = useState<MapPath[]>(DEFAULT_PATHS);

  useEffect(() => {
    fetch('/api/map')
      .then(r => r.ok ? r.json() : null)
      .then((cfg: { locations?: Location[]; zones?: MapZone[]; paths?: MapPath[] } | null) => {
        if (cfg?.locations?.length) setLocations(cfg.locations);
        if (cfg?.zones?.length)     setZones(cfg.zones);
        if (cfg?.paths)             setPaths(cfg.paths);
      })
      .catch(() => {});
  }, []);

  return (
    <section
      id="map"
      style={{
        padding:      'clamp(5rem, 12vw, 9rem) clamp(1.5rem, 6vw, 5rem)',
        borderBottom: '1px solid #1c2030',
        position:     'relative',
        overflow:     'hidden',
        background:   '#040508',
      }}
    >
      {/* Section label */}
      <motion.p
        initial={{ opacity: 0, x: -14 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="section-label"
      >
        03 — THE REALM
      </motion.p>

      <motion.h2
        initial={{ opacity: 0, y: 14 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.65, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
        style={{
          fontFamily:    "'Space Grotesk', sans-serif",
          fontSize:      'clamp(3rem, 7vw, 6rem)',
          fontWeight:    900,
          letterSpacing: '-0.03em',
          color:         '#dde1ec',
          lineHeight:    0.95,
          marginBottom:  '0.8rem',
        }}
      >
        THE REALM
      </motion.h2>

      <motion.p
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.18 }}
        style={{
          fontFamily:    "'JetBrains Mono', monospace",
          fontSize:      '0.58rem',
          color:         '#1e2230',
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          marginBottom:  '2.5rem',
        }}
      >
        CLICK LOCATIONS TO EXPLORE
      </motion.p>

      {/* Map SVG */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
        style={{
          position:   'relative',
          border:     '1px solid #1c2030',
          overflow:   'hidden',
          background: '#040d18',
          boxShadow:  '0 4px 40px rgba(0,0,0,0.6)',
        }}
      >
        <svg
          viewBox="0 0 1000 650"
          xmlns="http://www.w3.org/2000/svg"
          style={{ width: '100%', display: 'block', fontFamily: "'JetBrains Mono', monospace" }}
        >
          <defs>
            <radialGradient id="vignette" cx="50%" cy="50%" r="65%">
              <stop offset="55%" stopColor="transparent"/>
              <stop offset="100%" stopColor="#020810" stopOpacity={0.8}/>
            </radialGradient>
            <radialGradient id="landGrad" cx="50%" cy="45%" r="55%">
              <stop offset="0%" stopColor="#0f1e0f"/>
              <stop offset="100%" stopColor="#090f09"/>
            </radialGradient>
          </defs>

          <rect width="1000" height="650" fill="#040d18"/>

          {[100,200,300,400,500,600,700,800,900].map(x => (
            <line key={`gx${x}`} x1={x} y1={0} x2={x} y2={650} stroke="rgba(0,255,65,0.03)" strokeWidth={0.5}/>
          ))}
          {[100,200,300,400,500,600].map(y => (
            <line key={`gy${y}`} x1={0} y1={y} x2={1000} y2={y} stroke="rgba(0,255,65,0.03)" strokeWidth={0.5}/>
          ))}

          {[
            [48,195],[52,430],[920,155],[945,435],[962,295],
            [68,555],[938,548],[32,318],[978,82],[920,582],
            [840,82],[48,88],[750,600],[955,195],
          ].map(([x,y], i) => (
            <circle key={i} cx={x} cy={y} r={1.5} fill="rgba(0,80,160,0.2)" />
          ))}

          {zones.filter(z => z.kind === 'land').map(z => (
            <ellipse key={z.id} cx={z.cx} cy={z.cy} rx={z.rx} ry={z.ry}
              fill={LAND_COLORS[z.colorKey] ?? '#0a1a0a'}
              stroke="rgba(0,255,65,0.07)" strokeWidth={0.8}
            />
          ))}

          {zones.filter(z => z.kind === 'lake').map(z => (
            <g key={z.id}>
              <ellipse cx={z.cx} cy={z.cy} rx={z.rx} ry={z.ry} fill="#061828" stroke="none"/>
              <ellipse cx={z.cx} cy={z.cy} rx={Math.max(1, z.rx - 3)} ry={Math.max(1, z.ry - 3)} fill="#0d2e52" stroke="none"/>
              <ellipse cx={z.cx} cy={z.cy} rx={Math.max(1, z.rx - 6)} ry={Math.max(1, z.ry - 6)} fill="rgba(22,90,165,0.5)" stroke="none"/>
              {z.label && (
                <text x={z.cx} y={z.cy + z.ry + 12}
                  fill="rgba(56,189,248,0.3)" fontFamily="'JetBrains Mono',monospace"
                  fontSize={7} letterSpacing={1.5} textAnchor="middle">
                  {z.label}
                </text>
              )}
            </g>
          ))}

          <path
            d="M 435 60 C 528 45, 674 78, 752 142 C 810 194, 822 262, 818 330 C 814 402, 786 460, 746 502 C 700 550, 635 582, 555 596 C 476 610, 396 604, 320 582 C 232 558, 155 512, 110 458 C 62 400, 50 336, 56 278 C 62 218, 88 166, 132 136 C 182 100, 298 70, 435 60 Z"
            fill="url(#landGrad)"
            stroke="rgba(0,255,65,0.18)"
            strokeWidth={1.4}
          />

          {zones.filter(z => z.kind === 'zone').map(z => {
            const zoneColors: Record<string, { stroke: string; fill: string }> = {
              purple: { stroke: 'rgba(185,115,255,0.2)',  fill: 'rgba(45,18,72,0.1)'   },
              blue:   { stroke: 'rgba(56,189,248,0.2)',   fill: 'rgba(8,38,78,0.14)'   },
              orange: { stroke: 'rgba(249,115,22,0.2)',   fill: 'rgba(80,30,0,0.12)'   },
              green:  { stroke: 'rgba(0,255,65,0.16)',    fill: 'rgba(5,35,10,0.1)'    },
            };
            const c = zoneColors[z.colorKey] ?? zoneColors.purple;
            return (
              <g key={z.id}>
                <ellipse cx={z.cx} cy={z.cy} rx={z.rx} ry={z.ry}
                  fill={c.fill} stroke={c.stroke} strokeWidth={1.4} strokeDasharray="6 4"
                />
                <text x={z.cx} y={z.cy + z.ry + 12}
                  fill={c.stroke.replace('0.2','0.3')} fontFamily="'JetBrains Mono',monospace"
                  fontSize={7} letterSpacing={1.5} textAnchor="middle">
                  {z.label}
                </text>
              </g>
            );
          })}

          {paths.map(p => {
            if (p.points.length < 2) return null;
            const pts = p.points.map(([x, y]) => `${x},${y}`).join(' ');
            const pathColors: Record<string, { outer: string; mid: string; inner: string }> = {
              blue:   { outer: '#061828', mid: '#0d2e52', inner: 'rgba(22,90,165,0.5)' },
              orange: { outer: '#180808', mid: '#3d1508', inner: 'rgba(200,80,20,0.4)' },
              green:  { outer: '#061208', mid: '#0a2210', inner: 'rgba(20,120,40,0.4)' },
              purple: { outer: '#10081a', mid: '#1e0c38', inner: 'rgba(100,40,180,0.4)' },
            };
            const c = pathColors[p.colorKey] ?? pathColors.blue;
            return (
              <g key={p.id}>
                <polyline points={pts} fill="none" stroke={c.outer} strokeWidth={11} strokeLinecap="round" strokeLinejoin="round"/>
                <polyline points={pts} fill="none" stroke={c.mid}   strokeWidth={6}  strokeLinecap="round" strokeLinejoin="round"/>
                <polyline points={pts} fill="none" stroke={c.inner} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"/>
              </g>
            );
          })}

          {zones.filter(z => z.kind === 'mountain').map(z => {
            const pts      = `${z.cx},${z.cy - z.ry} ${z.cx - z.rx},${z.cy + z.ry} ${z.cx + z.rx},${z.cy + z.ry}`;
            const snowLine = z.ry * 0.35;
            const snowPts  = `${z.cx},${z.cy - z.ry} ${z.cx - z.rx * 0.35},${z.cy - z.ry + snowLine} ${z.cx + z.rx * 0.35},${z.cy - z.ry + snowLine}`;
            return (
              <g key={z.id}>
                <polygon points={pts}      fill="rgba(80,60,40,0.3)"  stroke="rgba(150,120,80,0.35)" strokeWidth={0.8}/>
                <polygon points={snowPts}  fill="rgba(220,220,220,0.2)" stroke="none"/>
                {z.label && (
                  <text x={z.cx} y={z.cy + z.ry + 12}
                    fill="rgba(150,120,80,0.45)" fontFamily="'JetBrains Mono',monospace"
                    fontSize={7} letterSpacing={1.5} textAnchor="middle">
                    {z.label}
                  </text>
                )}
              </g>
            );
          })}

          <ellipse cx={872} cy={260} rx={56} ry={44} fill="#100814" stroke="rgba(249,115,22,0.2)" strokeWidth={1.2}/>
          <ellipse cx={872} cy={260} rx={44} ry={33} fill="#160b1c"/>
          {[[856,247],[878,238],[894,256],[864,268],[886,272]].map(([x,y],i) => (
            <circle key={i} cx={x} cy={y} r={4.5} fill="rgba(210,50,50,0.45)"/>
          ))}
          <text x={835} y={316} fill="rgba(249,115,22,0.4)" fontFamily="'JetBrains Mono',monospace" fontSize={7} letterSpacing={1.5}>MUSHROOM ISLE</text>

          <ellipse cx={895} cy={490} rx={20} ry={14} fill="#0a140a" stroke="rgba(0,255,65,0.05)" strokeWidth={0.8}/>
          <ellipse cx={68}  cy={545} rx={24} ry={16} fill="#0a140a" stroke="rgba(0,255,65,0.05)" strokeWidth={0.8}/>
          <ellipse cx={780} cy={120} rx={16} ry={11} fill="#0a140a" stroke="rgba(0,255,65,0.04)" strokeWidth={0.8}/>

          <rect x={8}  y={8}  width={984} height={634} fill="none" stroke="rgba(0,255,65,0.12)" strokeWidth={1}/>
          <rect x={14} y={14} width={972} height={622} fill="none" stroke="rgba(0,255,65,0.05)" strokeWidth={0.5}/>

          {[100,200,300,400,500,600,700,800,900].map(x => (
            <text key={`lx${x}`} x={x} y={642} fill="rgba(0,255,65,0.14)" fontFamily="'JetBrains Mono',monospace" fontSize={7} textAnchor="middle" letterSpacing={0.5}>{x}</text>
          ))}
          {[100,200,300,400,500,600].map(y => (
            <text key={`ly${y}`} x={4} y={y + 3} fill="rgba(0,255,65,0.14)" fontFamily="'JetBrains Mono',monospace" fontSize={7} textAnchor="start" letterSpacing={0.5}>{y}</text>
          ))}

          {locations.map((loc, i) => (
            <Pin
              key={loc.id}
              loc={loc}
              index={i}
              total={locations.length}
              selected={selectedLocation?.id === loc.id}
              onClick={() => setSelectedLocation(prev => prev?.id === loc.id ? null : loc)}
            />
          ))}

          <g transform="translate(930, 575)">
            <line x1={0}   y1={-28} x2={0}   y2={28}  stroke="rgba(0,255,65,0.3)" strokeWidth={0.8}/>
            <line x1={-28} y1={0}   x2={28}  y2={0}   stroke="rgba(0,255,65,0.3)" strokeWidth={0.8}/>
            <line x1={-18} y1={-18} x2={18}  y2={18}  stroke="rgba(0,255,65,0.12)" strokeWidth={0.5}/>
            <line x1={18}  y1={-18} x2={-18} y2={18}  stroke="rgba(0,255,65,0.12)" strokeWidth={0.5}/>
            <polygon points="0,-28 4,-14 0,-18 -4,-14" fill="rgba(0,255,65,0.65)"/>
            <polygon points="0,28 4,14 0,18 -4,14"     fill="rgba(0,255,65,0.18)"/>
            <rect x={-2} y={-2} width={4} height={4} fill="#00ff41" opacity={0.75}/>
            <text x={0}   y={-33} fill="rgba(0,255,65,0.65)" fontSize={8} textAnchor="middle" fontFamily="'JetBrains Mono',monospace" letterSpacing={1} fontWeight="bold">N</text>
            <text x={0}   y={44}  fill="rgba(0,255,65,0.25)" fontSize={7} textAnchor="middle" fontFamily="'JetBrains Mono',monospace" letterSpacing={1}>S</text>
            <text x={38}  y={4}   fill="rgba(0,255,65,0.25)" fontSize={7} textAnchor="start"  fontFamily="'JetBrains Mono',monospace" letterSpacing={1}>E</text>
            <text x={-38} y={4}   fill="rgba(0,255,65,0.25)" fontSize={7} textAnchor="end"    fontFamily="'JetBrains Mono',monospace" letterSpacing={1}>W</text>
          </g>

          <text x={28} y={38} fill="rgba(0,255,65,0.45)" fontFamily="'Space Grotesk',sans-serif" fontSize={13} fontWeight={700} letterSpacing={3}>JOD WORLD MAP</text>
          <text x={28} y={52} fill="rgba(0,255,65,0.18)" fontFamily="'JetBrains Mono',monospace" fontSize={7} letterSpacing={2}>{locations.length} LOCATIONS · SURVIVAL WORLD</text>

          <g transform="translate(28, 590)">
            {Object.entries(TYPE_COLOR).map(([type, color], i) => (
              <g key={type} transform={`translate(${i * 120}, 0)`}>
                <rect x={0} y={-5} width={6} height={6} fill={color} opacity={0.75}/>
                <text x={10} y={1} fill="rgba(255,255,255,0.25)" fontFamily="'JetBrains Mono',monospace" fontSize={7} letterSpacing={1}>
                  {type.toUpperCase()}
                </text>
              </g>
            ))}
          </g>

          <rect width="1000" height="650" fill="url(#vignette)" pointerEvents="none"/>
        </svg>
      </motion.div>

      {/* Location detail panel */}
      {selectedLocation && (() => {
        const loc   = selectedLocation;
        const color = TYPE_COLOR[loc.type];
        return (
          <motion.div
            key={loc.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.25 }}
            style={{
              marginTop:   '0.75rem',
              padding:     '1.25rem 1.5rem',
              border:      `1px solid ${color}2a`,
              background:  '#060810',
              display:     'flex',
              alignItems:  'flex-start',
              gap:         '1.5rem',
              flexWrap:    'wrap',
            }}
          >
            <div style={{
              fontFamily:    "'JetBrains Mono', monospace",
              fontSize:      '0.58rem',
              letterSpacing: '0.2em',
              color,
              opacity:       0.55,
              minWidth:      '2.5rem',
              paddingTop:    '0.1rem',
            }}>
              {String(loc.id).padStart(2, '0')}<br/>/{String(locations.length).padStart(2, '0')}
            </div>

            <div style={{ flex: 1 }}>
              <p style={{
                fontFamily:    "'Space Grotesk', sans-serif",
                fontSize:      '1.05rem',
                fontWeight:    700,
                letterSpacing: '0.02em',
                color:         '#dde1ec',
                margin:        0,
              }}>
                {loc.label}
              </p>
              <p style={{
                fontFamily:    "'JetBrains Mono', monospace",
                fontSize:      '0.58rem',
                letterSpacing: '0.14em',
                color:         '#505770',
                marginTop:     '0.25rem',
              }}>
                {loc.sublabel}
              </p>
            </div>

            <div style={{
              fontFamily:    "'JetBrains Mono', monospace",
              fontSize:      '0.5rem',
              letterSpacing: '0.22em',
              color,
              border:        `1px solid ${color}44`,
              padding:       '0.25rem 0.6rem',
              alignSelf:     'center',
            }}>
              {TYPE_LABEL[loc.type]}
            </div>

            <div style={{
              fontFamily:    "'JetBrains Mono', monospace",
              fontSize:      '0.58rem',
              letterSpacing: '0.1em',
              color:         '#1e2230',
              alignSelf:     'center',
              whiteSpace:    'nowrap',
            }}>
              X {loc.x} · Z {loc.y}
            </div>

            <button
              onClick={() => setSelectedLocation(null)}
              style={{
                background:    'none',
                border:        'none',
                color:         '#1e2230',
                fontFamily:    "'JetBrains Mono', monospace",
                fontSize:      '0.65rem',
                cursor:        'pointer',
                padding:       '0.1rem 0.3rem',
                alignSelf:     'center',
                letterSpacing: '0.1em',
                transition:    'color 0.2s',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = '#505770')}
              onMouseLeave={e => (e.currentTarget.style.color = '#1e2230')}
            >
              ✕
            </button>
          </motion.div>
        );
      })()}

      <motion.p
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.5 }}
        style={{
          marginTop:     '1.25rem',
          fontFamily:    "'JetBrains Mono', monospace",
          fontSize:      '0.44rem',
          color:         '#131722',
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
        }}
      >
        {locations.length} LOCATIONS MAPPED · JOD SURVIVAL WORLD
      </motion.p>
    </section>
  );
}

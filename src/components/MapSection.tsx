'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';

interface Location {
  id:       number;
  label:    string;
  sublabel: string;
  x:        number;
  y:        number;
  type:     'surface' | 'underground' | 'island' | 'aerial';
}

const LOCATIONS: Location[] = [
  { id:  1, label: 'GOÐI CASTLE',      sublabel: 'FAR AWAY LANDS',         x: 162, y: 345, type: 'surface'     },
  { id:  2, label: 'JOÐ VILLE',        sublabel: 'OLD BASE · SPAWN',        x: 262, y: 172, type: 'surface'     },
  { id:  3, label: 'PINK ESTATE',      sublabel: 'OLD BASE',                x: 258, y: 210, type: 'surface'     },
  { id:  4, label: 'J CLUB',           sublabel: 'SECRET UNDERGROUND CLUB', x: 306, y: 210, type: 'underground' },
  { id:  5, label: 'MUSHROOM ISLAND',  sublabel: 'SHROOMY HEAVEN',          x: 872, y: 260, type: 'island'      },
  { id:  6, label: 'POTIONS TOWER',    sublabel: 'NEW BASE',                x: 408, y: 488, type: 'surface'     },
  { id:  7, label: 'VENICE',           sublabel: 'NEW BASE · COASTAL',      x: 568, y: 415, type: 'surface'     },
  { id:  8, label: 'TOWN HALL',        sublabel: 'NEW BASE',                x: 438, y: 448, type: 'surface'     },
  { id:  9, label: 'THE VILLAGE',      sublabel: 'NEW BASE · MAIN STREET',  x: 472, y: 502, type: 'surface'     },
  { id: 10, label: 'BALLOON PARADISE', sublabel: 'NEW BASE · FROM ABOVE',   x: 426, y: 472, type: 'aerial'      },
  { id: 11, label: 'NEW TOWN',         sublabel: 'NEW BASE · NIGHT',        x: 405, y: 508, type: 'surface'     },
];

const TYPE_COLOR: Record<string, string> = {
  surface:     '#F5A623',
  underground: '#8B5CF6',
  island:      '#06B6D4',
  aerial:      '#10B981',
};

function Pin({ loc, index }: { loc: Location; index: number }) {
  const [hovered, setHovered] = useState(false);
  const color    = TYPE_COLOR[loc.type];
  const flipLeft = loc.x > 820;
  const flipUp   = loc.y > 540;

  return (
    <g
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ cursor: 'none' }}
    >
      {/* Outer pulse ring */}
      <circle cx={loc.x} cy={loc.y} r={10} fill="none" stroke={color} strokeWidth={0.8} opacity={0.22}>
        <animate attributeName="r"       values="8;20;8"    dur="3.5s" repeatCount="indefinite" begin={`${index * 0.38}s`}/>
        <animate attributeName="opacity" values="0.3;0;0.3" dur="3.5s" repeatCount="indefinite" begin={`${index * 0.38}s`}/>
      </circle>

      {/* Inner dot */}
      <rect
        x={loc.x - (hovered ? 5 : 3.5)}
        y={loc.y - (hovered ? 5 : 3.5)}
        width={hovered ? 10 : 7}
        height={hovered ? 10 : 7}
        fill={color}
        opacity={hovered ? 1 : 0.85}
        style={{ transition: 'all 0.2s ease' }}
      />

      {/* Cross hairs */}
      <line x1={loc.x - 13} y1={loc.y} x2={loc.x - 7}  y2={loc.y} stroke={color} strokeWidth={0.7} opacity={hovered ? 1.0 : 0.4}/>
      <line x1={loc.x + 7}  y1={loc.y} x2={loc.x + 13} y2={loc.y} stroke={color} strokeWidth={0.7} opacity={hovered ? 1.0 : 0.4}/>
      <line x1={loc.x} y1={loc.y - 13} x2={loc.x} y2={loc.y - 7}  stroke={color} strokeWidth={0.7} opacity={hovered ? 1.0 : 0.4}/>
      <line x1={loc.x} y1={loc.y + 7}  x2={loc.x} y2={loc.y + 13} stroke={color} strokeWidth={0.7} opacity={hovered ? 1.0 : 0.4}/>

      {/* Underground marker */}
      {loc.type === 'underground' && (
        <>
          <line x1={loc.x} y1={loc.y + 8} x2={loc.x} y2={loc.y + 18} stroke={color} strokeWidth={1} strokeDasharray="2 2" opacity={0.5}/>
          <polygon points={`${loc.x - 4},${loc.y + 22} ${loc.x + 4},${loc.y + 22} ${loc.x},${loc.y + 28}`} fill={color} opacity={0.4}/>
        </>
      )}

      {/* Aerial marker */}
      {loc.type === 'aerial' && (
        <>
          <ellipse cx={loc.x} cy={loc.y - 14} rx={5} ry={6} fill="none" stroke={color} strokeWidth={0.8} opacity={0.5}/>
          <line x1={loc.x} y1={loc.y - 8} x2={loc.x} y2={loc.y - 4} stroke={color} strokeWidth={0.6} opacity={0.5}/>
        </>
      )}

      {/* Tooltip */}
      {hovered && (
        <g>
          <rect
            x={flipLeft ? loc.x - 156 : loc.x + 18}
            y={flipUp   ? loc.y - 60  : loc.y - 8}
            width={138}
            height={52}
            fill="rgba(3,5,10,0.95)"
            stroke={color}
            strokeWidth={0.8}
            rx={1}
          />
          {/* Gold top border */}
          <rect
            x={flipLeft ? loc.x - 156 : loc.x + 18}
            y={flipUp   ? loc.y - 60  : loc.y - 8}
            width={138}
            height={2}
            fill={color}
            opacity={0.7}
          />
          <text
            x={flipLeft ? loc.x - 138 : loc.x + 36}
            y={flipUp   ? loc.y - 43  : loc.y + 9}
            fill={color}
            fontFamily="'JetBrains Mono', monospace"
            fontSize={6.5}
            letterSpacing={1.5}
            opacity={0.7}
          >
            {String(loc.id).padStart(2, '0')} / {String(LOCATIONS.length).padStart(2, '0')}
          </text>
          <text
            x={flipLeft ? loc.x - 138 : loc.x + 36}
            y={flipUp   ? loc.y - 29  : loc.y + 24}
            fill="#F0EAD6"
            fontFamily="'Playfair Display', serif"
            fontSize={10.5}
            fontWeight={700}
            letterSpacing={0.5}
          >
            {loc.label}
          </text>
          <text
            x={flipLeft ? loc.x - 138 : loc.x + 36}
            y={flipUp   ? loc.y - 17  : loc.y + 36}
            fill="rgba(255,255,255,0.35)"
            fontFamily="'JetBrains Mono', monospace"
            fontSize={6.5}
            letterSpacing={1}
          >
            {loc.sublabel}
          </text>
        </g>
      )}
    </g>
  );
}

export default function MapSection() {
  return (
    <section
      style={{
        padding:      'clamp(5rem, 12vw, 10rem) clamp(1.5rem, 6vw, 5rem)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        position:     'relative',
        overflow:     'hidden',
        background:   '#03050A',
      }}
    >
      {/* BG glow */}
      <div
        style={{
          position:      'absolute',
          bottom:        0,
          right:         '10%',
          width:         '45vw',
          height:        '50vh',
          background:    'radial-gradient(ellipse, rgba(6,182,212,0.04) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      {/* Section label */}
      <motion.p
        initial={{ opacity: 0, x: -16 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        style={{
          fontFamily:    "'JetBrains Mono', monospace",
          fontSize:      '0.62rem',
          letterSpacing: '0.32em',
          color:         'rgba(245,166,35,0.7)',
          textTransform: 'uppercase',
          marginBottom:  '0.9rem',
        }}
      >
        03 — The Realm
      </motion.p>

      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        style={{
          fontFamily:    "'Playfair Display', serif",
          fontSize:      'clamp(2.8rem, 7vw, 6rem)',
          fontWeight:    900,
          fontStyle:     'italic',
          color:         '#F0EAD6',
          lineHeight:    1,
          marginBottom:  '0.6rem',
        }}
      >
        The Realm
      </motion.h2>

      <motion.p
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.2 }}
        style={{
          fontFamily:    "'Inter', sans-serif",
          fontSize:      '0.8rem',
          color:         'rgba(255,255,255,0.3)',
          fontWeight:    300,
          marginBottom:  '2.5rem',
          letterSpacing: '0.03em',
        }}
      >
        Hover locations to explore — {LOCATIONS.length} landmarks mapped
      </motion.p>

      {/* Map */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.9, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
        style={{
          position:   'relative',
          border:     '1px solid rgba(255,255,255,0.08)',
          overflow:   'hidden',
          background: '#030812',
          boxShadow:  '0 20px 80px rgba(0,0,0,0.7), inset 0 1px 0 rgba(245,166,35,0.08)',
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
              <stop offset="100%" stopColor="#030812" stopOpacity={0.9}/>
            </radialGradient>
            <radialGradient id="landGrad" cx="45%" cy="42%" r="58%">
              <stop offset="0%"   stopColor="#0e1a10"/>
              <stop offset="100%" stopColor="#08100a"/>
            </radialGradient>
          </defs>

          {/* Ocean */}
          <rect width="1000" height="650" fill="#030812"/>

          {/* Grid */}
          {[100,200,300,400,500,600,700,800,900].map(x => (
            <line key={`gx${x}`} x1={x} y1={0} x2={x} y2={650}
              stroke="rgba(245,166,35,0.03)" strokeWidth={0.5}/>
          ))}
          {[100,200,300,400,500,600].map(y => (
            <line key={`gy${y}`} x1={0} y1={y} x2={1000} y2={y}
              stroke="rgba(245,166,35,0.03)" strokeWidth={0.5}/>
          ))}

          {/* Ocean texture */}
          {[[48,195],[52,430],[920,155],[945,435],[962,295],[68,555],[938,548],[32,318],[978,82],[920,582],[840,82],[48,88],[750,600],[955,195]].map(([x,y], i) => (
            <circle key={i} cx={x} cy={y} r={1.5} fill="rgba(6,182,212,0.15)" />
          ))}

          {/* Main landmass */}
          <path
            d="M 435 60 C 528 45, 674 78, 752 142 C 810 194, 822 262, 818 330 C 814 402, 786 460, 746 502 C 700 550, 635 582, 555 596 C 476 610, 396 604, 320 582 C 232 558, 155 512, 110 458 C 62 400, 50 336, 56 278 C 62 218, 88 166, 132 136 C 182 100, 298 70, 435 60 Z"
            fill="url(#landGrad)"
            stroke="rgba(245,166,35,0.15)"
            strokeWidth={1.2}
          />

          {/* Far Away Lands zone */}
          <ellipse cx={162} cy={345} rx={78} ry={58}
            fill="rgba(139,92,246,0.08)"
            stroke="rgba(139,92,246,0.18)"
            strokeWidth={1}
            strokeDasharray="5 4"
          />
          <ellipse cx={162} cy={345} rx={55} ry={40} fill="rgba(139,92,246,0.04)"/>
          <text x={122} y={416} fill="rgba(139,92,246,0.2)"
            fontFamily="'JetBrains Mono',monospace" fontSize={6.5} letterSpacing={1.5}>
            FARAWAY LANDS
          </text>

          {/* Old Base zone */}
          <circle cx={282} cy={197} r={118}
            fill="rgba(245,166,35,0.05)"
            stroke="rgba(245,166,35,0.15)"
            strokeWidth={1.2}
            strokeDasharray="6 4"
          />
          <ellipse cx={272} cy={188} rx={80} ry={62} fill="rgba(245,166,35,0.03)"/>
          <text x={360} y={98} fill="rgba(245,166,35,0.22)"
            fontFamily="'JetBrains Mono',monospace" fontSize={7} letterSpacing={2}>
            OLD BASE
          </text>

          {/* New Base zone */}
          <ellipse cx={488} cy={466} rx={200} ry={112}
            fill="rgba(6,182,212,0.06)"
            stroke="rgba(6,182,212,0.16)"
            strokeWidth={1.2}
            strokeDasharray="6 4"
          />
          <ellipse cx={510} cy={448} rx={145} ry={80} fill="rgba(6,182,212,0.03)"/>
          <text x={488} y={590} fill="rgba(6,182,212,0.2)"
            fontFamily="'JetBrains Mono',monospace" fontSize={7} letterSpacing={2} textAnchor="middle">
            NEW BASE
          </text>

          {/* River */}
          <path d="M 520 390 C 512 418, 528 452, 516 488 C 505 522, 520 542, 514 562"
            fill="none" stroke="#020a14" strokeWidth={11}/>
          <path d="M 520 390 C 512 418, 528 452, 516 488 C 505 522, 520 542, 514 562"
            fill="none" stroke="#041022" strokeWidth={6}/>
          <path d="M 520 390 C 512 418, 528 452, 516 488 C 505 522, 520 542, 514 562"
            fill="none" stroke="rgba(6,182,212,0.35)" strokeWidth={2}/>

          {/* Mushroom Island */}
          <ellipse cx={872} cy={260} rx={56} ry={44} fill="#0a0412" stroke="rgba(6,182,212,0.2)" strokeWidth={1}/>
          <ellipse cx={872} cy={260} rx={44} ry={33} fill="#0c0618"/>
          {[[856,247],[878,238],[894,256],[864,268],[886,272]].map(([x,y],i) => (
            <circle key={i} cx={x} cy={y} r={4.5} fill="rgba(139,92,246,0.45)"/>
          ))}
          <text x={835} y={316} fill="rgba(6,182,212,0.35)"
            fontFamily="'JetBrains Mono',monospace" fontSize={7} letterSpacing={1.5}>
            MUSHROOM ISLE
          </text>

          {/* Small islands */}
          <ellipse cx={895} cy={490} rx={20} ry={14} fill="#080c08" stroke="rgba(245,166,35,0.06)" strokeWidth={0.8}/>
          <ellipse cx={68}  cy={545} rx={24} ry={16} fill="#080c08" stroke="rgba(245,166,35,0.06)" strokeWidth={0.8}/>
          <ellipse cx={780} cy={120} rx={16} ry={11} fill="#080c08" stroke="rgba(245,166,35,0.05)" strokeWidth={0.8}/>

          {/* Border */}
          <rect x={8}  y={8}  width={984} height={634} fill="none" stroke="rgba(245,166,35,0.12)" strokeWidth={1}/>
          <rect x={14} y={14} width={972} height={622} fill="none" stroke="rgba(245,166,35,0.05)" strokeWidth={0.5}/>

          {/* Coordinate labels */}
          {[100,200,300,400,500,600,700,800,900].map(x => (
            <text key={`lx${x}`} x={x} y={642} fill="rgba(245,166,35,0.15)"
              fontFamily="'JetBrains Mono',monospace" fontSize={7} textAnchor="middle" letterSpacing={0.5}>
              {x}
            </text>
          ))}
          {[100,200,300,400,500,600].map(y => (
            <text key={`ly${y}`} x={4} y={y + 3} fill="rgba(245,166,35,0.15)"
              fontFamily="'JetBrains Mono',monospace" fontSize={7} textAnchor="start" letterSpacing={0.5}>
              {y}
            </text>
          ))}

          {/* Pins */}
          {LOCATIONS.map((loc, i) => (
            <Pin key={loc.id} loc={loc} index={i} />
          ))}

          {/* Compass rose */}
          <g transform="translate(930, 575)">
            <line x1={0}   y1={-28} x2={0}   y2={28}  stroke="rgba(245,166,35,0.3)"  strokeWidth={0.8}/>
            <line x1={-28} y1={0}   x2={28}  y2={0}   stroke="rgba(245,166,35,0.3)"  strokeWidth={0.8}/>
            <line x1={-18} y1={-18} x2={18}  y2={18}  stroke="rgba(245,166,35,0.12)" strokeWidth={0.5}/>
            <line x1={18}  y1={-18} x2={-18} y2={18}  stroke="rgba(245,166,35,0.12)" strokeWidth={0.5}/>
            <polygon points="0,-28 4,-14 0,-18 -4,-14" fill="rgba(245,166,35,0.75)"/>
            <polygon points="0,28 4,14 0,18 -4,14"     fill="rgba(245,166,35,0.25)"/>
            <rect x={-2} y={-2} width={4} height={4} fill="#F5A623" opacity={0.9}/>
            <text x={0}   y={-33} fill="rgba(245,166,35,0.75)" fontSize={8}  textAnchor="middle" fontFamily="'JetBrains Mono',monospace" letterSpacing={1} fontWeight="bold">N</text>
            <text x={0}   y={44}  fill="rgba(245,166,35,0.3)"  fontSize={7}  textAnchor="middle" fontFamily="'JetBrains Mono',monospace" letterSpacing={1}>S</text>
            <text x={38}  y={4}   fill="rgba(245,166,35,0.3)"  fontSize={7}  textAnchor="start"  fontFamily="'JetBrains Mono',monospace" letterSpacing={1}>E</text>
            <text x={-38} y={4}   fill="rgba(245,166,35,0.3)"  fontSize={7}  textAnchor="end"    fontFamily="'JetBrains Mono',monospace" letterSpacing={1}>W</text>
          </g>

          {/* Map title */}
          <text x={28} y={38}  fill="rgba(245,166,35,0.5)"  fontFamily="'Playfair Display',serif"  fontSize={13} fontWeight={700} letterSpacing={3}>JOD WORLD MAP</text>
          <text x={28} y={52} fill="rgba(245,166,35,0.2)" fontFamily="'JetBrains Mono',monospace" fontSize={7}  letterSpacing={2}>11 LOCATIONS · SURVIVAL WORLD</text>

          {/* Legend */}
          <g transform="translate(28, 590)">
            {Object.entries(TYPE_COLOR).map(([type, color], i) => (
              <g key={type} transform={`translate(${i * 130}, 0)`}>
                <rect x={0} y={-5} width={6} height={6} fill={color} opacity={0.85}/>
                <text x={11} y={1} fill="rgba(240,234,214,0.3)"
                  fontFamily="'JetBrains Mono',monospace" fontSize={7} letterSpacing={1}>
                  {type.toUpperCase()}
                </text>
              </g>
            ))}
          </g>

          {/* Vignette */}
          <rect width="1000" height="650" fill="url(#vignette)" pointerEvents="none"/>
        </svg>
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.6 }}
        style={{
          marginTop:     '1.5rem',
          fontFamily:    "'JetBrains Mono', monospace",
          fontSize:      '0.5rem',
          color:         'rgba(255,255,255,0.1)',
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
        }}
      >
        {LOCATIONS.length} LOCATIONS MAPPED · JOD SURVIVAL WORLD
      </motion.p>
    </section>
  );
}

'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';

interface Location {
  id: number;
  label: string;
  sublabel: string;
  x: number;
  y: number;
  type: 'surface' | 'underground' | 'island' | 'aerial';
}

const LOCATIONS: Location[] = [
  { id: 1,  label: 'GOÐI CASTLE',      sublabel: 'FAR AWAY LANDS',         x: 162, y: 345, type: 'surface'     },
  { id: 2,  label: 'JOÐ VILLE',        sublabel: 'OLD BASE · SPAWN',        x: 262, y: 172, type: 'surface'     },
  { id: 3,  label: 'PINK ESTATE',      sublabel: 'OLD BASE',                x: 258, y: 210, type: 'surface'     },
  { id: 4,  label: 'J CLUB',           sublabel: 'SECRET UNDERGROUND CLUB', x: 306, y: 210, type: 'underground' },
  { id: 5,  label: 'MUSHROOM ISLAND',  sublabel: 'SHROOMY HEAVEN',          x: 872, y: 260, type: 'island'      },
  { id: 6,  label: 'POTIONS TOWER',    sublabel: 'NEW BASE',                x: 408, y: 488, type: 'surface'     },
  { id: 7,  label: 'VENICE',           sublabel: 'NEW BASE · COASTAL',      x: 568, y: 415, type: 'surface'     },
  { id: 8,  label: 'TOWN HALL',        sublabel: 'NEW BASE',                x: 438, y: 448, type: 'surface'     },
  { id: 9,  label: 'THE VILLAGE',      sublabel: 'NEW BASE · MAIN STREET',  x: 472, y: 502, type: 'surface'     },
  { id: 10, label: 'BALLOON PARADISE', sublabel: 'NEW BASE · FROM ABOVE',   x: 426, y: 472, type: 'aerial'      },
  { id: 11, label: 'NEW TOWN',         sublabel: 'NEW BASE · NIGHT',        x: 405, y: 508, type: 'surface'     },
];

const TYPE_COLOR: Record<string, string> = {
  surface:     '#00ff41',
  underground: '#c084fc',
  island:      '#f97316',
  aerial:      '#38bdf8',
};

function Pin({ loc, index }: { loc: Location; index: number }) {
  const [hovered, setHovered] = useState(false);
  const color = TYPE_COLOR[loc.type];

  // Flip tooltip left if near right edge
  const flipLeft = loc.x > 820;
  const flipUp   = loc.y > 540;

  return (
    <g
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ cursor: 'none' }}
    >
      {/* Pulse ring (always animating) */}
      <circle cx={loc.x} cy={loc.y} r={10} fill="none" stroke={color} strokeWidth={0.8} opacity={0.2}>
        <animate attributeName="r"       values="8;18;8"    dur="3s" repeatCount="indefinite" begin={`${index * 0.4}s`}/>
        <animate attributeName="opacity" values="0.3;0;0.3" dur="3s" repeatCount="indefinite" begin={`${index * 0.4}s`}/>
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

      {/* Crosshair lines */}
      <line x1={loc.x - 12} y1={loc.y} x2={loc.x - 7}  y2={loc.y} stroke={color} strokeWidth={0.8} opacity={hovered ? 0.9 : 0.4}/>
      <line x1={loc.x + 7}  y1={loc.y} x2={loc.x + 12} y2={loc.y} stroke={color} strokeWidth={0.8} opacity={hovered ? 0.9 : 0.4}/>
      <line x1={loc.x} y1={loc.y - 12} x2={loc.x} y2={loc.y - 7}  stroke={color} strokeWidth={0.8} opacity={hovered ? 0.9 : 0.4}/>
      <line x1={loc.x} y1={loc.y + 7}  x2={loc.x} y2={loc.y + 12} stroke={color} strokeWidth={0.8} opacity={hovered ? 0.9 : 0.4}/>

      {/* Special underground marker */}
      {loc.type === 'underground' && (
        <>
          <line x1={loc.x} y1={loc.y + 8} x2={loc.x} y2={loc.y + 18} stroke={color} strokeWidth={1} strokeDasharray="2 2" opacity={0.5}/>
          <polygon points={`${loc.x - 4},${loc.y + 22} ${loc.x + 4},${loc.y + 22} ${loc.x},${loc.y + 28}`} fill={color} opacity={0.4}/>
        </>
      )}

      {/* Aerial balloon hint */}
      {loc.type === 'aerial' && (
        <>
          <ellipse cx={loc.x} cy={loc.y - 14} rx={5} ry={6} fill="none" stroke={color} strokeWidth={0.8} opacity={0.5}/>
          <line x1={loc.x} y1={loc.y - 8} x2={loc.x} y2={loc.y - 4} stroke={color} strokeWidth={0.6} opacity={0.5}/>
        </>
      )}

      {/* Tooltip */}
      {hovered && (
        <g>
          {/* Tooltip box */}
          <rect
            x={flipLeft ? loc.x - 154 : loc.x + 18}
            y={flipUp   ? loc.y - 58  : loc.y - 8}
            width={136}
            height={50}
            fill="#080808"
            stroke={color}
            strokeWidth={0.8}
            rx={0}
          />
          {/* Index */}
          <text
            x={flipLeft ? loc.x - 136 : loc.x + 36}
            y={flipUp   ? loc.y - 42  : loc.y + 8}
            fill={color}
            fontFamily="'JetBrains Mono', monospace"
            fontSize={7}
            letterSpacing={1.5}
            opacity={0.6}
          >
            {String(loc.id).padStart(2, '0')} / {String(LOCATIONS.length).padStart(2, '0')}
          </text>
          {/* Name */}
          <text
            x={flipLeft ? loc.x - 136 : loc.x + 36}
            y={flipUp   ? loc.y - 28  : loc.y + 22}
            fill="#f0f0f0"
            fontFamily="'Space Grotesk', sans-serif"
            fontSize={11}
            fontWeight={700}
            letterSpacing={0.5}
          >
            {loc.label}
          </text>
          {/* Sublabel */}
          <text
            x={flipLeft ? loc.x - 136 : loc.x + 36}
            y={flipUp   ? loc.y - 17  : loc.y + 34}
            fill="#555"
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

export default function MapSection() {
  return (
    <section
      style={{
        padding: 'clamp(4rem, 10vw, 8rem) clamp(1.5rem, 6vw, 5rem)',
        borderBottom: '1px solid #1a1a1a',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Section label */}
      <motion.p
        initial={{ opacity: 0, x: -16 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '0.65rem',
          letterSpacing: '0.3em',
          color: '#00ff41',
          textTransform: 'uppercase',
          marginBottom: '0.75rem',
        }}
      >
        03 — THE REALM
      </motion.p>

      <motion.h2
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: 'clamp(3rem, 8vw, 7rem)',
          fontWeight: 900,
          letterSpacing: '-0.03em',
          color: '#f0f0f0',
          lineHeight: 1,
          marginBottom: '0.75rem',
        }}
      >
        THE REALM
      </motion.h2>

      <motion.p
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.2 }}
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '0.65rem',
          color: '#333',
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          marginBottom: '2.5rem',
        }}
      >
        HOVER LOCATIONS TO EXPLORE
      </motion.p>

      {/* Map container */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
        style={{
          position: 'relative',
          border: '1px solid #1a1a1a',
          overflow: 'hidden',
          background: '#040d18',
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

          {/* ── Ocean background ── */}
          <rect width="1000" height="650" fill="#040d18"/>

          {/* ── Coordinate grid ── */}
          {[100,200,300,400,500,600,700,800,900].map(x => (
            <line key={`gx${x}`} x1={x} y1={0} x2={x} y2={650} stroke="rgba(0,255,65,0.035)" strokeWidth={0.5}/>
          ))}
          {[100,200,300,400,500,600].map(y => (
            <line key={`gy${y}`} x1={0} y1={y} x2={1000} y2={y} stroke="rgba(0,255,65,0.035)" strokeWidth={0.5}/>
          ))}

          {/* ── Ocean texture dots ── */}
          {[
            [48,195],[52,430],[920,155],[945,435],[962,295],
            [68,555],[938,548],[32,318],[978,82],[920,582],
            [840,82],[48,88],[750,600],[955,195],
          ].map(([x,y], i) => (
            <circle key={i} cx={x} cy={y} r={1.5} fill="rgba(0,80,160,0.25)" />
          ))}

          {/* ── Main landmass ── */}
          <path
            d="M 435 60
               C 528 45, 674 78, 752 142
               C 810 194, 822 262, 818 330
               C 814 402, 786 460, 746 502
               C 700 550, 635 582, 555 596
               C 476 610, 396 604, 320 582
               C 232 558, 155 512, 110 458
               C 62 400, 50 336, 56 278
               C 62 218, 88 166, 132 136
               C 182 100, 298 70, 435 60 Z"
            fill="url(#landGrad)"
            stroke="rgba(0,255,65,0.2)"
            strokeWidth={1.4}
          />

          {/* ── Faraway Lands zone (west oval) ── */}
          <ellipse
            cx={162} cy={345} rx={78} ry={58}
            fill="rgba(60,55,80,0.14)"
            stroke="rgba(150,140,200,0.22)"
            strokeWidth={1.2}
            strokeDasharray="5 4"
          />
          {/* Stone/earth texture hint */}
          <ellipse cx={162} cy={345} rx={55} ry={40} fill="rgba(70,65,88,0.08)"/>
          <text x={122} y={416} fill="rgba(180,170,220,0.25)" fontFamily="'JetBrains Mono',monospace" fontSize={6.5} letterSpacing={1.5}>FARAWAY LANDS</text>

          {/* ── Old Base zone (upper circle) ── */}
          <circle
            cx={282} cy={197} r={118}
            fill="rgba(45,18,72,0.10)"
            stroke="rgba(185,115,255,0.22)"
            strokeWidth={1.4}
            strokeDasharray="6 4"
          />
          {/* Cherry grove sub-tint inside old base */}
          <ellipse cx={272} cy={188} rx={80} ry={62} fill="rgba(190,70,120,0.08)"/>
          <text x={360} y={98} fill="rgba(185,115,255,0.3)" fontFamily="'JetBrains Mono',monospace" fontSize={7} letterSpacing={2}>OLD BASE</text>

          {/* ── New Base zone (lower oval) ── */}
          <ellipse
            cx={488} cy={466} rx={200} ry={112}
            fill="rgba(8,38,78,0.16)"
            stroke="rgba(56,189,248,0.22)"
            strokeWidth={1.4}
            strokeDasharray="6 4"
          />
          {/* Coastal sub-tint inside new base */}
          <ellipse cx={510} cy={448} rx={145} ry={80} fill="rgba(12,50,105,0.10)"/>
          <text x={488} y={590} fill="rgba(56,189,248,0.25)" fontFamily="'JetBrains Mono',monospace" fontSize={7} letterSpacing={2} textAnchor="middle">NEW BASE</text>

          {/* ── Lake / river — vertical, between VENICE (east) and TOWN HALL/VILLAGE (west) ── */}
          <path
            d="M 520 390 C 512 418, 528 452, 516 488 C 505 522, 520 542, 514 562"
            fill="none" stroke="#061828" strokeWidth={11}
          />
          <path
            d="M 520 390 C 512 418, 528 452, 516 488 C 505 522, 520 542, 514 562"
            fill="none" stroke="#0d2e52" strokeWidth={6}
          />
          <path
            d="M 520 390 C 512 418, 528 452, 516 488 C 505 522, 520 542, 514 562"
            fill="none" stroke="rgba(22,90,165,0.5)" strokeWidth={2.5}
          />

          {/* ── Mushroom Island (separate, east) ── */}
          <ellipse cx={872} cy={260} rx={56} ry={44} fill="#100814" stroke="rgba(249,115,22,0.22)" strokeWidth={1.2}/>
          <ellipse cx={872} cy={260} rx={44} ry={33} fill="#160b1c"/>
          {[[856,247],[878,238],[894,256],[864,268],[886,272]].map(([x,y],i) => (
            <circle key={i} cx={x} cy={y} r={4.5} fill="rgba(210,50,50,0.48)"/>
          ))}
          <text x={835} y={316} fill="rgba(249,115,22,0.45)" fontFamily="'JetBrains Mono',monospace" fontSize={7} letterSpacing={1.5}>MUSHROOM ISLE</text>

          {/* ── Small scatter islands ── */}
          <ellipse cx={895} cy={490} rx={20} ry={14} fill="#0a140a" stroke="rgba(0,255,65,0.06)" strokeWidth={0.8}/>
          <ellipse cx={68}  cy={545} rx={24} ry={16} fill="#0a140a" stroke="rgba(0,255,65,0.06)" strokeWidth={0.8}/>
          <ellipse cx={780} cy={120} rx={16} ry={11} fill="#0a140a" stroke="rgba(0,255,65,0.05)" strokeWidth={0.8}/>

          {/* ── Map border (double line) ── */}
          <rect x={8}  y={8}  width={984} height={634} fill="none" stroke="rgba(0,255,65,0.14)" strokeWidth={1}/>
          <rect x={14} y={14} width={972} height={622} fill="none" stroke="rgba(0,255,65,0.06)" strokeWidth={0.5}/>

          {/* ── Coordinate labels ── */}
          {[100,200,300,400,500,600,700,800,900].map(x => (
            <text key={`lx${x}`} x={x} y={642} fill="rgba(0,255,65,0.18)" fontFamily="'JetBrains Mono',monospace" fontSize={7} textAnchor="middle" letterSpacing={0.5}>{x}</text>
          ))}
          {[100,200,300,400,500,600].map(y => (
            <text key={`ly${y}`} x={4} y={y + 3} fill="rgba(0,255,65,0.18)" fontFamily="'JetBrains Mono',monospace" fontSize={7} textAnchor="start" letterSpacing={0.5}>{y}</text>
          ))}

          {/* ── Location pins ── */}
          {LOCATIONS.map((loc, i) => (
            <Pin key={loc.id} loc={loc} index={i} />
          ))}

          {/* ── Compass rose (bottom right) ── */}
          <g transform="translate(930, 575)">
            <line x1={0}   y1={-28} x2={0}   y2={28}  stroke="rgba(0,255,65,0.35)" strokeWidth={0.8}/>
            <line x1={-28} y1={0}   x2={28}  y2={0}   stroke="rgba(0,255,65,0.35)" strokeWidth={0.8}/>
            <line x1={-18} y1={-18} x2={18}  y2={18}  stroke="rgba(0,255,65,0.15)" strokeWidth={0.5}/>
            <line x1={18}  y1={-18} x2={-18} y2={18}  stroke="rgba(0,255,65,0.15)" strokeWidth={0.5}/>
            <polygon points="0,-28 4,-14 0,-18 -4,-14" fill="rgba(0,255,65,0.7)"/>
            <polygon points="0,28 4,14 0,18 -4,14"     fill="rgba(0,255,65,0.2)"/>
            <rect x={-2} y={-2} width={4} height={4} fill="#00ff41" opacity={0.8}/>
            <text x={0}   y={-33} fill="rgba(0,255,65,0.7)" fontSize={8} textAnchor="middle" fontFamily="'JetBrains Mono',monospace" letterSpacing={1} fontWeight="bold">N</text>
            <text x={0}   y={44}  fill="rgba(0,255,65,0.3)" fontSize={7} textAnchor="middle" fontFamily="'JetBrains Mono',monospace" letterSpacing={1}>S</text>
            <text x={38}  y={4}   fill="rgba(0,255,65,0.3)" fontSize={7} textAnchor="start"  fontFamily="'JetBrains Mono',monospace" letterSpacing={1}>E</text>
            <text x={-38} y={4}   fill="rgba(0,255,65,0.3)" fontSize={7} textAnchor="end"    fontFamily="'JetBrains Mono',monospace" letterSpacing={1}>W</text>
          </g>

          {/* ── Map title ── */}
          <text x={28} y={38} fill="rgba(0,255,65,0.5)" fontFamily="'Space Grotesk',sans-serif" fontSize={13} fontWeight={700} letterSpacing={3}>JOD WORLD MAP</text>
          <text x={28} y={52} fill="rgba(0,255,65,0.2)" fontFamily="'JetBrains Mono',monospace" fontSize={7} letterSpacing={2}>11 LOCATIONS · SURVIVAL WORLD</text>

          {/* ── Legend ── */}
          <g transform="translate(28, 590)">
            {Object.entries(TYPE_COLOR).map(([type, color], i) => (
              <g key={type} transform={`translate(${i * 120}, 0)`}>
                <rect x={0} y={-5} width={6} height={6} fill={color} opacity={0.8}/>
                <text x={10} y={1} fill="rgba(255,255,255,0.3)" fontFamily="'JetBrains Mono',monospace" fontSize={7} letterSpacing={1}>
                  {type.toUpperCase()}
                </text>
              </g>
            ))}
          </g>

          {/* ── Edge vignette ── */}
          <rect width="1000" height="650" fill="url(#vignette)" pointerEvents="none"/>
        </svg>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.5 }}
        style={{
          marginTop: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.5rem',
        }}
      >
        <p
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '0.5rem',
            color: '#1e1e1e',
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
          }}
        >
          {LOCATIONS.length} LOCATIONS MAPPED · JOD SURVIVAL WORLD
        </p>
        <p
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '0.5rem',
            color: '#1a1a1a',
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
          }}
        >
          HOVER PINS TO EXPLORE
        </p>
      </motion.div>
    </section>
  );
}

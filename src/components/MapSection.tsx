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
  { id: 1,  label: 'GOÐI CASTLE',      sublabel: 'FAR AWAY LANDS',         x: 242, y: 322, type: 'surface'     },
  { id: 2,  label: 'JOÐ VILLE',        sublabel: 'OLD BASE · SPAWN',        x: 462, y: 255, type: 'surface'     },
  { id: 3,  label: 'PINK ESTATE',      sublabel: 'OLD BASE',                x: 408, y: 152, type: 'surface'     },
  { id: 4,  label: 'J CLUB',           sublabel: 'SECRET UNDERGROUND CLUB', x: 492, y: 345, type: 'underground' },
  { id: 5,  label: 'MUSHROOM ISLAND',  sublabel: 'SHROOMY HEAVEN',          x: 838, y: 308, type: 'island'      },
  { id: 6,  label: 'POTIONS TOWER',    sublabel: 'NEW BASE',                x: 535, y: 398, type: 'surface'     },
  { id: 7,  label: 'VENICE',           sublabel: 'NEW BASE · COASTAL',      x: 352, y: 468, type: 'surface'     },
  { id: 8,  label: 'CITY HALL',        sublabel: 'NEW BASE',                x: 544, y: 192, type: 'surface'     },
  { id: 9,  label: 'THE VILLAGE',      sublabel: 'NEW BASE · MAIN STREET',  x: 498, y: 452, type: 'surface'     },
  { id: 10, label: 'BALLOON PARADISE', sublabel: 'NEW BASE · FROM ABOVE',   x: 628, y: 212, type: 'aerial'      },
  { id: 11, label: 'NEW TOWN',         sublabel: 'NEW BASE · NIGHT',        x: 308, y: 428, type: 'surface'     },
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
  const flipLeft = loc.x > 700;
  const flipUp   = loc.y > 480;

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
          fontSize: 'clamp(2.5rem, 6vw, 5rem)',
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
          {/* ── Ocean background ── */}
          <rect width="1000" height="650" fill="#040d18"/>

          {/* ── Coordinate grid ── */}
          {[100,200,300,400,500,600,700,800,900].map(x => (
            <line key={`gx${x}`} x1={x} y1={0} x2={x} y2={650} stroke="rgba(0,255,65,0.04)" strokeWidth={0.5}/>
          ))}
          {[100,200,300,400,500,600].map(y => (
            <line key={`gy${y}`} x1={0} y1={y} x2={1000} y2={y} stroke="rgba(0,255,65,0.04)" strokeWidth={0.5}/>
          ))}

          {/* ── Ocean texture dots ── */}
          {[
            [80,180],[130,420],[180,80],[185,520],[60,310],
            [900,150],[940,420],[870,520],[955,280],[880,80],
            [150,600],[760,580],[820,80],[960,580],[50,580],
          ].map(([x,y], i) => (
            <circle key={i} cx={x} cy={y} r={1.5} fill="rgba(0,100,180,0.3)" />
          ))}

          {/* ── Main island ── */}
          <path
            d="M 460 78
               C 518 65, 604 82, 652 128
               C 698 168, 710 218, 718 262
               C 724 298, 704 334, 698 368
               C 690 402, 704 434, 690 464
               C 672 502, 618 532, 552 546
               C 496 558, 436 554, 380 540
               C 322 526, 266 502, 238 466
               C 204 428, 193 385, 193 342
               C 193 298, 205 258, 222 224
               C 240 188, 260 158, 288 138
               C 326 108, 392 90, 460 78 Z"
            fill="#0d1a0d"
            stroke="rgba(0,255,65,0.18)"
            strokeWidth={1.2}
          />

          {/* ── Biome zones ── */}

          {/* Cherry grove - north */}
          <path
            d="M 382 82 C 432 70, 520 80, 558 124 C 572 150, 562 192, 530 206
               C 498 220, 452 214, 418 198 C 374 180, 348 148, 360 112 C 366 94, 382 82, 382 82 Z"
            fill="rgba(200,80,130,0.16)"
          />

          {/* Forest — center east */}
          <path
            d="M 558 148 C 614 132, 688 162, 706 210 C 718 248, 700 298, 664 318
               C 628 334, 578 322, 554 290 C 530 258, 530 190, 558 148 Z"
            fill="rgba(20,80,30,0.2)"
          />

          {/* Settlement zone — center */}
          <path
            d="M 390 290 C 432 268, 518 264, 568 296 C 598 318, 602 368, 576 400
               C 550 432, 498 448, 448 440 C 398 432, 362 400, 362 366
               C 360 330, 372 308, 390 290 Z"
            fill="rgba(40,90,40,0.14)"
          />

          {/* Coastal / Venice — southwest */}
          <path
            d="M 238 428 C 272 412, 362 436, 396 472 C 408 490, 398 518, 375 528
               C 346 540, 290 528, 258 502 C 222 472, 210 446, 238 428 Z"
            fill="rgba(15,40,90,0.28)"
          />

          {/* Stone / castle zone — west */}
          <path
            d="M 195 295 C 218 268, 278 260, 318 282 C 348 300, 355 340, 338 368
               C 320 396, 276 405, 244 390 C 204 370, 190 325, 195 295 Z"
            fill="rgba(80,85,90,0.18)"
          />

          {/* ── River ── */}
          <path
            d="M 292 262 C 270 298, 248 342, 252 388 C 256 422, 272 448, 258 474"
            fill="none"
            stroke="#061828"
            strokeWidth={9}
          />
          <path
            d="M 292 262 C 270 298, 248 342, 252 388 C 256 422, 272 448, 258 474"
            fill="none"
            stroke="#0c2e4a"
            strokeWidth={5}
          />
          <path
            d="M 292 262 C 270 298, 248 342, 252 388 C 256 422, 272 448, 258 474"
            fill="none"
            stroke="rgba(20,80,140,0.4)"
            strokeWidth={2}
          />

          {/* ── Mushroom island ── */}
          <ellipse cx={838} cy={308} rx={52} ry={40} fill="#110815" stroke="rgba(249,115,22,0.2)" strokeWidth={1}/>
          <ellipse cx={838} cy={308} rx={42} ry={30} fill="#180d1e"/>
          {/* mushroom dots */}
          {[[820,295],[845,288],[860,305],[830,315],[852,320]].map(([x,y],i) => (
            <circle key={i} cx={x} cy={y} r={4} fill="rgba(220,50,50,0.5)"/>
          ))}
          <text x={800} y={362} fill="rgba(249,115,22,0.5)" fontFamily="'JetBrains Mono',monospace" fontSize={7} letterSpacing={1.5}>MUSHROOM ISLE</text>

          {/* ── Small islands ── */}
          <ellipse cx={155} cy={520} rx={28} ry={18} fill="#0c1a0c" stroke="rgba(0,255,65,0.08)" strokeWidth={0.8}/>
          <ellipse cx={880} cy={490} rx={22} ry={15} fill="#0c1a0c" stroke="rgba(0,255,65,0.06)" strokeWidth={0.8}/>
          <ellipse cx={760} cy={130} rx={18} ry={12} fill="#0c1a0c" stroke="rgba(0,255,65,0.06)" strokeWidth={0.8}/>

          {/* ── Map border (double line) ── */}
          <rect x={8}  y={8}  width={984} height={634} fill="none" stroke="rgba(0,255,65,0.12)" strokeWidth={1}/>
          <rect x={14} y={14} width={972} height={622} fill="none" stroke="rgba(0,255,65,0.06)" strokeWidth={0.5}/>

          {/* ── Coordinate labels ── */}
          {[100,200,300,400,500,600,700,800,900].map(x => (
            <text key={`lx${x}`} x={x} y={642} fill="rgba(0,255,65,0.2)" fontFamily="'JetBrains Mono',monospace" fontSize={7} textAnchor="middle" letterSpacing={0.5}>{x}</text>
          ))}
          {[100,200,300,400,500,600].map(y => (
            <text key={`ly${y}`} x={4} y={y + 3} fill="rgba(0,255,65,0.2)" fontFamily="'JetBrains Mono',monospace" fontSize={7} textAnchor="start" letterSpacing={0.5}>{y}</text>
          ))}

          {/* ── Location pins ── */}
          {LOCATIONS.map((loc, i) => (
            <Pin key={loc.id} loc={loc} index={i} />
          ))}

          {/* ── Compass rose (bottom right) ── */}
          <g transform="translate(930, 575)">
            {/* Arms */}
            <line x1={0}   y1={-28} x2={0}   y2={28}  stroke="rgba(0,255,65,0.35)" strokeWidth={0.8}/>
            <line x1={-28} y1={0}   x2={28}  y2={0}   stroke="rgba(0,255,65,0.35)" strokeWidth={0.8}/>
            {/* Diagonal arms */}
            <line x1={-18} y1={-18} x2={18}  y2={18}  stroke="rgba(0,255,65,0.15)" strokeWidth={0.5}/>
            <line x1={18}  y1={-18} x2={-18} y2={18}  stroke="rgba(0,255,65,0.15)" strokeWidth={0.5}/>
            {/* North arrow */}
            <polygon points="0,-28 4,-14 0,-18 -4,-14" fill="rgba(0,255,65,0.7)"/>
            {/* South arrow */}
            <polygon points="0,28 4,14 0,18 -4,14"  fill="rgba(0,255,65,0.2)"/>
            {/* Center dot */}
            <rect x={-2} y={-2} width={4} height={4} fill="#00ff41" opacity={0.8}/>
            {/* Cardinal labels */}
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
          <defs>
            <radialGradient id="vignette" cx="50%" cy="50%" r="65%">
              <stop offset="55%" stopColor="transparent"/>
              <stop offset="100%" stopColor="#020810" stopOpacity={0.75}/>
            </radialGradient>
          </defs>
          <rect width="1000" height="650" fill="url(#vignette)" pointerEvents="none"/>
        </svg>
      </motion.div>

      {/* Location count */}
      <motion.p
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.5 }}
        style={{
          marginTop: '1.5rem',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '0.5rem',
          color: '#222',
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
        }}
      >
        {LOCATIONS.length} LOCATIONS MAPPED · JOD SURVIVAL WORLD
      </motion.p>
    </section>
  );
}

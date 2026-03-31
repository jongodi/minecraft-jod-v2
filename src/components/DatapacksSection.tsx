'use client';

import { motion, useInView } from 'framer-motion';
import { useRef, useState, useCallback } from 'react';

interface Datapack {
  id:          number;
  name:        string;
  description: string;
  category:    string;
}

const DATAPACKS: Datapack[] = [
  { id:  1, name: 'MVP',                  description: 'More mob variety — unique perks & drops per biome',       category: 'LOOT'      },
  { id:  2, name: 'Banner Flags',         description: 'Plant banners as flags anywhere in the world',            category: 'BUILD'     },
  { id:  3, name: 'Call of the King',     description: 'Summon and battle a powerful new boss',                   category: 'COMBAT'    },
  { id:  4, name: 'Colored Name Teams',   description: 'Color-coded team nametags visible above players',         category: 'SOCIAL'    },
  { id:  5, name: 'Dungeons & Taverns',   description: 'Overhauled dungeons and tavern structures in worldgen',   category: 'STRUCTURE' },
  { id:  6, name: 'Ghast Mayhem',         description: 'Ghasts are angrier, more dangerous, and more rewarding', category: 'COMBAT'    },
  { id:  7, name: 'Holographic Tags',     description: 'Floating holographic name displays above players',        category: 'SOCIAL'    },
  { id:  8, name: 'LY Graves',            description: 'A grave marks your death — your loot stays safe',        category: 'SURVIVAL'  },
  { id:  9, name: 'Show Player Health',   description: "See other players' health above their heads",             category: 'SOCIAL'    },
  { id: 10, name: 'Better Mineshaft',     description: 'Completely redesigned mineshaft structures to explore',  category: 'STRUCTURE' },
  { id: 11, name: 'MC Paint',             description: 'Create custom pixel-art paintings in-game',              category: 'BUILD'     },
  { id: 12, name: 'Waystones',            description: 'Place waystones to fast-travel across the world',        category: 'QOL'       },
  { id: 13, name: 'Vanilla Refresh',      description: 'New items, recipes and mechanics that feel vanilla',     category: 'QOL'       },
  { id: 14, name: 'Wabi-Sabi Structures', description: 'Japanese-inspired structures scattered across the world',category: 'STRUCTURE' },
];

const CATEGORY_COLORS: Record<string, string> = {
  BUILD:     '#00ff41',
  SURVIVAL:  '#ff6b35',
  QOL:       '#4ecdc4',
  LOOT:      '#f7dc6f',
  WORLD:     '#95e1d3',
  TRADE:     '#c9b1ff',
  CRAFT:     '#ff9ff3',
  COMBAT:    '#ff4466',
  SOCIAL:    '#c9b1ff',
  STRUCTURE: '#f0a500',
};

function DatapackCard({ pack, index }: { pack: Datapack; index: number }) {
  const categoryColor = CATEGORY_COLORS[pack.category] ?? '#00ff41';
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [isHov, setIsHov] = useState(false);

  const onMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const rx   = (e.clientX - rect.left) / rect.width  - 0.5;
    const ry   = (e.clientY - rect.top)  / rect.height - 0.5;
    setTilt({ x: rx * 8, y: ry * -8 });
  }, []);

  const onLeave = useCallback(() => {
    setIsHov(false);
    setTilt({ x: 0, y: 0 });
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.5, delay: index * 0.06, ease: [0.16, 1, 0.3, 1] }}
      onMouseEnter={() => setIsHov(true)}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      data-cursor="hover"
      style={{
        background:     '#111111',
        border:         `1px solid ${isHov ? 'rgba(0,255,65,0.4)' : '#1a1a1a'}`,
        padding:        '1.25rem',
        display:        'flex',
        flexDirection:  'column',
        gap:            '0.75rem',
        position:       'relative',
        overflow:       'hidden',
        transform:      `perspective(800px) rotateY(${tilt.x}deg) rotateX(${tilt.y}deg) translateY(${isHov ? -4 : 0}px)`,
        transition:     isHov
          ? 'border-color 0.25s ease, box-shadow 0.25s ease'
          : 'transform 0.5s cubic-bezier(0.03,0.98,0.52,0.99), border-color 0.3s ease, box-shadow 0.4s ease',
        boxShadow:      isHov
          ? `0 12px 40px rgba(0,0,0,0.6), 0 0 24px rgba(0,255,65,0.08)`
          : 'none',
        willChange:     'transform',
        transformStyle: 'preserve-3d',
      }}
    >
      {/* Top accent line — slides in on hover */}
      <div
        style={{
          position:        'absolute',
          top:             0, left: 0, right: 0,
          height:          '2px',
          background:      `linear-gradient(to right, ${categoryColor}, transparent)`,
          transform:       `scaleX(${isHov ? 1 : 0})`,
          transformOrigin: 'left',
          transition:      'transform 0.35s cubic-bezier(0.16,1,0.3,1)',
        }}
      />

      {/* Corner accent */}
      <div style={{
        position:    'absolute',
        top: 0, right: 0,
        width: 0, height: 0,
        borderLeft:  '20px solid transparent',
        borderTop:   `20px solid ${categoryColor}22`,
      }} />

      {/* Category tag + index */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span
          style={{
            fontFamily:    "'JetBrains Mono', monospace",
            fontSize:      '0.55rem',
            letterSpacing: '0.3em',
            color:         categoryColor,
            textTransform: 'uppercase',
            background:    `${categoryColor}12`,
            padding:       '0.2rem 0.5rem',
            border:        `1px solid ${categoryColor}33`,
          }}
        >
          {pack.category}
        </span>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.5rem', color: '#333', letterSpacing: '0.1em' }}>
          #{String(pack.id).padStart(2, '0')}
        </span>
      </div>

      {/* Name */}
      <h3
        style={{
          fontFamily:    "'Space Grotesk', sans-serif",
          fontSize:      '1rem',
          fontWeight:    700,
          color:         '#f0f0f0',
          letterSpacing: '-0.01em',
          lineHeight:    1.2,
        }}
      >
        {pack.name}
      </h3>

      {/* Description */}
      <p
        style={{
          fontFamily:    "'JetBrains Mono', monospace",
          fontSize:      '0.7rem',
          color:         '#555',
          lineHeight:    1.6,
          letterSpacing: '0.02em',
          marginTop:     'auto',
        }}
      >
        {pack.description}
      </p>
    </motion.div>
  );
}

export default function DatapacksSection() {
  const headerRef = useRef<HTMLDivElement>(null);
  const isInView  = useInView(headerRef, { once: true, margin: '-80px' });

  return (
    <section
      style={{
        padding:      'clamp(4rem, 10vw, 8rem) clamp(1.5rem, 6vw, 5rem)',
        borderBottom: '1px solid #1a1a1a',
        background:   '#080808',
      }}
    >
      {/* Header */}
      <div ref={headerRef} style={{ marginBottom: '3rem' }}>
        <motion.p
          initial={{ opacity: 0, x: -16 }}
          animate={isInView ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.5 }}
          style={{
            fontFamily:    "'JetBrains Mono', monospace",
            fontSize:      '0.65rem',
            letterSpacing: '0.3em',
            color:         '#00ff41',
            textTransform: 'uppercase',
            marginBottom:  '0.75rem',
          }}
        >
          04 — DATAPACKS
        </motion.p>

        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          style={{
            fontFamily:    "'Space Grotesk', sans-serif",
            fontSize:      'clamp(2.5rem, 6vw, 5rem)',
            fontWeight:    900,
            letterSpacing: '-0.03em',
            color:         '#f0f0f0',
            lineHeight:    1,
          }}
        >
          DATAPACKS
        </motion.h2>

        <motion.p
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.5, delay: 0.3 }}
          style={{
            marginTop:     '1rem',
            fontFamily:    "'JetBrains Mono', monospace",
            fontSize:      '0.75rem',
            color:         '#444',
            letterSpacing: '0.05em',
            maxWidth:      '400px',
          }}
        >
          14 datapacks — combat, structure, social, and more.
        </motion.p>
      </div>

      {/* Grid */}
      <div
        style={{
          display:             'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(min(240px, 100%), 1fr))',
          gap:                 '1px',
          background:          '#1a1a1a',
          border:              '1px solid #1a1a1a',
        }}
      >
        {DATAPACKS.map((pack, i) => (
          <DatapackCard key={pack.id} pack={pack} index={i} />
        ))}
      </div>
    </section>
  );
}

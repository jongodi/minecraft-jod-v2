'use client';

import { motion, useInView } from 'framer-motion';
import { useRef, useState } from 'react';

interface Datapack {
  id:          number;
  name:        string;
  description: string;
  category:    string;
}

const DATAPACKS: Datapack[] = [
  { id:  1, name: 'MVP',                   description: 'More mob variety — unique perks & drops per biome',        category: 'LOOT'      },
  { id:  2, name: 'Banner Flags',          description: 'Plant banners as flags anywhere in the world',             category: 'BUILD'     },
  { id:  3, name: 'Call of the King',      description: 'Summon and battle a powerful new boss',                    category: 'COMBAT'    },
  { id:  4, name: 'Colored Name Teams',    description: 'Color-coded team nametags visible above players',          category: 'SOCIAL'    },
  { id:  5, name: 'Dungeons & Taverns',    description: 'Overhauled dungeons and tavern structures in worldgen',    category: 'STRUCTURE' },
  { id:  6, name: 'Ghast Mayhem',          description: 'Ghasts are angrier, more dangerous, and more rewarding',  category: 'COMBAT'    },
  { id:  7, name: 'Holographic Tags',      description: 'Floating holographic name displays above players',         category: 'SOCIAL'    },
  { id:  8, name: 'LY Graves',             description: 'A grave marks your death — your loot stays safe',         category: 'SURVIVAL'  },
  { id:  9, name: 'Show Player Health',    description: "See other players' health above their heads",              category: 'SOCIAL'    },
  { id: 10, name: 'Better Mineshaft',      description: 'Completely redesigned mineshaft structures to explore',   category: 'STRUCTURE' },
  { id: 11, name: 'MC Paint',              description: 'Create custom pixel-art paintings in-game',               category: 'BUILD'     },
  { id: 12, name: 'Waystones',             description: 'Place waystones to fast-travel across the world',         category: 'QOL'       },
  { id: 13, name: 'Vanilla Refresh',       description: 'New items, recipes and mechanics that feel vanilla',      category: 'QOL'       },
  { id: 14, name: 'Wabi-Sabi Structures',  description: 'Japanese-inspired structures scattered across the world', category: 'STRUCTURE' },
];

const CATEGORY_STYLE: Record<string, { color: string; bg: string }> = {
  BUILD:     { color: '#10B981', bg: 'rgba(16,185,129,0.10)' },
  SURVIVAL:  { color: '#F59E0B', bg: 'rgba(245,158,11,0.10)' },
  QOL:       { color: '#06B6D4', bg: 'rgba(6,182,212,0.10)'  },
  LOOT:      { color: '#F5A623', bg: 'rgba(245,166,35,0.10)' },
  WORLD:     { color: '#34D399', bg: 'rgba(52,211,153,0.10)' },
  TRADE:     { color: '#C084FC', bg: 'rgba(192,132,252,0.10)'},
  CRAFT:     { color: '#FB7185', bg: 'rgba(251,113,133,0.10)'},
  COMBAT:    { color: '#EF4444', bg: 'rgba(239,68,68,0.10)'  },
  SOCIAL:    { color: '#8B5CF6', bg: 'rgba(139,92,246,0.10)' },
  STRUCTURE: { color: '#F5A623', bg: 'rgba(245,166,35,0.08)' },
};

function DatapackCard({ pack, index }: { pack: Datapack; index: number }) {
  const [hovered, setHovered] = useState(false);
  const cat    = CATEGORY_STYLE[pack.category] ?? { color: '#F5A623', bg: 'rgba(245,166,35,0.08)' };

  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.55, delay: index * 0.055, ease: [0.16, 1, 0.3, 1] }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      data-cursor="hover"
      style={{
        background:     hovered
          ? 'rgba(12,18,35,0.95)'
          : 'rgba(8,14,28,0.8)',
        border:         `1px solid ${hovered ? `rgba(245,166,35,0.3)` : 'rgba(255,255,255,0.06)'}`,
        backdropFilter: 'blur(10px)',
        padding:        '1.4rem',
        display:        'flex',
        flexDirection:  'column',
        gap:            '0.8rem',
        position:       'relative',
        overflow:       'hidden',
        transform:      hovered ? 'translateY(-4px)' : 'translateY(0)',
        boxShadow:      hovered
          ? `0 16px 48px rgba(0,0,0,0.5), 0 0 30px rgba(245,166,35,0.08)`
          : '0 4px 16px rgba(0,0,0,0.3)',
        transition:     'all 0.3s cubic-bezier(0.16,1,0.3,1)',
      }}
    >
      {/* Top accent line */}
      <div
        style={{
          position:   'absolute',
          top:        0,
          left:       0,
          right:      0,
          height:     '2px',
          background: `linear-gradient(to right, ${cat.color}, transparent)`,
          opacity:    hovered ? 1 : 0,
          transition: 'opacity 0.3s ease',
        }}
      />

      {/* Number + category */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span
          style={{
            fontFamily:    "'JetBrains Mono', monospace",
            fontSize:      '0.52rem',
            letterSpacing: '0.28em',
            color:         cat.color,
            textTransform: 'uppercase',
            background:    cat.bg,
            padding:       '0.18rem 0.55rem',
            border:        `1px solid ${cat.color}33`,
          }}
        >
          {pack.category}
        </span>
        <span
          style={{
            fontFamily:    "'JetBrains Mono', monospace",
            fontSize:      '0.48rem',
            color:         'rgba(255,255,255,0.18)',
            letterSpacing: '0.08em',
          }}
        >
          #{String(pack.id).padStart(2, '0')}
        </span>
      </div>

      {/* Name */}
      <h3
        style={{
          fontFamily:    "'Playfair Display', serif",
          fontSize:      'clamp(0.95rem, 1.8vw, 1.15rem)',
          fontWeight:    700,
          color:         hovered ? '#F0EAD6' : 'rgba(240,234,214,0.85)',
          letterSpacing: '0.01em',
          lineHeight:    1.2,
          transition:    'color 0.25s ease',
        }}
      >
        {pack.name}
      </h3>

      {/* Description */}
      <p
        style={{
          fontFamily:    "'Inter', sans-serif",
          fontSize:      '0.75rem',
          color:         'rgba(255,255,255,0.35)',
          lineHeight:    1.65,
          fontWeight:    300,
          marginTop:     'auto',
          transition:    'color 0.25s ease',
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
        padding:      'clamp(5rem, 12vw, 10rem) clamp(1.5rem, 6vw, 5rem)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        background:   '#060A14',
        position:     'relative',
        overflow:     'hidden',
      }}
    >
      {/* Background glow */}
      <div
        style={{
          position:      'absolute',
          top:           '10%',
          right:         '-5%',
          width:         '45vw',
          height:        '60vh',
          background:    'radial-gradient(ellipse, rgba(139,92,246,0.05) 0%, transparent 65%)',
          pointerEvents: 'none',
        }}
      />

      {/* Header */}
      <div ref={headerRef} style={{ marginBottom: 'clamp(2.5rem, 5vw, 4rem)' }}>
        <motion.p
          initial={{ opacity: 0, x: -16 }}
          animate={isInView ? { opacity: 1, x: 0 } : {}}
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
          04 — Datapacks
        </motion.p>

        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          style={{
            fontFamily:    "'Playfair Display', serif",
            fontSize:      'clamp(2.8rem, 7vw, 6rem)',
            fontWeight:    900,
            fontStyle:     'italic',
            color:         '#F0EAD6',
            lineHeight:    1,
          }}
        >
          Datapacks
        </motion.h2>

        <motion.div
          initial={{ scaleX: 0 }}
          animate={isInView ? { scaleX: 1 } : {}}
          transition={{ duration: 0.8, delay: 0.3 }}
          style={{
            marginTop:      '1.25rem',
            width:          'clamp(80px, 15vw, 160px)',
            height:         '2px',
            background:     'linear-gradient(to right, #F5A623, rgba(245,166,35,0))',
            transformOrigin: 'left',
          }}
        />

        <motion.p
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.5, delay: 0.45 }}
          style={{
            marginTop:     '1rem',
            fontFamily:    "'Inter', sans-serif",
            fontSize:      '0.8rem',
            color:         'rgba(255,255,255,0.3)',
            fontWeight:    300,
          }}
        >
          {DATAPACKS.length} datapacks — combat, structure, social, and more.
        </motion.p>
      </div>

      {/* Grid */}
      <div
        style={{
          display:             'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(min(260px, 100%), 1fr))',
          gap:                 'clamp(0.75rem, 1.2vw, 1rem)',
        }}
      >
        {DATAPACKS.map((pack, i) => (
          <DatapackCard key={pack.id} pack={pack} index={i} />
        ))}
      </div>
    </section>
  );
}

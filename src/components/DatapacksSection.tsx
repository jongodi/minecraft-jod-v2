'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';

interface Datapack {
  id: number;
  name: string;
  description: string;
  category: string;
}

const DATAPACKS: Datapack[] = [
  { id: 1,  name: 'MVP',                   description: 'More mob variety — unique perks & drops per biome',             category: 'LOOT'      },
  { id: 2,  name: 'Banner Flags',          description: 'Plant banners as flags anywhere in the world',                   category: 'BUILD'     },
  { id: 3,  name: 'Call of the King',      description: 'Summon and battle a powerful new boss',                          category: 'COMBAT'    },
  { id: 4,  name: 'Colored Name Teams',    description: 'Color-coded team nametags visible above players',                category: 'SOCIAL'    },
  { id: 5,  name: 'Dungeons & Taverns',    description: 'Overhauled dungeons and tavern structures in worldgen',          category: 'STRUCTURE' },
  { id: 6,  name: 'Ghast Mayhem',          description: 'Ghasts are angrier, more dangerous, and more rewarding',        category: 'COMBAT'    },
  { id: 7,  name: 'Holographic Tags',      description: 'Floating holographic name displays above players',               category: 'SOCIAL'    },
  { id: 8,  name: 'LY Graves',             description: 'A grave marks your death — your loot stays safe',                category: 'SURVIVAL'  },
  { id: 9,  name: 'Show Player Health',    description: "See other players' health above their heads",                    category: 'SOCIAL'    },
  { id: 10, name: 'Better Mineshaft',      description: 'Completely redesigned mineshaft structures to explore',          category: 'STRUCTURE' },
  { id: 11, name: 'MC Paint',             description: 'Create custom pixel-art paintings in-game',                      category: 'BUILD'     },
  { id: 12, name: 'Waystones',            description: 'Place waystones to fast-travel across the world',                 category: 'QOL'       },
  { id: 13, name: 'Vanilla Refresh',      description: 'New items, recipes and mechanics that feel vanilla',              category: 'QOL'       },
  { id: 14, name: 'Wabi-Sabi Structures', description: 'Japanese-inspired structures scattered across the world',         category: 'STRUCTURE' },
];

const CATEGORY_COLORS: Record<string, string> = {
  BUILD: '#00ff41', SURVIVAL: '#ff6b35', QOL: '#4ecdc4', LOOT: '#f7dc6f',
  WORLD: '#95e1d3', TRADE: '#c9b1ff', CRAFT: '#ff9ff3',
  COMBAT: '#ff4466', SOCIAL: '#c9b1ff', STRUCTURE: '#f0a500',
};

function DatapackRow({ pack, index }: { pack: Datapack; index: number }) {
  const [hovered, setHovered] = useState(false);
  const color = CATEGORY_COLORS[pack.category] ?? '#00ff41';

  return (
    <motion.div
      initial={{ opacity: 0, x: -24 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: '-20px' }}
      transition={{ duration: 0.5, delay: index * 0.035, ease: [0.16, 1, 0.3, 1] }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'grid',
        gridTemplateColumns: '3.5rem 1fr auto',
        alignItems: 'start',
        gap: '0 clamp(1rem, 3vw, 2.5rem)',
        padding: 'clamp(1rem, 2vw, 1.5rem) 0',
        borderBottom: '1px solid #111',
        position: 'relative',
        background: hovered ? 'rgba(0,255,65,0.018)' : 'transparent',
        transition: 'background 0.25s ease',
      }}
    >
      {/* Left accent bar */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: '2px',
          background: color,
          transformOrigin: 'top',
          transform: hovered ? 'scaleY(1)' : 'scaleY(0)',
          transition: 'transform 0.22s ease',
        }}
      />

      {/* Index number */}
      <span
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '0.6rem',
          color: hovered ? color : '#222',
          letterSpacing: '0.08em',
          paddingTop: '0.2rem',
          paddingLeft: '0.75rem',
          transition: 'color 0.25s ease',
        }}
      >
        {String(pack.id).padStart(2, '0')}
      </span>

      {/* Name + description */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
        <h3
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 'clamp(1.1rem, 2.5vw, 1.8rem)',
            fontWeight: 700,
            letterSpacing: '-0.02em',
            color: hovered ? '#f0f0f0' : '#555',
            lineHeight: 1.1,
            transition: 'color 0.22s ease',
          }}
        >
          {pack.name}
        </h3>
        <p
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '0.65rem',
            color: '#3a3a3a',
            lineHeight: 1.55,
            letterSpacing: '0.01em',
            opacity: hovered ? 1 : 0,
            transform: hovered ? 'translateY(0)' : 'translateY(4px)',
            transition: 'opacity 0.25s ease, transform 0.25s ease',
            maxWidth: '520px',
          }}
        >
          {pack.description}
        </p>
      </div>

      {/* Category */}
      <span
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '0.52rem',
          letterSpacing: '0.28em',
          color: hovered ? color : '#2a2a2a',
          textTransform: 'uppercase',
          paddingTop: '0.25rem',
          transition: 'color 0.25s ease',
          whiteSpace: 'nowrap',
        }}
      >
        {pack.category}
      </span>

      {/* Ghost number */}
      <span
        aria-hidden
        style={{
          position: 'absolute',
          right: '-0.5rem',
          top: '50%',
          transform: 'translateY(-50%)',
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: 'clamp(4rem, 8vw, 8rem)',
          fontWeight: 900,
          color: hovered ? 'rgba(0,255,65,0.04)' : 'rgba(255,255,255,0.018)',
          lineHeight: 1,
          userSelect: 'none',
          pointerEvents: 'none',
          letterSpacing: '-0.05em',
          transition: 'color 0.3s ease',
          zIndex: 0,
        }}
      >
        {String(pack.id).padStart(2, '0')}
      </span>
    </motion.div>
  );
}

export default function DatapacksSection() {
  return (
    <section
      style={{
        padding: 'clamp(4rem, 10vw, 8rem) clamp(1.5rem, 6vw, 5rem)',
        borderBottom: '1px solid #1a1a1a',
        background: '#080808',
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: 'clamp(2rem, 4vw, 4rem)' }}>
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
          04 — DATAPACKS
        </motion.p>

        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
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
            }}
          >
            DATAPACKS
          </motion.h2>

          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '0.6rem',
              color: '#2a2a2a',
              letterSpacing: '0.2em',
              paddingBottom: '0.4rem',
            }}
          >
            14 ACTIVE
          </motion.p>
        </div>

        {/* Full-width divider */}
        <motion.div
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          style={{
            marginTop: '1.5rem',
            height: '1px',
            background: 'linear-gradient(to right, #00ff41 0%, rgba(0,255,65,0.3) 30%, rgba(0,255,65,0.08) 60%, transparent)',
            transformOrigin: 'left',
          }}
        />
      </div>

      {/* List */}
      <div>
        {DATAPACKS.map((pack, i) => (
          <DatapackRow key={pack.id} pack={pack} index={i} />
        ))}
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.4 }}
        style={{
          marginTop: '2rem',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '0.5rem',
          color: '#1e1e1e',
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
        }}
      >
        HOVER TO REVEAL — ALL SOURCED FROM MODRINTH
      </motion.p>
    </section>
  );
}

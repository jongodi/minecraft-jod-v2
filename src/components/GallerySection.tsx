'use client';

import { motion } from 'framer-motion';
import { useRef, useState, useCallback } from 'react';

interface GalleryItem {
  id:       number;
  label:    string;
  sublabel: string;
  photo:    string;
}

const GALLERY_ITEMS: GalleryItem[] = [
  { id:  1, label: 'GOÐI CASTLE',       sublabel: 'Far Away Lands',         photo: '/screenshots/the-castle.png'      },
  { id:  2, label: 'JOÐ VILLE',         sublabel: 'Old Base · Spawn',       photo: '/screenshots/spawn-hill.png'      },
  { id:  3, label: 'PINK ESTATE',       sublabel: 'Old Base',               photo: '/screenshots/cherry-estate.png'   },
  { id:  4, label: 'J CLUB',            sublabel: 'Secret Underground',     photo: '/screenshots/j-club.png'          },
  { id:  5, label: 'MUSHROOM ISLAND',   sublabel: 'Shroomy Heaven',         photo: '/screenshots/mushroom-isle.png'   },
  { id:  6, label: 'POTIONS TOWER',     sublabel: 'New Base',               photo: '/screenshots/the-hall.png'        },
  { id:  7, label: 'VENICE',            sublabel: 'New Base · Coastal',     photo: '/screenshots/waterfront.png'      },
  { id:  8, label: 'CITY HALL',         sublabel: 'New Base',               photo: '/screenshots/the-tavern.png'      },
  { id:  9, label: 'THE VILLAGE',       sublabel: 'New Base · Main Street', photo: '/screenshots/the-village.png'     },
  { id: 10, label: 'BALLOON PARADISE',  sublabel: 'New Base · From Above',  photo: '/screenshots/balloon-island.png'  },
  { id: 11, label: 'NEW TOWN',          sublabel: 'New Base · Night',       photo: '/screenshots/night-sky.png'       },
];

function GalleryCard({ item, index }: { item: GalleryItem; index: number }) {
  const [hovered, setHovered]     = useState(false);
  const [tilt,    setTilt]        = useState({ x: 0, y: 0 });
  const [glowPos, setGlowPos]     = useState({ x: 50, y: 50 });
  const cardRef                   = useRef<HTMLDivElement>(null);

  const onMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const rx   = (e.clientX - rect.left) / rect.width  - 0.5;
    const ry   = (e.clientY - rect.top)  / rect.height - 0.5;
    setTilt({ x: rx * 16, y: ry * -16 });
    setGlowPos({
      x: ((e.clientX - rect.left) / rect.width)  * 100,
      y: ((e.clientY - rect.top)  / rect.height) * 100,
    });
  }, []);

  const onLeave = useCallback(() => {
    setHovered(false);
    setTilt({ x: 0, y: 0 });
    setGlowPos({ x: 50, y: 50 });
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.6, delay: index * 0.06, ease: [0.16, 1, 0.3, 1] }}
      onMouseEnter={() => setHovered(true)}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      ref={cardRef}
      data-cursor="hover"
      style={{
        position:       'relative',
        aspectRatio:    '16 / 9',
        overflow:       'hidden',
        border:         `1px solid ${hovered ? 'rgba(245,166,35,0.4)' : 'rgba(255,255,255,0.06)'}`,
        transform:      `perspective(900px) rotateY(${tilt.x}deg) rotateX(${tilt.y}deg) scale(${hovered ? 1.03 : 1})`,
        transition:     hovered
          ? 'border-color 0.3s ease, box-shadow 0.3s ease'
          : 'transform 0.55s cubic-bezier(0.03,0.98,0.52,0.99), border-color 0.4s ease, box-shadow 0.4s ease',
        boxShadow:      hovered
          ? `0 20px 60px rgba(0,0,0,0.7), 0 0 40px rgba(245,166,35,0.12), ${-tilt.x * 1.2}px ${tilt.y * 1.2}px 30px rgba(0,0,0,0.3)`
          : '0 4px 20px rgba(0,0,0,0.4)',
        willChange:     'transform',
        transformStyle: 'preserve-3d',
      }}
    >
      {/* Photo */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={item.photo}
        alt={item.label}
        style={{
          position:   'absolute',
          inset:      0,
          width:      '100%',
          height:     '100%',
          objectFit:  'cover',
          objectPosition: 'center',
          transform:  hovered ? 'scale(1.08)' : 'scale(1)',
          transition: 'transform 0.7s cubic-bezier(0.16,1,0.3,1)',
        }}
      />

      {/* Mouse glow overlay */}
      <div
        style={{
          position:   'absolute',
          inset:      0,
          background: `radial-gradient(circle at ${glowPos.x}% ${glowPos.y}%, rgba(245,166,35,0.14) 0%, transparent 65%)`,
          opacity:    hovered ? 1 : 0,
          transition: 'opacity 0.3s ease',
          pointerEvents: 'none',
          zIndex:     2,
        }}
      />

      {/* Gradient overlay */}
      <div
        style={{
          position:   'absolute',
          inset:      0,
          background: `linear-gradient(to top,
            rgba(3,5,10,0.96) 0%,
            rgba(3,5,10,0.55) 35%,
            rgba(3,5,10,0.15) 60%,
            transparent 100%
          )`,
          zIndex: 3,
        }}
      />

      {/* Top-right index */}
      <div
        style={{
          position:      'absolute',
          top:           '0.75rem',
          right:         '0.85rem',
          fontFamily:    "'JetBrains Mono', monospace",
          fontSize:      '0.48rem',
          letterSpacing: '0.12em',
          color:         'rgba(255,255,255,0.25)',
          zIndex:        4,
        }}
      >
        {String(item.id).padStart(2, '0')} / {String(GALLERY_ITEMS.length).padStart(2, '0')}
      </div>

      {/* Labels */}
      <div
        style={{
          position:  'absolute',
          bottom:    0,
          left:      0,
          right:     0,
          padding:   '1.2rem 1rem 1rem',
          zIndex:    4,
          transform: hovered ? 'translateY(0)' : 'translateY(6px)',
          transition: 'transform 0.4s cubic-bezier(0.16,1,0.3,1)',
        }}
      >
        <p
          style={{
            fontFamily:    "'JetBrains Mono', monospace",
            fontSize:      '0.48rem',
            letterSpacing: '0.25em',
            color:         hovered ? 'rgba(245,166,35,0.9)' : 'rgba(255,255,255,0.35)',
            textTransform: 'uppercase',
            marginBottom:  '0.3rem',
            transition:    'color 0.35s ease',
          }}
        >
          {item.sublabel}
        </p>
        <p
          style={{
            fontFamily:    "'Playfair Display', serif",
            fontSize:      'clamp(0.85rem, 1.8vw, 1.1rem)',
            fontWeight:    700,
            letterSpacing: '0.03em',
            color:         '#F0EAD6',
            lineHeight:    1.1,
          }}
        >
          {item.label}
        </p>
      </div>

      {/* Border shimmer on hover */}
      <div
        style={{
          position:  'absolute',
          inset:     0,
          border:    `1px solid rgba(245,166,35,${hovered ? 0.3 : 0})`,
          transition: 'border-color 0.4s ease',
          zIndex:    5,
          pointerEvents: 'none',
        }}
      />
    </motion.div>
  );
}

export default function GallerySection() {
  return (
    <section
      style={{
        padding:      'clamp(5rem, 12vw, 10rem) clamp(1.5rem, 6vw, 5rem)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        background:   '#03050A',
        position:     'relative',
        overflow:     'hidden',
      }}
    >
      {/* Subtle bg glow */}
      <div
        style={{
          position:      'absolute',
          top:           '20%',
          left:          '50%',
          transform:     'translateX(-50%)',
          width:         '80vw',
          height:        '50vh',
          background:    'radial-gradient(ellipse, rgba(139,92,246,0.05) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      {/* Section header */}
      <div style={{ marginBottom: 'clamp(2.5rem, 5vw, 4rem)' }}>
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
          02 — The World
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
            letterSpacing: '-0.01em',
            color:         '#F0EAD6',
            lineHeight:    1,
          }}
        >
          The World
        </motion.h2>

        <motion.div
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true }}
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
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 }}
          style={{
            marginTop:     '1rem',
            fontFamily:    "'Inter', sans-serif",
            fontSize:      '0.8rem',
            color:         'rgba(255,255,255,0.3)',
            fontWeight:    300,
            letterSpacing: '0.02em',
          }}
        >
          11 locations across the realm — hover to explore
        </motion.p>
      </div>

      {/* Grid — all same 16:9 size */}
      <div
        style={{
          display:               'grid',
          gridTemplateColumns:   'repeat(auto-fill, minmax(min(340px, 100%), 1fr))',
          gap:                   'clamp(0.75rem, 1.5vw, 1.25rem)',
        }}
      >
        {GALLERY_ITEMS.map((item, i) => (
          <GalleryCard key={item.id} item={item} index={i} />
        ))}
      </div>

      {/* Bottom meta */}
      <motion.p
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.3 }}
        style={{
          marginTop:     '2rem',
          fontFamily:    "'JetBrains Mono', monospace",
          fontSize:      '0.52rem',
          color:         'rgba(255,255,255,0.12)',
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          textAlign:     'center',
        }}
      >
        Screenshots from JOD · play.jodcraft.world
      </motion.p>
    </section>
  );
}

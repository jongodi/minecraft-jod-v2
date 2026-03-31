'use client';

import { motion } from 'framer-motion';
import { useCallback, useState } from 'react';

interface GalleryItem {
  id:       number;
  label:    string;
  sublabel: string;
  gradient: string;
  photo:    string;
}

const GALLERY_ITEMS: GalleryItem[] = [
  {
    id: 1, label: 'GOÐI CASTLE', sublabel: 'FAR AWAY LANDS',
    gradient: 'linear-gradient(160deg, #87ceeb 0%, #6ba8d4 20%, #4a7a5a 45%, #3a5a3a 65%, #555a55 85%, #404040 100%)',
    photo: '/screenshots/the-castle.png',
  },
  {
    id: 2, label: 'JOÐ VILLE', sublabel: 'OLD BASE',
    gradient: 'linear-gradient(160deg, #87ceeb 0%, #6ba8d4 20%, #c8a0b8 45%, #5a9a6a 65%, #7a7a6a 85%, #555045 100%)',
    photo: '/screenshots/spawn-hill.png',
  },
  {
    id: 3, label: 'PINK ESTATE', sublabel: 'OLD BASE',
    gradient: 'linear-gradient(160deg, #87ceeb 0%, #c8a0b8 20%, #d4789a 45%, #c06888 65%, #a85878 85%, #903060 100%)',
    photo: '/screenshots/cherry-estate.png',
  },
  {
    id: 4, label: 'J CLUB', sublabel: 'SECRET UNDERGROUND CLUB',
    gradient: 'linear-gradient(160deg, #050308 0%, #120820 25%, #1e0a30 50%, #2d1048 70%, #1a0828 100%)',
    photo: '/screenshots/j-club.png',
  },
  {
    id: 5, label: 'MUSHROOM ISLAND', sublabel: 'SHROOMY HEAVEN',
    gradient: 'linear-gradient(160deg, #87ceeb 0%, #6ba8d4 20%, #cc2222 45%, #aa1818 65%, #1a3860 80%, #081828 100%)',
    photo: '/screenshots/mushroom-isle.png',
  },
  {
    id: 6, label: 'POTIONS TOWER', sublabel: 'NEW BASE',
    gradient: 'linear-gradient(160deg, #1e1810 0%, #302820 25%, #483828 50%, #605040 70%, #786858 100%)',
    photo: '/screenshots/the-hall.png',
  },
  {
    id: 7, label: 'VENICE', sublabel: 'NEW BASE',
    gradient: 'linear-gradient(160deg, #87ceeb 0%, #c87840 25%, #a86030 45%, #284e78 65%, #183060 85%, #0a1828 100%)',
    photo: '/screenshots/waterfront.png',
  },
  {
    id: 8, label: 'CITY HALL', sublabel: 'NEW BASE',
    gradient: 'linear-gradient(160deg, #87ceeb 0%, #6ba8d4 20%, #7a5a30 45%, #504020 65%, #3a3018 85%, #252010 100%)',
    photo: '/screenshots/the-tavern.png',
  },
  {
    id: 9, label: 'THE VILLAGE', sublabel: 'NEW BASE',
    gradient: 'linear-gradient(160deg, #87ceeb 0%, #6ba8d4 20%, #6a8a40 40%, #4a6a28 60%, #7a5a30 80%, #503818 100%)',
    photo: '/screenshots/the-village.png',
  },
  {
    id: 10, label: 'BALLOON PARADISE', sublabel: 'NEW BASE',
    gradient: 'linear-gradient(160deg, #87ceeb 0%, #a8d4f0 20%, #6bc8f0 40%, #4a9a6a 65%, #387850 85%, #204830 100%)',
    photo: '/screenshots/balloon-island.png',
  },
  {
    id: 11, label: 'NEW TOWN', sublabel: 'NEW BASE',
    gradient: 'linear-gradient(160deg, #020408 0%, #080d18 20%, #0d1525 40%, #1a2a40 60%, #102030 80%, #050a12 100%)',
    photo: '/screenshots/night-sky.png',
  },
];

/* ── Single card with 3D tilt + green spotlight ─────────────── */
function GalleryCard({ item, index }: { item: GalleryItem; index: number }) {
  const [hovered,  setHovered]  = useState(false);
  const [tilt,     setTilt]     = useState({ x: 0, y: 0 });
  const [glow,     setGlow]     = useState({ x: 50, y: 50 });

  const onMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const rx   = (e.clientX - rect.left) / rect.width  - 0.5; // −0.5 … +0.5
    const ry   = (e.clientY - rect.top)  / rect.height - 0.5;
    setTilt({ x: rx * 14, y: ry * -14 });
    setGlow({
      x: ((e.clientX - rect.left) / rect.width)  * 100,
      y: ((e.clientY - rect.top)  / rect.height) * 100,
    });
  }, []);

  const onLeave = useCallback(() => {
    setHovered(false);
    setTilt({ x: 0, y: 0 });
    setGlow({ x: 50, y: 50 });
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.55, delay: index * 0.055, ease: [0.16, 1, 0.3, 1] }}
      onMouseEnter={() => setHovered(true)}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      data-cursor="hover"
      style={{
        /* Force every card to identical 16:9 size */
        position:       'relative',
        aspectRatio:    '16 / 9',
        overflow:       'hidden',
        border:         `1px solid ${hovered ? 'rgba(0,255,65,0.35)' : '#1a1a1a'}`,
        transform:      `perspective(900px) rotateY(${tilt.x}deg) rotateX(${tilt.y}deg) scale(${hovered ? 1.025 : 1})`,
        transition:     hovered
          ? 'border-color 0.3s ease, box-shadow 0.3s ease'
          : 'transform 0.55s cubic-bezier(0.03,0.98,0.52,0.99), border-color 0.4s ease, box-shadow 0.4s ease',
        boxShadow:      hovered
          ? '0 16px 56px rgba(0,0,0,0.7), 0 0 30px rgba(0,255,65,0.10)'
          : '0 4px 16px rgba(0,0,0,0.4)',
        willChange:     'transform',
        transformStyle: 'preserve-3d',
      }}
    >
      {/* Photo — hidden by default, revealed on hover */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={item.photo}
        alt={item.label}
        style={{
          position:       'absolute',
          inset:          0,
          width:          '100%',
          height:         '100%',
          objectFit:      'cover',
          objectPosition: 'center',
          opacity:        hovered ? 1 : 0,
          transform:      hovered ? 'scale(1.05)' : 'scale(1.10)',
          transition:     'opacity 0.55s ease, transform 0.7s cubic-bezier(0.16,1,0.3,1)',
          pointerEvents:  'none',
        }}
      />

      {/* Gradient color layer — shown by default, fades on hover */}
      <div
        style={{
          position:      'absolute',
          inset:         0,
          background:    item.gradient,
          opacity:       hovered ? 0 : 1,
          transition:    'opacity 0.45s ease',
          pointerEvents: 'none',
        }}
      />

      {/* Green spotlight glow (follows mouse) */}
      <div
        style={{
          position:      'absolute',
          inset:         0,
          background:    `radial-gradient(circle at ${glow.x}% ${glow.y}%, rgba(0,255,65,0.10) 0%, transparent 62%)`,
          opacity:       hovered ? 1 : 0,
          transition:    'opacity 0.3s ease',
          pointerEvents: 'none',
          zIndex:        2,
        }}
      />

      {/* Noise texture */}
      <div
        style={{
          position:           'absolute',
          inset:              0,
          backgroundImage:    "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 128 128' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          opacity:            hovered ? 0 : 0.06,
          transition:         'opacity 0.45s ease',
          pointerEvents:      'none',
          zIndex:             3,
        }}
      />

      {/* Bottom gradient for label legibility */}
      <div
        style={{
          position:      'absolute',
          bottom:        0, left: 0, right: 0,
          height:        '65%',
          background:    'linear-gradient(to top, rgba(8,8,8,0.92) 0%, rgba(8,8,8,0.4) 50%, transparent 100%)',
          pointerEvents: 'none',
          zIndex:        4,
        }}
      />

      {/* Labels */}
      <div
        style={{
          position:   'absolute',
          bottom:     '1rem',
          left:       '1rem',
          right:      '1rem',
          zIndex:     5,
          transform:  hovered ? 'translateY(0)' : 'translateY(4px)',
          transition: 'transform 0.4s cubic-bezier(0.16,1,0.3,1)',
        }}
      >
        <p
          style={{
            fontFamily:    "'JetBrains Mono', monospace",
            fontSize:      '0.5rem',
            letterSpacing: '0.25em',
            color:         hovered ? '#00ff41' : '#666',
            textTransform: 'uppercase',
            marginBottom:  '0.2rem',
            transition:    'color 0.4s ease',
          }}
        >
          {item.sublabel}
        </p>
        <p
          style={{
            fontFamily:    "'Space Grotesk', sans-serif",
            fontSize:      'clamp(0.8rem, 1.6vw, 1rem)',
            fontWeight:    700,
            letterSpacing: '0.05em',
            color:         '#f0f0f0',
            textTransform: 'uppercase',
          }}
        >
          {item.label}
        </p>
      </div>

      {/* Index top-right */}
      <div
        style={{
          position:      'absolute',
          top:           '0.75rem',
          right:         '0.75rem',
          fontFamily:    "'JetBrains Mono', monospace",
          fontSize:      '0.5rem',
          color:         'rgba(255,255,255,0.2)',
          letterSpacing: '0.1em',
          zIndex:        5,
        }}
      >
        {String(item.id).padStart(2, '0')} / {String(GALLERY_ITEMS.length).padStart(2, '0')}
      </div>

      {/* Green border glow inset */}
      <div
        style={{
          position:      'absolute',
          inset:         0,
          border:        `1px solid rgba(0,255,65,${hovered ? 0.28 : 0})`,
          transition:    'border-color 0.4s ease',
          pointerEvents: 'none',
          zIndex:        6,
        }}
      />
    </motion.div>
  );
}

export default function GallerySection() {
  return (
    <section
      style={{
        padding:      'clamp(4rem, 10vw, 8rem) clamp(1.5rem, 6vw, 5rem)',
        borderBottom: '1px solid #1a1a1a',
        overflow:     'hidden',
        background:   '#080808',
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: 'clamp(2rem, 4vw, 3rem)' }}>
        <motion.p
          initial={{ opacity: 0, x: -16 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
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
          02 — THE WORLD
        </motion.p>

        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
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
          THE WORLD
        </motion.h2>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.25 }}
          style={{
            marginTop:     '0.75rem',
            fontFamily:    "'JetBrains Mono', monospace",
            fontSize:      '0.65rem',
            color:         '#333',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
          }}
        >
          HOVER TO REVEAL · 11 LOCATIONS
        </motion.p>
      </div>

      {/* Grid — all cards at 16:9 (same size) */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.15 }}
        style={{
          display:             'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(min(340px, 100%), 1fr))',
          gap:                 'clamp(0.5rem, 1.2vw, 1rem)',
        }}
      >
        {GALLERY_ITEMS.map((item, i) => (
          <GalleryCard key={item.id} item={item} index={i} />
        ))}
      </motion.div>

      {/* Bottom label */}
      <p
        style={{
          paddingTop:    '1.5rem',
          fontFamily:    "'JetBrains Mono', monospace",
          fontSize:      '0.55rem',
          color:         '#2a2a2a',
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
        }}
      >
        SCREENSHOTS FROM JOD — play.jodcraft.world
      </p>
    </section>
  );
}

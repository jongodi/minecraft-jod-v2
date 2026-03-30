'use client';

import { motion } from 'framer-motion';
import { useRef, useState } from 'react';

interface GalleryItem {
  id: number;
  label: string;
  sublabel: string;
  gradient: string;
  photo: string;
}

const GALLERY_ITEMS: GalleryItem[] = [
  {
    id: 1,
    label: 'GOÐI CASTLE',
    sublabel: 'FAR AWAY LANDS',
    gradient: 'linear-gradient(160deg, #87ceeb 0%, #6ba8d4 20%, #4a7a5a 45%, #3a5a3a 65%, #555a55 85%, #404040 100%)',
    photo: '/screenshots/the-castle.png',
  },
  {
    id: 2,
    label: 'JOÐ VILLE',
    sublabel: 'OLD BASE',
    gradient: 'linear-gradient(160deg, #87ceeb 0%, #6ba8d4 20%, #c8a0b8 45%, #5a9a6a 65%, #7a7a6a 85%, #555045 100%)',
    photo: '/screenshots/spawn-hill.png',
  },
  {
    id: 3,
    label: 'PINK ESTATE',
    sublabel: 'OLD BASE',
    gradient: 'linear-gradient(160deg, #87ceeb 0%, #c8a0b8 20%, #d4789a 45%, #c06888 65%, #a85878 85%, #903060 100%)',
    photo: '/screenshots/cherry-estate.png',
  },
  {
    id: 4,
    label: 'J CLUB',
    sublabel: 'SECRET UNDERGROUND CLUB',
    gradient: 'linear-gradient(160deg, #050308 0%, #120820 25%, #1e0a30 50%, #2d1048 70%, #1a0828 100%)',
    photo: '/screenshots/j-club.png',
  },
  {
    id: 5,
    label: 'MUSHROOM ISLAND',
    sublabel: 'SHROOMY HEAVEN',
    gradient: 'linear-gradient(160deg, #87ceeb 0%, #6ba8d4 20%, #cc2222 45%, #aa1818 65%, #1a3860 80%, #081828 100%)',
    photo: '/screenshots/mushroom-isle.png',
  },
  {
    id: 6,
    label: 'POTIONS TOWER',
    sublabel: 'NEW BASE',
    gradient: 'linear-gradient(160deg, #1e1810 0%, #302820 25%, #483828 50%, #605040 70%, #786858 100%)',
    photo: '/screenshots/the-hall.png',
  },
  {
    id: 7,
    label: 'VENICE',
    sublabel: 'NEW BASE',
    gradient: 'linear-gradient(160deg, #87ceeb 0%, #c87840 25%, #a86030 45%, #284e78 65%, #183060 85%, #0a1828 100%)',
    photo: '/screenshots/waterfront.png',
  },
  {
    id: 8,
    label: 'CITY HALL',
    sublabel: 'NEW BASE',
    gradient: 'linear-gradient(160deg, #87ceeb 0%, #6ba8d4 20%, #7a5a30 45%, #504020 65%, #3a3018 85%, #252010 100%)',
    photo: '/screenshots/the-tavern.png',
  },
  {
    id: 9,
    label: 'THE VILLAGE',
    sublabel: 'NEW BASE',
    gradient: 'linear-gradient(160deg, #87ceeb 0%, #6ba8d4 20%, #6a8a40 40%, #4a6a28 60%, #7a5a30 80%, #503818 100%)',
    photo: '/screenshots/the-village.png',
  },
  {
    id: 10,
    label: 'BALLOON PARADISE',
    sublabel: 'NEW BASE',
    gradient: 'linear-gradient(160deg, #87ceeb 0%, #a8d4f0 20%, #6bc8f0 40%, #4a9a6a 65%, #387850 85%, #204830 100%)',
    photo: '/screenshots/balloon-island.png',
  },
  {
    id: 11,
    label: 'NEW TOWN',
    sublabel: 'NEW BASE',
    gradient: 'linear-gradient(160deg, #020408 0%, #080d18 20%, #0d1525 40%, #1a2a40 60%, #102030 80%, #050a12 100%)',
    photo: '/screenshots/night-sky.png',
  },
];

export default function GallerySection() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hoveredId, setHoveredId] = useState<number | null>(null);

  return (
    <section
      style={{
        padding: 'clamp(4rem, 10vw, 8rem) 0',
        borderBottom: '1px solid #1a1a1a',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div style={{ paddingLeft: 'clamp(1.5rem, 6vw, 5rem)', marginBottom: '2.5rem' }}>
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
          02 — THE WORLD
        </motion.p>

        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', paddingRight: 'clamp(1.5rem, 6vw, 5rem)' }}>
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
            }}
          >
            THE WORLD
          </motion.h2>

          {/* Live counter */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 'clamp(1.8rem, 4vw, 3rem)',
              fontWeight: 700,
              color: hoveredId ? '#00ff41' : '#141414',
              letterSpacing: '-0.02em',
              lineHeight: 1,
              transition: 'color 0.3s ease',
              paddingBottom: '0.15rem',
            }}
          >
            {hoveredId
              ? String(hoveredId).padStart(2, '0')
              : String(GALLERY_ITEMS.length).padStart(2, '0')}
            <span style={{ fontSize: '40%', color: '#1e1e1e', letterSpacing: '0.1em', marginLeft: '0.3em' }}>
              / {String(GALLERY_ITEMS.length).padStart(2, '0')}
            </span>
          </motion.div>
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.25 }}
          style={{
            marginTop: '0.75rem',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '0.6rem',
            color: '#222',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
          }}
        >
          DRAG TO EXPLORE
        </motion.p>
      </div>

      {/* Horizontal scroll strip */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.2 }}
        ref={scrollRef}
        className="gallery-scroll"
        style={{
          display: 'flex',
          gap: '1px',
          overflowX: 'auto',
          paddingLeft: 'clamp(1.5rem, 6vw, 5rem)',
          paddingRight: 'clamp(1.5rem, 6vw, 5rem)',
          paddingBottom: '1px',
          scrollSnapType: 'x mandatory',
          WebkitOverflowScrolling: 'touch',
          cursor: 'grab',
        }}
        onMouseDown={(e) => {
          const el = scrollRef.current;
          if (!el) return;
          el.style.cursor = 'grabbing';
          const startX = e.pageX - el.offsetLeft;
          const scrollLeft = el.scrollLeft;
          const onMove = (me: MouseEvent) => {
            const x = me.pageX - el.offsetLeft;
            el.scrollLeft = scrollLeft - (x - startX);
          };
          const onUp = () => {
            el.style.cursor = 'grab';
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
          };
          window.addEventListener('mousemove', onMove);
          window.addEventListener('mouseup', onUp);
        }}
      >
        {GALLERY_ITEMS.map((item, i) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, scale: 0.96 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.04 }}
            onMouseEnter={() => setHoveredId(item.id)}
            onMouseLeave={() => setHoveredId(null)}
            style={{
              flexShrink: 0,
              width: i === 0 ? 'clamp(380px, 48vw, 680px)' : 'clamp(280px, 30vw, 420px)',
              height: i === 0 ? 'clamp(240px, 28vw, 380px)' : 'clamp(190px, 21vw, 280px)',
              position: 'relative',
              scrollSnapAlign: 'start',
              overflow: 'hidden',
              border: '1px solid #1a1a1a',
            }}
          >
            {/* Photo layer — revealed on hover */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.photo}
              alt={item.label}
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                objectPosition: 'center',
                opacity: hoveredId === item.id ? 1 : 0,
                transform: hoveredId === item.id ? 'scale(1)' : 'scale(1.06)',
                transition: 'opacity 0.55s ease, transform 0.65s ease',
                pointerEvents: 'none',
              }}
            />

            {/* Gradient color layer — shown by default, fades on hover */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: item.gradient,
                opacity: hoveredId === item.id ? 0 : 1,
                transition: 'opacity 0.45s ease',
                pointerEvents: 'none',
              }}
            />

            {/* Noise texture overlay */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 128 128' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
                opacity: hoveredId === item.id ? 0 : 0.06,
                transition: 'opacity 0.45s ease',
                pointerEvents: 'none',
              }}
            />

            {/* Bottom gradient fade — always present for label readability */}
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: '65%',
                background: 'linear-gradient(to top, rgba(8,8,8,0.9) 0%, rgba(8,8,8,0.4) 50%, transparent 100%)',
                pointerEvents: 'none',
                zIndex: 2,
              }}
            />

            {/* Labels */}
            <div
              style={{
                position: 'absolute',
                bottom: '1rem',
                left: '1rem',
                right: '1rem',
                zIndex: 3,
              }}
            >
              <p
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '0.5rem',
                  letterSpacing: '0.25em',
                  color: hoveredId === item.id ? '#00ff41' : '#666',
                  textTransform: 'uppercase',
                  marginBottom: '0.2rem',
                  transition: 'color 0.4s ease',
                }}
              >
                {item.sublabel}
              </p>
              <p
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: i === 0 ? '1.2rem' : '0.9rem',
                  fontWeight: 700,
                  letterSpacing: '0.05em',
                  color: '#f0f0f0',
                  textTransform: 'uppercase',
                }}
              >
                {item.label}
              </p>
            </div>

            {/* Index number top-right */}
            <div
              style={{
                position: 'absolute',
                top: '0.75rem',
                right: '0.75rem',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '0.5rem',
                color: 'rgba(255,255,255,0.2)',
                letterSpacing: '0.1em',
                zIndex: 3,
              }}
            >
              {String(item.id).padStart(2, '0')} / {String(GALLERY_ITEMS.length).padStart(2, '0')}
            </div>

            {/* Hover border glow */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                border: `1px solid ${hoveredId === item.id ? 'rgba(0,255,65,0.3)' : 'transparent'}`,
                transition: 'border-color 0.4s ease',
                pointerEvents: 'none',
                zIndex: 4,
              }}
            />
          </motion.div>
        ))}
      </motion.div>

      {/* Bottom label */}
      <p
        style={{
          paddingLeft: 'clamp(1.5rem, 6vw, 5rem)',
          marginTop: '1.5rem',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '0.55rem',
          color: '#2a2a2a',
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
        }}
      >
        SCREENSHOTS FROM JOD — play.jodcraft.world
      </p>
    </section>
  );
}

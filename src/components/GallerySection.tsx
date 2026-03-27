'use client';

import { motion, useRef } from 'framer-motion';
import { useRef as useReactRef } from 'react';

interface GalleryItem {
  id: number;
  label: string;
  sublabel: string;
  gradient: string;
}

const GALLERY_ITEMS: GalleryItem[] = [
  {
    id: 1,
    label: 'THE OVERWORLD',
    sublabel: 'SURFACE',
    gradient: 'linear-gradient(160deg, #1a3a1a 0%, #2d5a1b 25%, #4a7c3a 45%, #7a7a7a 75%, #555 100%)',
  },
  {
    id: 2,
    label: 'DEEP DARK',
    sublabel: 'Y -52',
    gradient: 'linear-gradient(160deg, #050508 0%, #0a0a12 30%, #0d0d1a 55%, #1a0d2e 80%, #0a0510 100%)',
  },
  {
    id: 3,
    label: 'THE NETHER',
    sublabel: 'HELL DIMENSION',
    gradient: 'linear-gradient(160deg, #1a0000 0%, #3d0800 25%, #7a1500 50%, #cc3300 70%, #ff6600 85%, #1a0a00 100%)',
  },
  {
    id: 4,
    label: 'BASE CAMP',
    sublabel: 'HOME',
    gradient: 'linear-gradient(160deg, #1a1208 0%, #2a1e0a 30%, #3d2d12 55%, #555040 75%, #777070 100%)',
  },
  {
    id: 5,
    label: 'THE END',
    sublabel: 'FINAL FRONTIER',
    gradient: 'linear-gradient(160deg, #030308 0%, #0d0520 35%, #1a0a3a 55%, #2a1050 70%, #0a0014 85%, #ffffee08 100%)',
  },
  {
    id: 6,
    label: 'MOUNTAIN PEAK',
    sublabel: 'Y 220',
    gradient: 'linear-gradient(170deg, #c8d8e8 0%, #d0d8e0 30%, #b0b8c0 55%, #888 75%, #666 100%)',
  },
  {
    id: 7,
    label: 'OCEAN FLOOR',
    sublabel: 'Y -30',
    gradient: 'linear-gradient(160deg, #001428 0%, #002040 25%, #003055 45%, #004466 60%, #002035 80%, #000810 100%)',
  },
  {
    id: 8,
    label: 'SPAWN POINT',
    sublabel: 'X 0 Z 0',
    gradient: 'linear-gradient(160deg, #1a3010 0%, #254018 25%, #3a5520 45%, #5a4530 65%, #7a7060 80%, #5a5a5a 100%)',
  },
];

export default function GallerySection() {
  const scrollRef = useReactRef<HTMLDivElement>(null);

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
          03 — GALLERY
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
            marginTop: '0.75rem',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '0.65rem',
            color: '#333',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
          }}
        >
          ← DRAG TO EXPLORE →
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
            whileHover={{ scale: 1.02 }}
            style={{
              flexShrink: 0,
              width: 'clamp(260px, 28vw, 380px)',
              height: 'clamp(180px, 20vw, 260px)',
              background: item.gradient,
              position: 'relative',
              scrollSnapAlign: 'start',
              overflow: 'hidden',
              border: '1px solid #1a1a1a',
            }}
          >
            {/* Noise overlay for texture */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 128 128' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
                opacity: 0.06,
                pointerEvents: 'none',
              }}
            />

            {/* Bottom gradient fade */}
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: '60%',
                background: 'linear-gradient(to top, rgba(8,8,8,0.85) 0%, transparent 100%)',
                pointerEvents: 'none',
              }}
            />

            {/* Labels */}
            <div
              style={{
                position: 'absolute',
                bottom: '1rem',
                left: '1rem',
                right: '1rem',
              }}
            >
              <p
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '0.5rem',
                  letterSpacing: '0.25em',
                  color: '#666',
                  textTransform: 'uppercase',
                  marginBottom: '0.2rem',
                }}
              >
                {item.sublabel}
              </p>
              <p
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: '0.9rem',
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
              }}
            >
              {String(item.id).padStart(2, '0')} / {String(GALLERY_ITEMS.length).padStart(2, '0')}
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Note about screenshots */}
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
        {/* Replace gradients above with actual server screenshots */}
        SCREENSHOTS FROM JOD — play.jod.cool
      </p>
    </section>
  );
}

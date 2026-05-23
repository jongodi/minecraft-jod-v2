'use client';

import { motion } from 'framer-motion';
import { useCallback, useState, useEffect } from 'react';
import type { GalleryPhoto } from '@/lib/gallery';
import Lightbox from '@/components/Lightbox';

// ─── Static fallback ──────────────────────────────────────────────────────────
const STATIC_FALLBACK: GalleryPhoto[] = [
  { id:'1',  filename:'/screenshots/the-castle.png',    title:'GOÐI CASTLE',      sublabel:'FAR AWAY LANDS',          gradient:'linear-gradient(160deg,#87ceeb 0%,#6ba8d4 20%,#4a7a5a 45%,#3a5a3a 65%,#555a55 85%,#404040 100%)',    active:true, order:1  },
  { id:'2',  filename:'/screenshots/spawn-hill.png',    title:'JOÐ VILLE',        sublabel:'OLD BASE',                gradient:'linear-gradient(160deg,#87ceeb 0%,#6ba8d4 20%,#c8a0b8 45%,#5a9a6a 65%,#7a7a6a 85%,#555045 100%)',    active:true, order:2  },
  { id:'3',  filename:'/screenshots/cherry-estate.png', title:'PINK ESTATE',      sublabel:'OLD BASE',                gradient:'linear-gradient(160deg,#87ceeb 0%,#c8a0b8 20%,#d4789a 45%,#c06888 65%,#a85878 85%,#903060 100%)',     active:true, order:3  },
  { id:'4',  filename:'/screenshots/j-club.png',        title:'J CLUB',           sublabel:'SECRET UNDERGROUND CLUB', gradient:'linear-gradient(160deg,#050308 0%,#120820 25%,#1e0a30 50%,#2d1048 70%,#1a0828 100%)',                   active:true, order:4  },
  { id:'5',  filename:'/screenshots/mushroom-isle.png', title:'MUSHROOM ISLAND',  sublabel:'SHROOMY HEAVEN',          gradient:'linear-gradient(160deg,#87ceeb 0%,#6ba8d4 20%,#cc2222 45%,#aa1818 65%,#1a3860 80%,#081828 100%)',      active:true, order:5  },
  { id:'6',  filename:'/screenshots/the-hall.png',      title:'POTIONS TOWER',    sublabel:'NEW BASE',                gradient:'linear-gradient(160deg,#1e1810 0%,#302820 25%,#483828 50%,#605040 70%,#786858 100%)',                   active:true, order:6  },
  { id:'7',  filename:'/screenshots/waterfront.png',    title:'VENICE',           sublabel:'NEW BASE',                gradient:'linear-gradient(160deg,#87ceeb 0%,#c87840 25%,#a86030 45%,#284e78 65%,#183060 85%,#0a1828 100%)',      active:true, order:7  },
  { id:'8',  filename:'/screenshots/the-tavern.png',    title:'CITY HALL',        sublabel:'NEW BASE',                gradient:'linear-gradient(160deg,#87ceeb 0%,#6ba8d4 20%,#7a5a30 45%,#504020 65%,#3a3018 85%,#252010 100%)',      active:true, order:8  },
  { id:'9',  filename:'/screenshots/the-village.png',   title:'THE VILLAGE',      sublabel:'NEW BASE',                gradient:'linear-gradient(160deg,#87ceeb 0%,#6ba8d4 20%,#6a8a40 40%,#4a6a28 60%,#7a5a30 80%,#503818 100%)',      active:true, order:9  },
  { id:'10', filename:'/screenshots/balloon-island.png',title:'BALLOON PARADISE', sublabel:'NEW BASE',                gradient:'linear-gradient(160deg,#87ceeb 0%,#a8d4f0 20%,#6bc8f0 40%,#4a9a6a 65%,#387850 85%,#204830 100%)',      active:true, order:10 },
  { id:'11', filename:'/screenshots/night-sky.png',     title:'NEW TOWN',         sublabel:'NEW BASE',                gradient:'linear-gradient(160deg,#020408 0%,#080d18 20%,#0d1525 40%,#1a2a40 60%,#102030 80%,#050a12 100%)',       active:true, order:11 },
];

// Editorial column spans across a 12-column grid (10 photos after featured)
// Pattern: 7/5, 4/4/4, 5/7, 4/4/4
const SPANS = [7, 5, 4, 4, 4, 5, 7, 4, 4, 4];

// ─── Featured (first) card ────────────────────────────────────────────────────
function FeaturedCard({
  item,
  totalCount,
  onClick,
}: {
  item:       GalleryPhoto;
  totalCount: number;
  onClick:    () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
      data-cursor="hover"
      style={{
        position:   'relative',
        overflow:   'hidden',
        height:     'clamp(40vh, 50vw, 62vh)',
        border:     `1px solid ${hovered ? 'rgba(0,255,65,0.35)' : '#1c2030'}`,
        transition: 'border-color 0.4s ease, box-shadow 0.4s ease',
        boxShadow:  hovered ? '0 24px 80px rgba(0,0,0,0.7), 0 0 50px rgba(0,255,65,0.08)' : '0 4px 28px rgba(0,0,0,0.55)',
        cursor:     'pointer',
      }}
    >
      {/* Photo — always visible */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={item.filename}
        alt={item.title}
        style={{
          position:       'absolute',
          inset:          0,
          width:          '100%',
          height:         '100%',
          objectFit:      'cover',
          objectPosition: 'center',
          transform:      hovered ? 'scale(1.05)' : 'scale(1.0)',
          transition:     'transform 0.9s cubic-bezier(0.16,1,0.3,1)',
          pointerEvents:  'none',
        }}
      />

      {/* Permanent bottom scrim */}
      <div style={{
        position:      'absolute',
        bottom: 0, left: 0, right: 0,
        height:        '75%',
        background:    'linear-gradient(to top, rgba(6,8,12,0.97) 0%, rgba(6,8,12,0.55) 45%, transparent 100%)',
        pointerEvents: 'none',
        zIndex:        2,
      }} />

      {/* FEATURED badge — top left */}
      <div style={{
        position:      'absolute',
        top:           '1.25rem',
        left:          '1.25rem',
        fontFamily:    "'JetBrains Mono', monospace",
        fontSize:      '0.46rem',
        letterSpacing: '0.3em',
        color:         '#00ff41',
        textTransform: 'uppercase',
        zIndex:        3,
      }}>
        FEATURED
      </div>

      {/* Counter — top right */}
      <div style={{
        position:      'absolute',
        top:           '1.25rem',
        right:         '1.25rem',
        fontFamily:    "'JetBrains Mono', monospace",
        fontSize:      '0.46rem',
        color:         'rgba(255,255,255,0.2)',
        letterSpacing: '0.1em',
        zIndex:        3,
      }}>
        01 / {String(totalCount).padStart(2, '0')}
      </div>

      {/* Title — large editorial */}
      <div style={{
        position:   'absolute',
        bottom:     '1.75rem',
        left:       '1.5rem',
        right:      '1.5rem',
        zIndex:     3,
        transform:  hovered ? 'translateY(-5px)' : 'none',
        transition: 'transform 0.45s cubic-bezier(0.16,1,0.3,1)',
      }}>
        {item.sublabel && (
          <p style={{
            fontFamily:    "'JetBrains Mono', monospace",
            fontSize:      '0.56rem',
            letterSpacing: '0.3em',
            color:         '#00ff41',
            textTransform: 'uppercase',
            marginBottom:  '0.6rem',
          }}>
            {item.sublabel}
          </p>
        )}
        <p style={{
          fontFamily:    "'Space Grotesk', sans-serif",
          fontSize:      'clamp(2rem, 5vw, 4.5rem)',
          fontWeight:    900,
          letterSpacing: '-0.03em',
          color:         '#ffffff',
          textTransform: 'uppercase',
          lineHeight:    0.9,
          textShadow:    '0 2px 24px rgba(0,0,0,0.6)',
        }}>
          {item.title}
        </p>
      </div>

      {/* Hover CTA — bottom right */}
      <div style={{
        position:   'absolute',
        bottom:     '1.75rem',
        right:      '1.5rem',
        zIndex:     3,
        opacity:    hovered ? 1 : 0,
        transform:  hovered ? 'translateY(0)' : 'translateY(5px)',
        transition: 'opacity 0.3s ease, transform 0.35s ease',
      }}>
        <span style={{
          fontFamily:    "'JetBrains Mono', monospace",
          fontSize:      '0.5rem',
          letterSpacing: '0.22em',
          color:         'rgba(0,255,65,0.7)',
          textTransform: 'uppercase',
        }}>
          EXPAND ↗
        </span>
      </div>

      {/* Inset accent border on hover */}
      <div style={{
        position:      'absolute',
        inset:         0,
        border:        `1px solid rgba(0,255,65,${hovered ? 0.2 : 0})`,
        transition:    'border-color 0.4s ease',
        pointerEvents: 'none',
        zIndex:        4,
      }} />
    </motion.div>
  );
}

// ─── Regular card ─────────────────────────────────────────────────────────────
function GalleryCard({
  item,
  index,
  totalCount,
  onClick,
}: {
  item:       GalleryPhoto;
  index:      number;
  totalCount: number;
  onClick:    () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-20px' }}
      transition={{ duration: 0.55, delay: Math.min(index * 0.04, 0.25), ease: [0.16, 1, 0.3, 1] }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
      data-cursor="hover"
      style={{
        position:    'relative',
        aspectRatio: '16 / 9',
        overflow:    'hidden',
        border:      `1px solid ${hovered ? 'rgba(0,255,65,0.32)' : '#1c2030'}`,
        transform:   hovered ? 'translateY(-3px)' : 'none',
        transition:  'border-color 0.3s ease, transform 0.35s ease, box-shadow 0.35s ease',
        boxShadow:   hovered ? '0 14px 44px rgba(0,0,0,0.65), 0 0 28px rgba(0,255,65,0.07)' : '0 2px 14px rgba(0,0,0,0.38)',
        cursor:      'pointer',
      }}
    >
      {/* Photo — always visible */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={item.filename}
        alt={item.title}
        style={{
          position:       'absolute',
          inset:          0,
          width:          '100%',
          height:         '100%',
          objectFit:      'cover',
          objectPosition: 'center',
          transform:      hovered ? 'scale(1.06)' : 'scale(1.0)',
          transition:     'transform 0.75s cubic-bezier(0.16,1,0.3,1)',
          pointerEvents:  'none',
        }}
      />

      {/* Permanent bottom scrim */}
      <div style={{
        position:      'absolute',
        bottom: 0, left: 0, right: 0,
        height:        '68%',
        background:    'linear-gradient(to top, rgba(6,8,12,0.92) 0%, rgba(6,8,12,0.35) 55%, transparent 100%)',
        pointerEvents: 'none',
        zIndex:        2,
      }} />

      {/* Index */}
      <div style={{
        position:      'absolute',
        top:           '0.6rem',
        right:         '0.6rem',
        fontFamily:    "'JetBrains Mono', monospace",
        fontSize:      '0.42rem',
        color:         'rgba(255,255,255,0.2)',
        letterSpacing: '0.08em',
        zIndex:        3,
      }}>
        {String(index + 1).padStart(2, '0')} / {String(totalCount).padStart(2, '0')}
      </div>

      {/* Labels */}
      <div style={{
        position:   'absolute',
        bottom:     '0.65rem',
        left:       '0.65rem',
        right:      '0.65rem',
        zIndex:     3,
        transform:  hovered ? 'translateY(-2px)' : 'none',
        transition: 'transform 0.35s cubic-bezier(0.16,1,0.3,1)',
      }}>
        {item.sublabel && (
          <p style={{
            fontFamily:    "'JetBrains Mono', monospace",
            fontSize:      '0.42rem',
            letterSpacing: '0.24em',
            color:         hovered ? '#00ff41' : 'rgba(0,255,65,0.55)',
            textTransform: 'uppercase',
            marginBottom:  '0.15rem',
            transition:    'color 0.3s ease',
          }}>
            {item.sublabel}
          </p>
        )}
        <p style={{
          fontFamily:    "'Space Grotesk', sans-serif",
          fontSize:      'clamp(0.7rem, 1.3vw, 0.9rem)',
          fontWeight:    700,
          letterSpacing: '-0.01em',
          color:         '#dde1ec',
          textTransform: 'uppercase',
          lineHeight:    1,
        }}>
          {item.title}
        </p>
      </div>

      {/* Inset accent border on hover */}
      <div style={{
        position:      'absolute',
        inset:         0,
        border:        `1px solid rgba(0,255,65,${hovered ? 0.18 : 0})`,
        transition:    'border-color 0.35s ease',
        pointerEvents: 'none',
        zIndex:        4,
      }} />
    </motion.div>
  );
}

// ─── Section ──────────────────────────────────────────────────────────────────
export default function GallerySection() {
  const [photos,      setPhotos]      = useState<GalleryPhoto[]>(STATIC_FALLBACK);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/gallery')
      .then(r => r.ok ? r.json() : null)
      .then((data: GalleryPhoto[] | null) => { if (data?.length) setPhotos(data); })
      .catch(() => {});
  }, []);

  const openLightbox  = useCallback((i: number) => setLightboxIdx(i), []);
  const closeLightbox = useCallback(() => setLightboxIdx(null), []);
  const prevPhoto     = useCallback(() => setLightboxIdx(i => i !== null ? (i - 1 + photos.length) % photos.length : null), [photos.length]);
  const nextPhoto     = useCallback(() => setLightboxIdx(i => i !== null ? (i + 1) % photos.length : null), [photos.length]);

  const [featured, ...rest] = photos;

  return (
    <>
      {lightboxIdx !== null && (
        <Lightbox
          photos={photos.map(p => ({ src: p.filename, title: p.title, subtitle: p.sublabel }))}
          currentIndex={lightboxIdx}
          onClose={closeLightbox}
          onPrev={prevPhoto}
          onNext={nextPhoto}
        />
      )}

      <section
        id="gallery"
        style={{
          padding:      'clamp(5rem, 12vw, 9rem) clamp(1.5rem, 6vw, 5rem)',
          borderBottom: '1px solid #1c2030',
          overflow:     'hidden',
          background:   '#06080c',
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: 'clamp(2.5rem, 5vw, 4rem)' }}>
          <motion.p
            initial={{ opacity: 0, x: -14 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="section-label"
          >
            02 — THE WORLD
          </motion.p>

          <motion.h2
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.65, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
            style={{
              fontFamily:    "'Space Grotesk', sans-serif",
              fontSize:      'clamp(3rem, 7vw, 6rem)',
              fontWeight:    900,
              letterSpacing: '-0.03em',
              color:         '#dde1ec',
              lineHeight:    0.95,
              marginBottom:  '1rem',
            }}
          >
            THE WORLD
          </motion.h2>

          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.22 }}
            style={{
              fontFamily:    "'JetBrains Mono', monospace",
              fontSize:      '0.58rem',
              color:         '#1e2230',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
            }}
          >
            {photos.length} LOCATIONS · CLICK TO EXPAND
          </motion.p>
        </div>

        {/* Featured photo */}
        {featured && (
          <div style={{ marginBottom: '0.5rem' }}>
            <FeaturedCard
              item={featured}
              totalCount={photos.length}
              onClick={() => openLightbox(0)}
            />
          </div>
        )}

        {/* Editorial grid — 12-column layout */}
        <div className="gallery-editorial">
          {rest.map((item, i) => (
            <div key={item.id} className={`ge-span-${SPANS[i] ?? 4}`}>
              <GalleryCard
                item={item}
                index={i + 1}
                totalCount={photos.length}
                onClick={() => openLightbox(i + 1)}
              />
            </div>
          ))}
        </div>

        <p style={{
          paddingTop:    '1.25rem',
          fontFamily:    "'JetBrains Mono', monospace",
          fontSize:      '0.46rem',
          color:         '#131722',
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
        }}>
          SCREENSHOTS FROM JOD — play.jodcraft.world
        </p>
      </section>

      <style>{`
        .gallery-editorial {
          display: grid;
          grid-template-columns: repeat(12, 1fr);
          gap: 0.5rem;
        }
        .ge-span-7 { grid-column: span 7; }
        .ge-span-5 { grid-column: span 5; }
        .ge-span-4 { grid-column: span 4; }
        @media (max-width: 899px) {
          .gallery-editorial {
            grid-template-columns: repeat(2, 1fr);
          }
          .ge-span-7, .ge-span-5, .ge-span-4 { grid-column: span 1; }
        }
        @media (max-width: 599px) {
          .gallery-editorial {
            grid-template-columns: 1fr;
          }
          .ge-span-7, .ge-span-5, .ge-span-4 { grid-column: span 1; }
        }
      `}</style>
    </>
  );
}

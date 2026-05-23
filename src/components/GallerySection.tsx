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
  const [glow,    setGlow]    = useState({ x: 50, y: 50 });

  const onMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setGlow({
      x: ((e.clientX - rect.left) / rect.width)  * 100,
      y: ((e.clientY - rect.top)  / rect.height) * 100,
    });
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
      onMouseEnter={() => setHovered(true)}
      onMouseMove={onMove}
      onMouseLeave={() => { setHovered(false); setGlow({ x: 50, y: 50 }); }}
      onClick={onClick}
      data-cursor="hover"
      className="gallery-featured"
      style={{
        position:    'relative',
        overflow:    'hidden',
        border:      `1px solid ${hovered ? 'rgba(0,255,65,0.3)' : '#1c2030'}`,
        transform:   hovered ? 'translateY(-2px)' : 'none',
        transition:  'border-color 0.35s ease, transform 0.4s ease, box-shadow 0.4s ease',
        boxShadow:   hovered ? '0 20px 60px rgba(0,0,0,0.7), 0 0 40px rgba(0,255,65,0.06)' : '0 4px 20px rgba(0,0,0,0.4)',
        cursor:      'pointer',
        aspectRatio: '16 / 9',
      }}
    >
      {/* Photo */}
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
          opacity:        hovered ? 1 : 0,
          transform:      hovered ? 'scale(1.04)' : 'scale(1.08)',
          transition:     'opacity 0.6s ease, transform 0.8s cubic-bezier(0.16,1,0.3,1)',
          pointerEvents:  'none',
        }}
      />

      {/* Color gradient placeholder */}
      <div style={{
        position:      'absolute',
        inset:         0,
        background:    item.gradient,
        opacity:       hovered ? 0 : 1,
        transition:    'opacity 0.5s ease',
        pointerEvents: 'none',
      }} />

      {/* Cursor glow */}
      <div style={{
        position:      'absolute',
        inset:         0,
        background:    `radial-gradient(circle at ${glow.x}% ${glow.y}%, rgba(0,255,65,0.09) 0%, transparent 55%)`,
        opacity:       hovered ? 1 : 0,
        transition:    'opacity 0.3s ease',
        pointerEvents: 'none',
        zIndex:        2,
      }} />

      {/* Bottom scrim */}
      <div style={{
        position:      'absolute',
        bottom: 0, left: 0, right: 0,
        height:        '70%',
        background:    'linear-gradient(to top, rgba(6,8,12,0.95) 0%, rgba(6,8,12,0.35) 55%, transparent 100%)',
        pointerEvents: 'none',
        zIndex:        3,
      }} />

      {/* "FEATURED" label */}
      <div style={{
        position:      'absolute',
        top:           '1rem',
        left:          '1rem',
        fontFamily:    "'JetBrains Mono', monospace",
        fontSize:      '0.48rem',
        letterSpacing: '0.28em',
        color:         'rgba(0,255,65,0.5)',
        textTransform: 'uppercase',
        zIndex:        4,
        transition:    'opacity 0.3s ease',
        opacity:       hovered ? 1 : 0,
      }}>
        CLICK TO EXPAND
      </div>

      {/* Counter */}
      <div style={{
        position:      'absolute',
        top:           '1rem',
        right:         '1rem',
        fontFamily:    "'JetBrains Mono', monospace",
        fontSize:      '0.48rem',
        color:         'rgba(255,255,255,0.18)',
        letterSpacing: '0.1em',
        zIndex:        4,
      }}>
        01 / {String(totalCount).padStart(2, '0')}
      </div>

      {/* Labels */}
      <div style={{
        position:   'absolute',
        bottom:     '1.25rem',
        left:       '1.25rem',
        right:      '1.25rem',
        zIndex:     4,
        transform:  hovered ? 'translateY(0)' : 'translateY(4px)',
        transition: 'transform 0.4s cubic-bezier(0.16,1,0.3,1)',
      }}>
        {item.sublabel && (
          <p style={{
            fontFamily:    "'JetBrains Mono', monospace",
            fontSize:      '0.52rem',
            letterSpacing: '0.28em',
            color:         hovered ? '#00ff41' : '#505770',
            textTransform: 'uppercase',
            marginBottom:  '0.3rem',
            transition:    'color 0.4s ease',
          }}>
            {item.sublabel}
          </p>
        )}
        <p style={{
          fontFamily:    "'Space Grotesk', sans-serif",
          fontSize:      'clamp(1.1rem, 2.5vw, 1.6rem)',
          fontWeight:    800,
          letterSpacing: '-0.01em',
          color:         '#dde1ec',
          textTransform: 'uppercase',
          lineHeight:    1,
        }}>
          {item.title}
        </p>
      </div>

      {/* Accent border inset */}
      <div style={{
        position:      'absolute',
        inset:         0,
        border:        `1px solid rgba(0,255,65,${hovered ? 0.22 : 0})`,
        transition:    'border-color 0.4s ease',
        pointerEvents: 'none',
        zIndex:        5,
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
  const [glow,    setGlow]    = useState({ x: 50, y: 50 });

  const onMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setGlow({
      x: ((e.clientX - rect.left) / rect.width)  * 100,
      y: ((e.clientY - rect.top)  / rect.height) * 100,
    });
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-30px' }}
      transition={{ duration: 0.55, delay: Math.min(index * 0.045, 0.3), ease: [0.16, 1, 0.3, 1] }}
      onMouseEnter={() => setHovered(true)}
      onMouseMove={onMove}
      onMouseLeave={() => { setHovered(false); setGlow({ x: 50, y: 50 }); }}
      onClick={onClick}
      data-cursor="hover"
      style={{
        position:    'relative',
        aspectRatio: '16 / 9',
        overflow:    'hidden',
        border:      `1px solid ${hovered ? 'rgba(0,255,65,0.28)' : '#1c2030'}`,
        transform:   hovered ? 'translateY(-2px)' : 'none',
        transition:  'border-color 0.3s ease, transform 0.35s ease, box-shadow 0.35s ease',
        boxShadow:   hovered ? '0 12px 40px rgba(0,0,0,0.6), 0 0 24px rgba(0,255,65,0.07)' : '0 2px 12px rgba(0,0,0,0.3)',
        cursor:      'pointer',
      }}
    >
      {/* Photo */}
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
          opacity:        hovered ? 1 : 0,
          transform:      hovered ? 'scale(1.05)' : 'scale(1.1)',
          transition:     'opacity 0.5s ease, transform 0.7s cubic-bezier(0.16,1,0.3,1)',
          pointerEvents:  'none',
        }}
      />

      <div style={{
        position:      'absolute',
        inset:         0,
        background:    item.gradient,
        opacity:       hovered ? 0 : 1,
        transition:    'opacity 0.45s ease',
        pointerEvents: 'none',
      }} />

      <div style={{
        position:      'absolute',
        inset:         0,
        background:    `radial-gradient(circle at ${glow.x}% ${glow.y}%, rgba(0,255,65,0.1) 0%, transparent 60%)`,
        opacity:       hovered ? 1 : 0,
        transition:    'opacity 0.25s ease',
        pointerEvents: 'none',
        zIndex:        2,
      }} />

      <div style={{
        position:      'absolute',
        bottom: 0, left: 0, right: 0,
        height:        '65%',
        background:    'linear-gradient(to top, rgba(6,8,12,0.92) 0%, rgba(6,8,12,0.3) 55%, transparent 100%)',
        pointerEvents: 'none',
        zIndex:        3,
      }} />

      {/* Index */}
      <div style={{
        position:      'absolute',
        top:           '0.65rem',
        right:         '0.65rem',
        fontFamily:    "'JetBrains Mono', monospace",
        fontSize:      '0.44rem',
        color:         'rgba(255,255,255,0.15)',
        letterSpacing: '0.08em',
        zIndex:        4,
      }}>
        {String(index + 1).padStart(2, '0')} / {String(totalCount).padStart(2, '0')}
      </div>

      {/* Hover hint */}
      <div style={{
        position:      'absolute',
        top:           '0.65rem',
        left:          '0.65rem',
        fontFamily:    "'JetBrains Mono', monospace",
        fontSize:      '0.42rem',
        color:         hovered ? 'rgba(0,255,65,0.5)' : 'transparent',
        letterSpacing: '0.2em',
        zIndex:        4,
        transition:    'color 0.25s ease',
      }}>
        EXPAND
      </div>

      {/* Labels */}
      <div style={{
        position:   'absolute',
        bottom:     '0.75rem',
        left:       '0.75rem',
        right:      '0.75rem',
        zIndex:     4,
        transform:  hovered ? 'translateY(0)' : 'translateY(3px)',
        transition: 'transform 0.4s cubic-bezier(0.16,1,0.3,1)',
      }}>
        {item.sublabel && (
          <p style={{
            fontFamily:    "'JetBrains Mono', monospace",
            fontSize:      '0.44rem',
            letterSpacing: '0.24em',
            color:         hovered ? '#00ff41' : '#505770',
            textTransform: 'uppercase',
            marginBottom:  '0.18rem',
            transition:    'color 0.3s ease',
          }}>
            {item.sublabel}
          </p>
        )}
        <p style={{
          fontFamily:    "'Space Grotesk', sans-serif",
          fontSize:      'clamp(0.72rem, 1.4vw, 0.9rem)',
          fontWeight:    700,
          letterSpacing: '0.03em',
          color:         '#dde1ec',
          textTransform: 'uppercase',
          lineHeight:    1,
        }}>
          {item.title}
        </p>
      </div>

      {/* Accent inset border */}
      <div style={{
        position:      'absolute',
        inset:         0,
        border:        `1px solid rgba(0,255,65,${hovered ? 0.2 : 0})`,
        transition:    'border-color 0.35s ease',
        pointerEvents: 'none',
        zIndex:        5,
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
            HOVER TO REVEAL · CLICK TO EXPAND · {photos.length} LOCATIONS
          </motion.p>
        </div>

        {/* Featured photo */}
        {featured && (
          <div style={{ marginBottom: '0.75rem' }}>
            <FeaturedCard
              item={featured}
              totalCount={photos.length}
              onClick={() => openLightbox(0)}
            />
          </div>
        )}

        {/* Grid — remaining photos */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.12 }}
        >
          <div className="gallery-grid">
            {rest.map((item, i) => (
              <GalleryCard
                key={item.id}
                item={item}
                index={i + 1}
                totalCount={photos.length}
                onClick={() => openLightbox(i + 1)}
              />
            ))}
          </div>
        </motion.div>

        {/* Footer attribution */}
        <p style={{
          paddingTop:    '1.25rem',
          fontFamily:    "'JetBrains Mono', monospace",
          fontSize:      '0.48rem',
          color:         '#131722',
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
        }}>
          SCREENSHOTS FROM JOD — play.jodcraft.world
        </p>
      </section>

      <style>{`
        .gallery-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(min(280px, 100%), 1fr));
          gap: 0.75rem;
        }
        @media (min-width: 900px) {
          .gallery-grid {
            grid-template-columns: repeat(4, 1fr);
            gap: 0.75rem;
          }
        }
        @media (min-width: 640px) and (max-width: 899px) {
          .gallery-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
      `}</style>
    </>
  );
}

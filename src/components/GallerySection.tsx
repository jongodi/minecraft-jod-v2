'use client';

import { motion } from 'framer-motion';
import { useCallback, useState, useEffect } from 'react';
import type { GalleryPhoto } from '@/lib/gallery';
import Lightbox from '@/components/Lightbox';

// ─── Static fallback ──────────────────────────────────────────────────────────
const STATIC_FALLBACK: GalleryPhoto[] = [
  { id:'1',  filename:'/screenshots/the-castle.png',    title:'GOÐI CASTLE',      sublabel:'FAR AWAY LANDS',          gradient:'',  active:true, order:1  },
  { id:'2',  filename:'/screenshots/spawn-hill.png',    title:'JOÐ VILLE',        sublabel:'OLD BASE',                gradient:'',  active:true, order:2  },
  { id:'3',  filename:'/screenshots/cherry-estate.png', title:'PINK ESTATE',      sublabel:'OLD BASE',                gradient:'',  active:true, order:3  },
  { id:'4',  filename:'/screenshots/j-club.png',        title:'J CLUB',           sublabel:'SECRET UNDERGROUND',      gradient:'',  active:true, order:4  },
  { id:'5',  filename:'/screenshots/mushroom-isle.png', title:'MUSHROOM ISLAND',  sublabel:'SHROOMY HEAVEN',          gradient:'',  active:true, order:5  },
  { id:'6',  filename:'/screenshots/the-hall.png',      title:'POTIONS TOWER',    sublabel:'NEW BASE',                gradient:'',  active:true, order:6  },
  { id:'7',  filename:'/screenshots/waterfront.png',    title:'VENICE',           sublabel:'NEW BASE',                gradient:'',  active:true, order:7  },
  { id:'8',  filename:'/screenshots/the-tavern.png',    title:'CITY HALL',        sublabel:'NEW BASE',                gradient:'',  active:true, order:8  },
  { id:'9',  filename:'/screenshots/the-village.png',   title:'THE VILLAGE',      sublabel:'NEW BASE',                gradient:'',  active:true, order:9  },
  { id:'10', filename:'/screenshots/balloon-island.png',title:'BALLOON PARADISE', sublabel:'NEW BASE',                gradient:'',  active:true, order:10 },
  { id:'11', filename:'/screenshots/night-sky.png',     title:'NEW TOWN',         sublabel:'NEW BASE',                gradient:'',  active:true, order:11 },
];

// ─── Editorial row layout ─────────────────────────────────────────────────────
// Each row has a fixed height. All photos in the same row share that height.
// `object-fit: cover` fills each cell regardless of column width.
// This creates the uniform-height editorial look of print photo spreads.
const ROWS = [
  { cols: '1fr',           rowClass: 'gr-1', indices: [0]       }, // Castle — full width hero
  { cols: '3fr 2fr',       rowClass: 'gr-2', indices: [1, 2]    }, // Spawn Hill + Cherry Estate
  { cols: '1fr 1fr 1fr',   rowClass: 'gr-3', indices: [3, 4, 5] }, // J Club + Mushroom + Hall
  { cols: '2fr 3fr',       rowClass: 'gr-4', indices: [6, 7]    }, // Venice + City Hall
  { cols: '1fr 1fr',       rowClass: 'gr-5', indices: [8, 9]    }, // Village + Balloon
  { cols: '1fr',           rowClass: 'gr-6', indices: [10]      }, // Night sky — full width close
];

// ─── Photo cell ───────────────────────────────────────────────────────────────
function PhotoCell({
  photo,
  index,
  totalCount,
  isFeatured,
  compact,
  onClick,
}: {
  photo:      GalleryPhoto;
  index:      number;
  totalCount: number;
  isFeatured: boolean;
  compact:    boolean;
  onClick:    () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, margin: '-30px' }}
      transition={{ duration: 0.7, delay: Math.min(index * 0.055, 0.32) }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
      data-cursor="hover"
      style={{
        position:   'relative',
        overflow:   'hidden',
        cursor:     'pointer',
        border:     `1px solid ${hovered ? 'rgba(0,255,65,0.25)' : 'rgba(20,25,40,0.8)'}`,
        transition: 'border-color 0.35s ease',
      }}
    >
      {/* Photo — always visible, zooms on hover */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photo.filename}
        alt={photo.title}
        style={{
          position:       'absolute',
          inset:          0,
          width:          '100%',
          height:         '100%',
          objectFit:      'cover',
          objectPosition: 'center',
          transform:      hovered ? 'scale(1.07)' : 'scale(1.0)',
          transition:     'transform 0.85s cubic-bezier(0.16,1,0.3,1)',
          pointerEvents:  'none',
          display:        'block',
        }}
      />

      {/* Permanent bottom scrim for text legibility */}
      <div style={{
        position:      'absolute',
        bottom: 0, left: 0, right: 0,
        height:        isFeatured ? '78%' : '72%',
        background:    'linear-gradient(to top, rgba(6,8,12,0.97) 0%, rgba(6,8,12,0.45) 50%, transparent 100%)',
        pointerEvents: 'none',
        zIndex:        2,
      }} />

      {/* Photo index — top right */}
      <div style={{
        position:      'absolute',
        top:           isFeatured ? '1.25rem' : '0.6rem',
        right:         isFeatured ? '1.25rem' : '0.6rem',
        fontFamily:    "'JetBrains Mono', monospace",
        fontSize:      '0.4rem',
        color:         'rgba(255,255,255,0.22)',
        letterSpacing: '0.08em',
        zIndex:        3,
        userSelect:    'none',
      }}>
        {String(index + 1).padStart(2, '0')} / {String(totalCount).padStart(2, '0')}
      </div>

      {/* Expand hint — top left, appears on hover */}
      <div style={{
        position:      'absolute',
        top:           isFeatured ? '1.25rem' : '0.6rem',
        left:          isFeatured ? '1.25rem' : '0.6rem',
        fontFamily:    "'JetBrains Mono', monospace",
        fontSize:      '0.4rem',
        letterSpacing: '0.2em',
        color:         hovered ? 'rgba(0,255,65,0.72)' : 'transparent',
        textTransform: 'uppercase',
        zIndex:        3,
        transition:    'color 0.25s ease',
        userSelect:    'none',
      }}>
        {isFeatured ? 'EXPAND ↗' : '↗'}
      </div>

      {/* Title block — bottom left, always visible */}
      <div style={{
        position:   'absolute',
        bottom:     isFeatured ? '1.75rem' : compact ? '0.5rem' : '0.7rem',
        left:       isFeatured ? '1.5rem'  : compact ? '0.55rem' : '0.7rem',
        right:      isFeatured ? '1.5rem'  : compact ? '0.55rem' : '0.7rem',
        zIndex:     3,
        transform:  hovered ? 'translateY(-4px)' : 'none',
        transition: 'transform 0.4s cubic-bezier(0.16,1,0.3,1)',
      }}>
        {/* Sublabel — hidden in compact (3-column) rows to avoid cramping */}
        {photo.sublabel && !compact && (
          <p style={{
            fontFamily:    "'JetBrains Mono', monospace",
            fontSize:      isFeatured ? '0.56rem' : '0.4rem',
            letterSpacing: '0.28em',
            color:         '#00ff41',
            textTransform: 'uppercase',
            marginBottom:  isFeatured ? '0.55rem' : '0.14rem',
            lineHeight:    1,
          }}>
            {photo.sublabel}
          </p>
        )}
        <p style={{
          fontFamily:    "'Space Grotesk', sans-serif",
          fontSize:      isFeatured
            ? 'clamp(2.2rem, 5vw, 4.5rem)'
            : compact
            ? 'clamp(0.6rem, 1.1vw, 0.78rem)'
            : 'clamp(0.7rem, 1.4vw, 0.92rem)',
          fontWeight:    900,
          letterSpacing: isFeatured ? '-0.03em' : '-0.01em',
          color:         '#ffffff',
          textTransform: 'uppercase',
          lineHeight:    0.92,
          textShadow:    isFeatured ? '0 4px 24px rgba(0,0,0,0.7)' : 'none',
        }}>
          {photo.title}
        </p>
      </div>

      {/* Inset accent border on hover */}
      <div style={{
        position:      'absolute',
        inset:         0,
        border:        `1px solid rgba(0,255,65,${hovered ? 0.16 : 0})`,
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
        {/* Section header */}
        <div style={{ marginBottom: 'clamp(2rem, 4vw, 3.5rem)' }}>
          <motion.p
            initial={{ opacity: 0, x: -14 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="section-label"
          >
            02 — THE WORLD
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.65, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
            style={{ display: 'flex', alignItems: 'baseline', gap: '1.5rem', flexWrap: 'wrap' }}
          >
            <h2 style={{
              fontFamily:    "'Space Grotesk', sans-serif",
              fontSize:      'clamp(3rem, 7vw, 6rem)',
              fontWeight:    900,
              letterSpacing: '-0.03em',
              color:         '#dde1ec',
              lineHeight:    0.95,
            }}>
              THE WORLD
            </h2>
            <span style={{
              fontFamily:    "'JetBrains Mono', monospace",
              fontSize:      '0.6rem',
              letterSpacing: '0.22em',
              color:         '#1e2230',
              textTransform: 'uppercase',
              alignSelf:     'flex-end',
              paddingBottom: '0.5rem',
            }}>
              {photos.length} locations
            </span>
          </motion.div>
        </div>

        {/* Editorial photo rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          {ROWS.map((row, rowIdx) => (
            <div
              key={rowIdx}
              className={`gr ${row.rowClass}`}
              style={{ gridTemplateColumns: row.cols }}
            >
              {row.indices.map(photoIdx => {
                const photo = photos[photoIdx];
                if (!photo) return null;
                return (
                  <PhotoCell
                    key={photo.id}
                    photo={photo}
                    index={photoIdx}
                    totalCount={photos.length}
                    isFeatured={row.indices.length === 1}
                    compact={row.indices.length === 3}
                    onClick={() => openLightbox(photoIdx)}
                  />
                );
              })}
            </div>
          ))}
        </div>

        {/* Attribution */}
        <p style={{
          paddingTop:    '1.25rem',
          fontFamily:    "'JetBrains Mono', monospace",
          fontSize:      '0.44rem',
          color:         '#131722',
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
        }}>
          SCREENSHOTS FROM JOD — play.jodcraft.world
        </p>
      </section>

    </>
  );
}

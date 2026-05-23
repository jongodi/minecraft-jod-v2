'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useRef } from 'react';

export interface LightboxPhoto {
  src:       string;
  title?:    string;
  subtitle?: string;
}

interface Props {
  photos:       LightboxPhoto[];
  currentIndex: number;
  onClose:      () => void;
  onPrev:       () => void;
  onNext:       () => void;
}

export default function Lightbox({ photos, currentIndex, onClose, onPrev, onNext }: Props) {
  const photo       = photos[currentIndex];
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape')     onClose();
      if (e.key === 'ArrowLeft')  onPrev();
      if (e.key === 'ArrowRight') onNext();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, onPrev, onNext]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const onTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const onTouchEnd   = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (dx > 60)       onPrev();
    else if (dx < -60) onNext();
    touchStartX.current = null;
  };

  const navBtn = (onClick: () => void, label: string, side: 'left' | 'right') => (
    <button
      onClick={e => { e.stopPropagation(); onClick(); }}
      aria-label={label}
      style={{
        position:        'absolute',
        [side]:          '-3.5rem',
        top:             '50%',
        transform:       'translateY(-50%)',
        background:      '#0d1018',
        border:          '1px solid #2a3045',
        color:           '#dde1ec',
        fontFamily:      "'JetBrains Mono', monospace",
        fontSize:        '1.2rem',
        width:           '2.5rem',
        height:          '2.5rem',
        cursor:          'pointer',
        display:         'flex',
        alignItems:      'center',
        justifyContent:  'center',
        transition:      'background 0.2s, border-color 0.2s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background    = '#1c2030';
        e.currentTarget.style.borderColor   = '#00ff41';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background    = '#0d1018';
        e.currentTarget.style.borderColor   = '#2a3045';
      }}
    >
      {side === 'left' ? '‹' : '›'}
    </button>
  );

  return (
    <AnimatePresence>
      <motion.div
        key="lightbox-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.22 }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        style={{
          position:       'fixed',
          inset:          0,
          zIndex:         9999,
          background:     'rgba(6,8,12,0.97)',
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          flexDirection:  'column',
          gap:            '1rem',
        }}
        onClick={onClose}
      >
        {/* Image */}
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          onClick={e => e.stopPropagation()}
          style={{ position: 'relative', maxWidth: 'min(95vw, 1400px)', maxHeight: '80vh', width: '100%' }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photo.src}
            alt={photo.title ?? ''}
            style={{
              width:      '100%',
              height:     '100%',
              objectFit:  'contain',
              display:    'block',
              maxHeight:  '80vh',
              border:     '1px solid #1c2030',
            }}
          />
          {navBtn(onPrev, 'Previous photo', 'left')}
          {navBtn(onNext, 'Next photo',     'right')}
        </motion.div>

        {/* Caption */}
        {(photo.title || photo.subtitle) && (
          <div onClick={e => e.stopPropagation()} style={{ textAlign: 'center' }}>
            {photo.subtitle && (
              <p style={{
                fontFamily:    "'JetBrains Mono', monospace",
                fontSize:      '0.5rem',
                letterSpacing: '0.3em',
                color:         'rgba(0,255,65,0.5)',
                textTransform: 'uppercase',
                marginBottom:  '0.2rem',
              }}>
                {photo.subtitle}
              </p>
            )}
            {photo.title && (
              <p style={{
                fontFamily:    "'Space Grotesk', sans-serif",
                fontSize:      'clamp(0.9rem, 2vw, 1.15rem)',
                fontWeight:    700,
                color:         '#dde1ec',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}>
                {photo.title}
              </p>
            )}
          </div>
        )}

        {/* Counter + hint */}
        <p style={{
          fontFamily:    "'JetBrains Mono', monospace",
          fontSize:      '0.46rem',
          color:         '#1e2230',
          letterSpacing: '0.2em',
        }}>
          {currentIndex + 1} / {photos.length} · ESC to close · ← → to navigate
        </p>

        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position:      'fixed',
            top:           '1.25rem',
            right:         '1.25rem',
            background:    '#0d1018',
            border:        '1px solid #1c2030',
            color:         '#505770',
            fontFamily:    "'JetBrains Mono', monospace",
            fontSize:      '0.62rem',
            padding:       '0.4rem 0.75rem',
            cursor:        'pointer',
            letterSpacing: '0.12em',
            transition:    'border-color 0.2s, color 0.2s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = '#00ff41';
            e.currentTarget.style.color       = '#dde1ec';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = '#1c2030';
            e.currentTarget.style.color       = '#505770';
          }}
        >
          ESC ✕
        </button>
      </motion.div>
    </AnimatePresence>
  );
}

'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useRef } from 'react';

export interface LightboxPhoto {
  src:       string;
  title?:    string;  // main caption line
  subtitle?: string;  // smaller line above title
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
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape')     onClose();
      if (e.key === 'ArrowLeft')  onPrev();
      if (e.key === 'ArrowRight') onNext();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, onPrev, onNext]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  function onTouchStart(e: React.TouchEvent) { touchStartX.current = e.touches[0].clientX; }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (dx > 60)       onPrev();
    else if (dx < -60) onNext();
    touchStartX.current = null;
  }

  const mono = "'JetBrains Mono', monospace";
  const sans = "'Space Grotesk', sans-serif";

  return (
    <AnimatePresence>
      <motion.div
        key="lightbox-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem' }}
        onClick={onClose}
      >
        {/* Image */}
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={e => e.stopPropagation()}
          style={{ position: 'relative', maxWidth: 'min(95vw, 1400px)', maxHeight: '80vh', width: '100%' }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo.src} alt={photo.title ?? ''} style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', maxHeight: '80vh' }} />

          <button onClick={e => { e.stopPropagation(); onPrev(); }} style={{ position: 'absolute', left: '-3.5rem', top: '50%', transform: 'translateY(-50%)', background: '#0d0d0d', border: '1px solid #2a2a2a', color: '#ccc', fontFamily: mono, fontSize: '1.2rem', width: '2.5rem', height: '2.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</button>
          <button onClick={e => { e.stopPropagation(); onNext(); }} style={{ position: 'absolute', right: '-3.5rem', top: '50%', transform: 'translateY(-50%)', background: '#0d0d0d', border: '1px solid #2a2a2a', color: '#ccc', fontFamily: mono, fontSize: '1.2rem', width: '2.5rem', height: '2.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>›</button>
        </motion.div>

        {/* Caption */}
        {(photo.title || photo.subtitle) && (
          <div onClick={e => e.stopPropagation()} style={{ textAlign: 'center' }}>
            {photo.subtitle && (
              <p style={{ fontFamily: mono, fontSize: '0.55rem', letterSpacing: '0.3em', color: '#00ff4166', textTransform: 'uppercase', marginBottom: '0.2rem' }}>
                {photo.subtitle}
              </p>
            )}
            {photo.title && (
              <p style={{ fontFamily: sans, fontSize: 'clamp(0.9rem, 2vw, 1.2rem)', fontWeight: 700, color: '#f0f0f0', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                {photo.title}
              </p>
            )}
          </div>
        )}

        <p style={{ fontFamily: mono, fontSize: '0.5rem', color: '#333', letterSpacing: '0.2em' }}>
          {currentIndex + 1} / {photos.length} · ESC to close · ← → to navigate
        </p>

        <button onClick={onClose} style={{ position: 'fixed', top: '1rem', right: '1rem', background: '#0d0d0d', border: '1px solid #2a2a2a', color: '#666', fontFamily: mono, fontSize: '0.7rem', padding: '0.4rem 0.7rem', cursor: 'pointer', letterSpacing: '0.1em' }}>
          ESC ✕
        </button>
      </motion.div>
    </AnimatePresence>
  );
}

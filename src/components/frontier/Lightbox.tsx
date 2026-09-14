'use client';

import { useEffect, useRef } from 'react';

export interface LightboxPhoto { src: string; title?: string; sub?: string }

interface Props {
  photos:  LightboxPhoto[];
  index:   number;
  onClose: () => void;
  onPrev:  () => void;
  onNext:  () => void;
}

export default function Lightbox({ photos, index, onClose, onPrev, onNext }: Props) {
  const touchX = useRef<number | null>(null);
  const photo  = photos[index];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape')     onClose();
      if (e.key === 'ArrowLeft')  onPrev();
      if (e.key === 'ArrowRight') onNext();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [onClose, onPrev, onNext]);

  if (!photo) return null;

  return (
    <div
      className="f-lb"
      role="dialog"
      aria-modal="true"
      aria-label={photo.title ?? 'Photo'}
      onClick={onClose}
      onTouchStart={e => { touchX.current = e.touches[0].clientX; }}
      onTouchEnd={e => {
        if (touchX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        touchX.current = null;
        if (Math.abs(dx) > 48) { dx > 0 ? onPrev() : onNext(); }
      }}
    >
      <button className="f-lb__close" onClick={onClose} aria-label="Close">✕</button>
      <div className="f-lb__img" onClick={e => e.stopPropagation()}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photo.src} alt={photo.title ?? ''} />
      </div>
      <div className="f-lb__bar" onClick={e => e.stopPropagation()}>
        <div className="f-lb__cap">
          {photo.title}
          {photo.sub && <small>{photo.sub}</small>}
        </div>
        {photos.length > 1 && (
          <div className="f-inline">
            <span className="f-label f-cards__count">{index + 1} / {photos.length}</span>
            <button className="f-cards__arrow" onClick={onPrev} aria-label="Previous">←</button>
            <button className="f-cards__arrow" onClick={onNext} aria-label="Next">→</button>
          </div>
        )}
      </div>
    </div>
  );
}

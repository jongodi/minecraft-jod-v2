'use client';

import Image from 'next/image';
import { useEffect, useRef } from 'react';
import type { Shot } from '@/data/gallery';

interface LightboxProps {
  shots: readonly Shot[];
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
}

const SWIPE_PX = 48;

/**
 * Keyboard: arrows and Escape. Touch: swipe left and right. Focus lands on
 * the close button when it opens and goes back where it was when it closes.
 */
export function Lightbox({ shots, index, onIndex, onClose }: LightboxProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const touchX = useRef<number | null>(null);
  const shot = shots[index];
  const prev = () => onIndex((index - 1 + shots.length) % shots.length);
  const next = () => onIndex((index + 1) % shots.length);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      previous?.focus();
    };
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${shot.title}, mynd ${index + 1} af ${shots.length}`}
      className="fixed inset-0 z-50 flex flex-col bg-bg"
      onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => {
        if (touchX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        touchX.current = null;
        if (dx > SWIPE_PX) prev();
        if (dx < -SWIPE_PX) next();
      }}
    >
      <div className="flex items-center justify-between px-gutter pt-[max(1rem,env(safe-area-inset-top))]">
        <p className="num font-label text-label uppercase text-muted">
          {index + 1} / {shots.length}
        </p>
        <button ref={closeRef} type="button" onClick={onClose} className="-mr-3 min-h-11 px-3 font-label text-label uppercase">
          Loka
        </button>
      </div>
      <div className="relative min-h-0 flex-1">
        <Image
          key={shot.src}
          src={shot.src}
          alt={shot.alt}
          fill
          sizes="100vw"
          className="object-contain"
        />
      </div>
      <div className="flex items-end justify-between gap-6 px-gutter pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
        <div>
          <p className="font-display text-name uppercase">{shot.title}</p>
          <p className="mt-1 text-meta text-muted">{shot.place}</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button type="button" onClick={prev} className="min-h-11 min-w-11 border border-line px-4 font-label text-label uppercase" aria-label="Fyrri mynd">
            Fyrri
          </button>
          <button type="button" onClick={next} className="min-h-11 min-w-11 border border-line px-4 font-label text-label uppercase" aria-label="Næsta mynd">
            Næsta
          </button>
        </div>
      </div>
    </div>
  );
}

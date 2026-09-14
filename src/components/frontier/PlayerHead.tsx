'use client';

import { headUrl, headFallback } from './data';

interface Props { name: string; size?: number; className?: string }

/** Pixel head from mc-heads, with minotar as a fallback. Raw <img> on purpose:
    Next's image optimiser would blur the 8×8 texture. */
export default function PlayerHead({ name, size = 64, className }: Props) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className={className}
      src={headUrl(name, size)}
      alt={`${name}'s skin`}
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      onError={e => {
        const img = e.currentTarget;
        if (!img.dataset.fallback) { img.dataset.fallback = '1'; img.src = headFallback(name, size); }
        else img.style.visibility = 'hidden';
      }}
    />
  );
}

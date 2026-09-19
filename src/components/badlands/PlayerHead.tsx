'use client';

import { bodyFallback, bodyUrl, headUrl, headFallback } from './data';

interface Props {
  name: string;
  /** CSS pixels; the image is fetched at four times this */
  size?: number;
  /** The whole skin, front on, instead of the head. The image is twice as tall as it is wide. */
  full?: boolean;
  className?: string;
}

/** Pixel head (or whole skin) from minotar, with mc-heads as a fallback. Raw
    <img> on purpose: Next's image optimiser would blur the 8×8 texture. */
export default function PlayerHead({ name, size = 64, full = false, className }: Props) {
  const px = size * 4;
  const src = full ? bodyUrl(name, px) : headUrl(name, px);
  const fallback = full ? bodyFallback(name, px) : headFallback(name, px);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className={className}
      src={src}
      alt={full ? `${name}, skinnið` : `${name}'s skin`}
      width={px}
      height={full ? px * 2 : px}
      loading="lazy"
      decoding="async"
      onError={e => {
        const img = e.currentTarget;
        if (!img.dataset.fallback) { img.dataset.fallback = '1'; img.src = fallback; }
        else img.style.visibility = 'hidden';
      }}
    />
  );
}

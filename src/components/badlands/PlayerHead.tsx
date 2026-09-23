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

/* When neither service answers: a blank head drawn on the same 8 by 8 grid,
   in the badlands' own browns, with a question mark where the face would be.
   An empty frame read as a layout bug; this reads as someone not yet known. */
const px = (x: number, y: number, w = 1, h = 1) => `<rect x='${x}' y='${y}' width='${w}' height='${h}'/>`;
const UNKNOWN_HEAD = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 8' shape-rendering='crispEdges'>` +
  `<rect width='8' height='8' fill='#4D3323'/><rect y='6' width='8' height='2' fill='#35221A'/>` +
  `<g fill='#D1B2A1'>${px(3, 1, 2)}${px(2, 2)}${px(5, 2)}${px(5, 3)}${px(4, 4)}${px(4, 6)}</g></svg>`,
)}`;
const UNKNOWN_BODY = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 32' shape-rendering='crispEdges'>` +
  `<g fill='#4D3323'>${px(4, 0, 8, 8)}${px(4, 8, 8, 12)}${px(0, 8, 4, 12)}${px(12, 8, 4, 12)}${px(4, 20, 4, 12)}${px(8, 20, 4, 12)}</g>` +
  `<g fill='#D1B2A1'>${px(7, 1, 2)}${px(6, 2)}${px(9, 2)}${px(9, 3)}${px(8, 4)}${px(8, 6)}</g></svg>`,
)}`;

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
      alt={full ? `${name}, skinnið` : `${name}, hausinn`}
      width={px}
      height={full ? px * 2 : px}
      loading="lazy"
      decoding="async"
      onError={e => {
        const img = e.currentTarget;
        if (!img.dataset.fallback) { img.dataset.fallback = '1'; img.src = fallback; }
        else if (img.dataset.fallback === '1') { img.dataset.fallback = '2'; img.src = full ? UNKNOWN_BODY : UNKNOWN_HEAD; }
      }}
    />
  );
}

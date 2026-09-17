import { getImageProps } from 'next/image';

/* Photographs come in at 1920px from the bundled screenshots and at up to
   2560px from the admin panel, and the page hangs them at anything from a
   52px map thumbnail to a full-screen lightbox. These helpers hand back a
   srcset for a given slot so the browser downloads what it will draw.

   getImageProps rather than <Image>: badlands.css already frames every one
   of these pictures with its own box, border and object-fit, and the
   component would layer its own markup and inline styles on top. */

/** The slots a photograph is shown in, and the CSS width of each. */
export const PHOTO_SIZES = {
  /* four columns inside a 1160px wrap, two on phones */
  frame:     '(min-width: 1280px) 260px, (min-width: 720px) 24vw, 46vw',
  /* every fifth frame spans two of those columns */
  frameHero: '(min-width: 1280px) 520px, (min-width: 720px) 48vw, 92vw',
  /* one rail of frames: clamp(10rem, 40vw, 13rem) */
  railFrame: '(min-width: 520px) 208px, 40vw',
  /* the print pinned to the map: 22rem, then 15rem, then 18rem */
  print:    '(min-width: 1000px) 288px, (min-width: 720px) 240px, min(100vw, 352px)',
  /* the map index thumbnail: 3.25rem */
  thumb:    '52px',
  /* a crew member's screenshots: three columns inside a 1160px wrap, two on phones */
  shot:     '(min-width: 1280px) 350px, (min-width: 640px) 31vw, 46vw',
  /* the lightbox card: min(90vw, 1100px) */
  lightbox: '(min-width: 1223px) 1100px, 90vw',
} as const;

/** A photograph's `src`, `srcSet` and `sizes` for one of the slots above. */
export function photoProps(src: string, sizes: string, quality?: number) {
  const { props } = getImageProps({
    src,
    alt: '',
    /* The slot's CSS box decides the drawn size and `sizes` decides which
       candidate is fetched; these are only the intrinsic hint. */
    width: 1920,
    height: 1009,
    sizes,
    ...(quality === undefined ? {} : { quality }),
  });
  return { src: props.src, srcSet: props.srcSet, sizes: props.sizes };
}

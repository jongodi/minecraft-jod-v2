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
  /* the album: four columns inside a 1160px wrap, two on phones */
  frame:     '(min-width: 1280px) 260px, (min-width: 720px) 24vw, 46vw',
  /* every fifth frame spans two of those columns */
  frameHero: '(min-width: 1280px) 520px, (min-width: 720px) 48vw, 92vw',
  /* the still the world opens as: the whole viewport */
  poster:   '100vw',
  /* the postcard of a chosen place: 22rem on desktop, the frame's width on phones */
  card:     '(min-width: 900px) 352px, calc(100vw - 2rem)',
  /* a place's thumbnail on the rail: 3.5rem */
  thumb:    '56px',
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

/* Fallback for browsers without CSS scroll-driven animations: set the
   same `--evening` number from scroll. Does nothing where CSS handles it,
   and nothing under reduced motion (the stylesheet fixes the hour).

   --evening does not inherit, so this writes it to each element that reads
   it (the same set badlands.css animates directly where scroll timelines
   exist). Writing it to <html> instead would invalidate the computed style
   of every element on the page on every scroll frame. */

const HERO_SCROLL = 1.2; // viewport heights over which the sun sets; matches animation-range in badlands.css
const TARGETS = '.b-sky__night, .b-sky__stars, .b-sky__sun, .b-hero__sun, .b-mesa__layer, .b-mesa__shade, .b-hero__glow, .b-hero__moon, .b-sky__clouds, .b-clouds, .b-mesa__haze';

export function startEveningFallback(): () => void {
  if (typeof window === 'undefined') return () => {};
  if (CSS.supports('animation-timeline: scroll()')) return () => {};
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return () => {};

  /* Looked up again whenever the hour changes, not once: the season's snow
     and jack-o'-lanterns are drawn after this starts, and a list taken at
     the start left them in daylight all evening. A lookup is no layout
     read, and past the hero, pinned at night, nothing runs at all. */
  const targets = () => document.querySelectorAll<HTMLElement | SVGElement>(TARGETS);

  let raf = 0;
  let last = '';
  const apply = () => {
    raf = 0;
    const t = Math.min(1, Math.max(0, window.scrollY / (window.innerHeight * HERO_SCROLL)));
    const next = t.toFixed(3);
    if (next === last) return;            // pinned at 1 past the hero: nothing to invalidate
    last = next;
    for (const el of targets()) el.style.setProperty('--evening', next);
  };
  const onScroll = () => { if (!raf) raf = requestAnimationFrame(apply); };
  apply();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  return () => {
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('resize', onScroll);
    cancelAnimationFrame(raf);
    for (const el of targets()) el.style.removeProperty('--evening');
  };
}

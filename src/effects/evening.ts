/* Fallback for browsers without CSS scroll-driven animations: set the
   same `--evening` number from scroll. Does nothing where CSS handles it,
   and nothing under reduced motion (the stylesheet fixes the hour). */

const HERO_SCROLL = 1.2; // viewport heights over which the sun sets; matches animation-range in badlands.css

export function startEveningFallback(): () => void {
  if (typeof window === 'undefined') return () => {};
  if (CSS.supports('animation-timeline: scroll()')) return () => {};
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return () => {};

  const root = document.documentElement;
  let raf = 0;
  const apply = () => {
    raf = 0;
    const t = Math.min(1, Math.max(0, window.scrollY / (window.innerHeight * HERO_SCROLL)));
    root.style.setProperty('--evening', t.toFixed(3));
  };
  const onScroll = () => { if (!raf) raf = requestAnimationFrame(apply); };
  apply();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  return () => {
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('resize', onScroll);
    cancelAnimationFrame(raf);
    root.style.removeProperty('--evening');
  };
}

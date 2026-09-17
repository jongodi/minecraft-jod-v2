'use client';

import { useEffect, useRef } from 'react';

/* Dust on the wind at sunset, embers by the fire at the end. One canvas,
   drawn only while the hero or the footer is on screen and the tab is
   visible. Phones get fewer particles; the device pixel ratio is capped. */

const MAX_DPR = 2;
const COUNT = { fine: 56, coarse: 22 };
const DUST = { size: 2, speed: 0.18, drift: 0.35 };
const EMBER = { size: 2, speed: 0.55, drift: 0.12 };

type Mode = 'dust' | 'embers' | null;
interface Mote { x: number; y: number; vx: number; vy: number; life: number; size: number }

interface Props { heroId: string; fireId: string }

export default function Particles({ heroId, fireId }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const hero = document.getElementById(heroId);
    const fire = document.getElementById(fireId);
    if (!canvas || !hero || !fire) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const coarse = window.matchMedia('(pointer: coarse)').matches;
    const count = coarse ? COUNT.coarse : COUNT.fine;
    const dpr = Math.min(MAX_DPR, window.devicePixelRatio || 1);
    const styles = getComputedStyle(document.documentElement);
    const colours = { dust: styles.getPropertyValue('--dust').trim(), embers: styles.getPropertyValue('--ember').trim() };

    let w = 0, h = 0;
    const resize = () => {
      w = window.innerWidth; h = window.innerHeight;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`; canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const motes: Mote[] = [];
    let mode: Mode = null;
    let raf = 0;
    let hidden = document.hidden;
    let heroIn = false, fireIn = false;

    /* Where the flame sits on the page. Measured when the fire comes into
       view and on resize, never while spawning: a getBoundingClientRect per
       ember is a forced layout in the middle of an animation frame, and
       embers respawn several times a second. The viewport position is then
       just the document position less the scroll. */
    const flame = (fire.querySelector('.b-fire') ?? fire) as HTMLElement;
    let box = { left: 0, top: 0, width: 0, height: 0 };   // document coordinates
    let seat = { left: 0, top: 0 };                       // and the same in the viewport, this frame
    const measureFlame = () => {
      const r = flame.getBoundingClientRect();
      box = { left: r.left + window.scrollX, top: r.top + window.scrollY, width: r.width, height: r.height };
    };
    const seatFlame = () => { seat = { left: box.left - window.scrollX, top: box.top - window.scrollY }; };

    const spawn = (m: Mote, fresh: boolean) => {
      const p = mode === 'embers' ? EMBER : DUST;
      m.size = p.size * (Math.random() < 0.3 ? 2 : 1);
      m.life = 1;
      if (mode === 'embers') {
        m.x = seat.left + box.width * (0.3 + Math.random() * 0.4);
        m.y = fresh ? seat.top + box.height * (0.2 + Math.random() * 0.5) : seat.top + box.height * 0.55;
        m.vx = (Math.random() - 0.5) * EMBER.drift;
        m.vy = -EMBER.speed * (0.6 + Math.random() * 0.8);
      } else {
        m.x = fresh ? Math.random() * w : -10;
        m.y = h * (0.25 + Math.random() * 0.7);
        m.vx = DUST.drift * (0.6 + Math.random() * 0.8);
        m.vy = (Math.random() - 0.5) * DUST.speed;
      }
    };
    const fill = () => { motes.length = 0; for (let i = 0; i < count; i++) { const m = { x: 0, y: 0, vx: 0, vy: 0, life: 1, size: 2 }; spawn(m, true); motes.push(m); } };

    const frame = () => {
      raf = 0;
      if (!mode || hidden) { ctx.clearRect(0, 0, w, h); return; }
      if (mode === 'embers') seatFlame();   // the fire scrolls; read the offset once, not once per ember
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = mode === 'embers' ? colours.embers : colours.dust;
      for (const m of motes) {
        m.x += m.vx; m.y += m.vy;
        if (mode === 'embers') { m.life -= 0.006 + Math.random() * 0.004; m.vx += (Math.random() - 0.5) * 0.04; }
        else m.vy += (Math.random() - 0.5) * 0.02;
        const out = m.x > w + 10 || m.y < -10 || m.y > h + 10 || m.life <= 0;
        if (out) spawn(m, false);
        ctx.globalAlpha = mode === 'embers' ? Math.max(0, m.life) * 0.9 : 0.35;
        ctx.fillRect(Math.round(m.x), Math.round(m.y), m.size, m.size);
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(frame);
    };
    const run = () => { if (!raf) raf = requestAnimationFrame(frame); };
    const decide = () => {
      const next: Mode = fireIn ? 'embers' : heroIn ? 'dust' : null;
      if (next !== mode) { mode = next; if (mode === 'embers') { measureFlame(); seatFlame(); } if (mode) fill(); }
      run();
    };

    const obs = new IntersectionObserver(entries => {
      for (const e of entries) {
        if (e.target === hero) heroIn = e.isIntersecting;
        if (e.target === fire) fireIn = e.isIntersecting;
      }
      decide();
    }, { threshold: 0.05 });
    obs.observe(hero); obs.observe(fire);

    /* Folding a section open above the footer moves the fire down the page. */
    const ro = new ResizeObserver(() => { if (mode === 'embers') measureFlame(); });
    ro.observe(document.documentElement);

    const onVis = () => { hidden = document.hidden; run(); };
    document.addEventListener('visibilitychange', onVis);
    const onResize = () => { resize(); if (mode === 'embers') measureFlame(); };
    window.addEventListener('resize', onResize, { passive: true });
    return () => {
      obs.disconnect();
      ro.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(raf);
    };
  }, [heroId, fireId]);

  return <canvas ref={ref} className="b-particles" aria-hidden="true" />;
}

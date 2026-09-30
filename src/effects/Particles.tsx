'use client';

import { useEffect, useRef } from 'react';

/* Dust on the wind at sunset, embers by the fire at the end. One canvas,
   drawn only while the hero or the footer is on screen and the tab is
   visible. Phones get fewer particles; the device pixel ratio is capped.
   In winter snow falls over the sunset instead of the dust, and on
   gamlárskvöld and nýársdagur fireworks burst over the fire (src/lib/season.ts). */

const MAX_DPR = 2;
const COUNT = { fine: 56, coarse: 22 };
const DUST = { size: 2, speed: 0.18, drift: 0.35 };
const EMBER = { size: 2, speed: 0.55, drift: 0.12 };
const SNOW = { size: 2, speed: 0.55, drift: 0.25 };
/* a burst every so often, each a ring of sparks falling back under gravity */
const BURST_MS = 1100;
const SPARKS = { fine: 40, coarse: 24 };

type Mode = 'dust' | 'snow' | 'embers' | null;
interface Mote { x: number; y: number; vx: number; vy: number; life: number; size: number }
interface Spark extends Mote { colour: string }

interface Props { heroId: string; fireId: string; snow?: boolean; fireworks?: boolean }

export default function Particles({ heroId, fireId, snow = false, fireworks = false }: Props) {
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
    const token = (n: string) => styles.getPropertyValue(n).trim();
    const colours = { dust: token('--dust'), embers: token('--ember'), snow: token('--star') };
    /* the bright ones only: the terracotta reds vanish against the night */
    const burstColours = [token('--lantern'), token('--sun'), token('--online'), token('--star'), '#F07A9A'].filter(Boolean);

    let w = 0, h = 0;
    const resize = () => {
      w = window.innerWidth; h = window.innerHeight;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`; canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const motes: Mote[] = [];
    const sparks: Spark[] = [];
    let lastBurst = 0;
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
    /* the footer's own top: fireworks burst in its sky, not over the world frame above it */
    let footTop = 0;
    const measureFlame = () => {
      const r = flame.getBoundingClientRect();
      box = { left: r.left + window.scrollX, top: r.top + window.scrollY, width: r.width, height: r.height };
      footTop = fire.getBoundingClientRect().top + window.scrollY;
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
      } else if (mode === 'snow') {
        m.size = SNOW.size * (Math.random() < 0.25 ? 2 : 1);
        m.x = Math.random() * w;
        m.y = fresh ? Math.random() * h : -10;
        m.vx = (Math.random() - 0.3) * SNOW.drift;
        m.vy = SNOW.speed * (0.5 + Math.random());
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
      ctx.fillStyle = mode === 'embers' ? colours.embers : mode === 'snow' ? colours.snow : colours.dust;
      for (const m of motes) {
        m.x += m.vx; m.y += m.vy;
        if (mode === 'embers') { m.life -= 0.006 + Math.random() * 0.004; m.vx += (Math.random() - 0.5) * 0.04; }
        else if (mode === 'snow') m.vx += (Math.random() - 0.5) * 0.03;
        else m.vy += (Math.random() - 0.5) * 0.02;
        const out = m.x > w + 10 || m.x < -20 || m.y < -10 || m.y > h + 10 || m.life <= 0;
        if (out) spawn(m, false);
        ctx.globalAlpha = mode === 'embers' ? Math.max(0, m.life) * 0.9 : mode === 'snow' ? 0.8 : 0.35;
        ctx.fillRect(Math.round(m.x), Math.round(m.y), m.size, m.size);
      }
      if (mode === 'embers' && fireworks) burst();
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(frame);
    };
    /* Fireworks: now and then a ring of sparks somewhere over the fire, falling back and fading. */
    const burst = () => {
      const now = performance.now();
      if (now - lastBurst > BURST_MS * (0.6 + Math.random() * 0.8) && burstColours.length) {
        lastBurst = now;
        /* anywhere across the footer's sky: the fire sits to one side, and bursts around it fell off the edge */
        const cx = w * (0.1 + Math.random() * 0.8);
        const skyTop = footTop - window.scrollY + 24;
        const cy = Math.max(skyTop, h * 0.05) + Math.random() * Math.max(10, seat.top - 30 - Math.max(skyTop, h * 0.05));
        const colour = burstColours[Math.floor(Math.random() * burstColours.length)];
        const n = coarse ? SPARKS.coarse : SPARKS.fine;
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2;
          const v = 1.6 + Math.random() * 1.8;
          sparks.push({ x: cx, y: cy, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1, size: Math.random() < 0.4 ? 4 : 3, colour });
        }
      }
      for (let i = sparks.length - 1; i >= 0; i--) {
        const p = sparks[i];
        p.x += p.vx; p.y += p.vy; p.vy += 0.03; p.vx *= 0.985; p.life -= 0.011;
        if (p.life <= 0) { sparks.splice(i, 1); continue; }
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.colour;
        ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
      }
    };
    const run = () => { if (!raf) raf = requestAnimationFrame(frame); };
    const decide = () => {
      const next: Mode = fireIn ? 'embers' : heroIn ? (snow ? 'snow' : 'dust') : null;
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
  }, [heroId, fireId, snow, fireworks]);

  return <canvas ref={ref} className="b-particles" aria-hidden="true" />;
}

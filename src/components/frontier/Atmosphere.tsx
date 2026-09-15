'use client';

import { useEffect, useRef } from 'react';
import { useReducedMotion } from 'framer-motion';

/* Two quiet layers: a warm lantern glow that drifts after the pointer,
   and a few dust motes. Both stay off for reduced motion and on touch. */
export default function Atmosphere() {
  const reduce = useReducedMotion();
  const glow   = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (reduce || !window.matchMedia('(pointer: fine)').matches) return;
    const el = glow.current;
    if (!el) return;
    let tx = window.innerWidth * 0.6, ty = window.innerHeight * 0.3, x = tx, y = ty, raf = 0, idle = false;
    const tick = () => {
      x += (tx - x) * 0.04; y += (ty - y) * 0.04;
      el.style.transform = `translate3d(${x - 600}px, ${y - 600}px, 0)`;
      if (Math.abs(tx - x) + Math.abs(ty - y) < 0.5) { idle = true; return; }
      raf = requestAnimationFrame(tick);
    };
    const onMove = (e: PointerEvent) => {
      tx = e.clientX; ty = e.clientY;
      if (idle) { idle = false; raf = requestAnimationFrame(tick); }
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    raf = requestAnimationFrame(tick);
    return () => { window.removeEventListener('pointermove', onMove); cancelAnimationFrame(raf); };
  }, [reduce]);

  useEffect(() => {
    if (reduce) return;
    const c = canvas.current;
    const ctx = c?.getContext('2d');
    if (!c || !ctx) return;
    const N = 40;
    let w = 0, h = 0, raf = 0, running = true;
    const motes = Array.from({ length: N }, () => ({ x: Math.random(), y: Math.random(), r: 0.6 + Math.random() * 1.6, vx: (Math.random() - 0.5) * 0.06, vy: -0.02 - Math.random() * 0.05, a: 0.15 + Math.random() * 0.25 }));
    const size = () => { w = c.width = window.innerWidth; h = c.height = window.innerHeight; };
    const draw = () => {
      if (!running) return;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = '#f6e6b8';
      for (const m of motes) {
        m.x += m.vx / 100; m.y += m.vy / 100;
        if (m.y < -0.02) { m.y = 1.02; m.x = Math.random(); }
        if (m.x < -0.02 || m.x > 1.02) m.vx *= -1;
        ctx.globalAlpha = m.a;
        ctx.beginPath(); ctx.arc(m.x * w, m.y * h, m.r, 0, Math.PI * 2); ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };
    const onVis = () => { running = !document.hidden; if (running) raf = requestAnimationFrame(draw); else cancelAnimationFrame(raf); };
    size();
    window.addEventListener('resize', size);
    document.addEventListener('visibilitychange', onVis);
    raf = requestAnimationFrame(draw);
    return () => { running = false; cancelAnimationFrame(raf); window.removeEventListener('resize', size); document.removeEventListener('visibilitychange', onVis); };
  }, [reduce]);

  if (reduce) return null;
  return (
    <>
      <div ref={glow} className="j-lantern" aria-hidden="true" />
      <canvas ref={canvas} className="j-motes" aria-hidden="true" />
    </>
  );
}

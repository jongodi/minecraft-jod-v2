'use client';

import { useEffect, useRef } from 'react';

interface Mote { x: number; y: number; r: number; vx: number; vy: number; a: number; da: number }

/** Warm dust motes drifting through the hero. Pauses off-screen,
    skipped entirely under reduced motion. */
export default function Dust() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let w = 0, h = 0, raf = 0, visible = true;
    const motes: Mote[] = [];
    const count = window.innerWidth < 640 ? 28 : 60;

    const resize = () => {
      w = canvas.width = canvas.clientWidth;
      h = canvas.height = canvas.clientHeight;
    };
    const spawn = (m?: Mote): Mote => {
      const n = m ?? ({} as Mote);
      n.x = Math.random() * w; n.y = Math.random() * h;
      n.r = 0.6 + Math.random() * 1.8;
      n.vx = (Math.random() - 0.5) * 0.25; n.vy = -0.05 - Math.random() * 0.2;
      n.a = Math.random() * Math.PI * 2; n.da = 0.004 + Math.random() * 0.01;
      return n;
    };
    resize();
    for (let i = 0; i < count; i++) motes.push(spawn());

    const tick = () => {
      raf = 0;
      if (!visible) return;
      ctx.clearRect(0, 0, w, h);
      for (const m of motes) {
        m.x += m.vx + Math.sin(m.a) * 0.15; m.y += m.vy; m.a += m.da;
        if (m.y < -4 || m.x < -4 || m.x > w + 4) { spawn(m); m.y = h + 4; }
        const alpha = 0.25 + 0.35 * (0.5 + 0.5 * Math.sin(m.a * 2));
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(230, 201, 121, ${alpha})`;
        ctx.fill();
      }
      raf = requestAnimationFrame(tick);
    };
    const start = () => { if (!raf && visible) raf = requestAnimationFrame(tick); };

    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; start(); });
    io.observe(canvas);
    window.addEventListener('resize', resize);
    start();
    return () => {
      io.disconnect();
      window.removeEventListener('resize', resize);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return <canvas ref={ref} className="f-hero__dust" aria-hidden="true" />;
}

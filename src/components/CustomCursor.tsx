'use client';

import { useEffect, useRef, useState } from 'react';

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  life: number; maxLife: number;
  size: number; color: string;
}

// Longer trail: green → white gradient
const TRAIL_COLORS = ['#00ff41', '#00ff41', '#00cc33', '#39ff5a', '#88ffaa', '#ccffdd', '#ffffff'];

export default function CustomCursor() {
  const dotRef    = useRef<HTMLDivElement>(null);
  const ringRef   = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isHovering, setIsHovering] = useState(false);
  const [isClicking, setIsClicking] = useState(false);

  const mousePos  = useRef({ x: -100, y: -100 });
  const ringPos   = useRef({ x: -100, y: -100 });
  const lastSpawn = useRef({ x: -100, y: -100 });
  const particles = useRef<Particle[]>([]);
  const rafId     = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const spawnParticle = (x: number, y: number) => {
      // Allow more particles for a longer, denser trail
      if (particles.current.length >= 90) return;
      const count = Math.random() < 0.5 ? 2 : 1;
      for (let i = 0; i < count; i++) {
        const maxL = Math.floor(Math.random() * 22 + 24); // slightly longer life
        particles.current.push({
          x:       x + (Math.random() - 0.5) * 4,
          y:       y + (Math.random() - 0.5) * 4,
          vx:      (Math.random() - 0.5) * 0.9,
          vy:      -Math.random() * 1.1 - 0.2,
          life:    maxL,
          maxLife: maxL,
          size:    Math.random() < 0.25 ? 3.5 : 2,
          color:   TRAIL_COLORS[Math.floor(Math.random() * TRAIL_COLORS.length)],
        });
      }
    };

    const onMouseMove = (e: MouseEvent) => {
      mousePos.current = { x: e.clientX, y: e.clientY };
      const dx = e.clientX - lastSpawn.current.x;
      const dy = e.clientY - lastSpawn.current.y;
      if (Math.sqrt(dx * dx + dy * dy) >= 5) {
        spawnParticle(e.clientX, e.clientY);
        lastSpawn.current = { x: e.clientX, y: e.clientY };
      }
    };

    const onMouseDown = () => setIsClicking(true);
    const onMouseUp   = () => setIsClicking(false);

    const onMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      setIsHovering(
        target.tagName === 'A'     || target.tagName === 'BUTTON' ||
        target.closest('a') !== null || target.closest('button') !== null ||
        target.getAttribute('data-cursor') === 'hover' ||
        target.closest('[data-cursor="hover"]') !== null
      );
    };

    const animate = () => {
      // Smooth ring follow
      ringPos.current.x += (mousePos.current.x - ringPos.current.x) * 0.12;
      ringPos.current.y += (mousePos.current.y - ringPos.current.y) * 0.12;

      // Dot (instant)
      if (dotRef.current) {
        const s = isClicking ? 12 : 8;
        dotRef.current.style.width  = `${s}px`;
        dotRef.current.style.height = `${s}px`;
        dotRef.current.style.transform =
          `translate(${mousePos.current.x - s / 2}px, ${mousePos.current.y - s / 2}px)`;
      }

      // Ring
      if (ringRef.current) {
        const s = isClicking ? 24 : isHovering ? 52 : 36;
        ringRef.current.style.width  = `${s}px`;
        ringRef.current.style.height = `${s}px`;
        ringRef.current.style.transform =
          `translate(${ringPos.current.x - s / 2}px, ${ringPos.current.y - s / 2}px)`;
      }

      // Particles
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.current = particles.current.filter(p => p.life > 0);

      for (const p of particles.current) {
        p.x    += p.vx;
        p.y    += p.vy;
        p.vy   += 0.02; // faint gravity
        p.life -= 1;

        const alpha = (p.life / p.maxLife) * 0.85;
        ctx.globalAlpha = alpha;
        ctx.fillStyle   = p.color;
        ctx.fillRect(
          Math.round(p.x - p.size / 2),
          Math.round(p.y - p.size / 2),
          p.size, p.size,
        );
      }

      ctx.globalAlpha = 1;
      rafId.current = requestAnimationFrame(animate);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup',   onMouseUp);
    window.addEventListener('mouseover', onMouseOver);
    rafId.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize',    resize);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup',   onMouseUp);
      window.removeEventListener('mouseover', onMouseOver);
      cancelAnimationFrame(rafId.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      {/* Particle canvas */}
      <canvas
        ref={canvasRef}
        className="custom-cursor"
        style={{
          position:       'fixed',
          top: 0, left: 0,
          pointerEvents:  'none',
          zIndex:         9997,
          imageRendering: 'pixelated',
        }}
      />

      {/* Dot — instant follow, screen blend for "glow through" effect */}
      <div
        ref={dotRef}
        className="custom-cursor"
        style={{
          position:       'fixed',
          top: 0, left: 0,
          width:          8,
          height:         8,
          background:     '#00ff41',
          borderRadius:   '50%',
          pointerEvents:  'none',
          zIndex:         9999,
          mixBlendMode:   'screen',
          willChange:     'transform',
          transition:     'width 0.1s, height 0.1s',
          boxShadow:      '0 0 10px rgba(0,255,65,0.9), 0 0 20px rgba(0,255,65,0.45)',
        }}
      />

      {/* Ring — lagging follow */}
      <div
        ref={ringRef}
        className="custom-cursor"
        style={{
          position:      'fixed',
          top: 0, left: 0,
          width:          36,
          height:         36,
          border:         '1px solid #00ff41',
          borderRadius:   '50%',
          pointerEvents:  'none',
          zIndex:         9998,
          mixBlendMode:   'difference',
          willChange:     'transform',
          transition:     'width 0.2s ease, height 0.2s ease',
        }}
      />
    </>
  );
}

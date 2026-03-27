'use client';

import { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  size: number;
  speed: number;
  opacity: number;
  color: string;
  driftX: number;
}

const PARTICLE_COLORS = [
  '#00ff41',
  '#00cc33',
  '#009922',
  '#00ff4133',
  '#006614',
  '#3a3a3a',
  '#555555',
  '#222222',
  '#f0f0f022',
];

function randomColor(): string {
  return PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)];
}

function createParticle(width: number, height: number): Particle {
  return {
    x: Math.random() * width,
    y: Math.random() * height,
    size: Math.random() * 2 + 1,
    speed: Math.random() * 0.3 + 0.08,
    opacity: Math.random() * 0.5 + 0.08,
    color: randomColor(),
    driftX: (Math.random() - 0.5) * 0.15,
  };
}

export default function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = canvas.offsetWidth;
    let height = canvas.offsetHeight;
    canvas.width = width;
    canvas.height = height;

    const PARTICLE_COUNT = 80;
    const particles: Particle[] = Array.from({ length: PARTICLE_COUNT }, () =>
      createParticle(width, height)
    );

    let rafId: number;
    let running = true;

    const draw = () => {
      if (!running) return;

      ctx.clearRect(0, 0, width, height);

      for (const p of particles) {
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, p.size, p.size);

        // Drift upward
        p.y -= p.speed;
        p.x += p.driftX;

        // Wrap when off screen
        if (p.y + p.size < 0) {
          p.y = height + p.size;
          p.x = Math.random() * width;
        }
        if (p.x < -p.size) p.x = width + p.size;
        if (p.x > width + p.size) p.x = -p.size;
      }

      ctx.globalAlpha = 1;
      rafId = requestAnimationFrame(draw);
    };

    draw();

    const onResize = () => {
      width = canvas.offsetWidth;
      height = canvas.offsetHeight;
      canvas.width = width;
      canvas.height = height;
    };

    window.addEventListener('resize', onResize);

    return () => {
      running = false;
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        display: 'block',
        pointerEvents: 'none',
      }}
    />
  );
}

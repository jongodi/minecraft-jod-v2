'use client';

import { useEffect, useRef, useState } from 'react';

const TRAIL_LEN = 22;

interface TrailPoint { x: number; y: number; }

export default function CustomCursor() {
  const dotRef    = useRef<HTMLDivElement>(null);
  const ringRef   = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [hovering, setHovering] = useState(false);
  const [clicking, setClicking] = useState(false);

  const mouse   = useRef({ x: -200, y: -200 });
  const ringPos = useRef({ x: -200, y: -200 });
  const trail   = useRef<TrailPoint[]>(
    Array.from({ length: TRAIL_LEN }, () => ({ x: -200, y: -200 }))
  );
  const rafId   = useRef<number>(0);

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

    const onMove = (e: MouseEvent) => {
      mouse.current = { x: e.clientX, y: e.clientY };
      // Shift trail
      trail.current.unshift({ x: e.clientX, y: e.clientY });
      if (trail.current.length > TRAIL_LEN) trail.current.pop();
    };

    const onDown = () => setClicking(true);
    const onUp   = () => setClicking(false);

    const onOver = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      setHovering(
        t.tagName === 'A' || t.tagName === 'BUTTON' ||
        t.closest('a') !== null || t.closest('button') !== null ||
        t.getAttribute('data-cursor') === 'hover' ||
        t.closest('[data-cursor="hover"]') !== null
      );
    };

    const animate = () => {
      // Smooth ring follow
      ringPos.current.x += (mouse.current.x - ringPos.current.x) * 0.11;
      ringPos.current.y += (mouse.current.y - ringPos.current.y) * 0.11;

      // Dot — instant
      if (dotRef.current) {
        const s = clicking ? 10 : 6;
        dotRef.current.style.width  = `${s}px`;
        dotRef.current.style.height = `${s}px`;
        dotRef.current.style.transform =
          `translate(${mouse.current.x - s / 2}px, ${mouse.current.y - s / 2}px)`;
      }

      // Ring
      if (ringRef.current) {
        const s = clicking ? 22 : hovering ? 52 : 34;
        ringRef.current.style.width  = `${s}px`;
        ringRef.current.style.height = `${s}px`;
        ringRef.current.style.borderColor = hovering ? 'rgba(245,166,35,0.9)' : 'rgba(245,166,35,0.5)';
        ringRef.current.style.transform =
          `translate(${ringPos.current.x - s / 2}px, ${ringPos.current.y - s / 2}px)`;
      }

      // Trail on canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let i = 0; i < trail.current.length; i++) {
        const { x, y } = trail.current[i];
        const t     = 1 - i / trail.current.length;     // 1 at head → 0 at tail
        const alpha = t * t * 0.65;
        const size  = t * 5 + 1;

        // Color: gold → purple along the trail
        const r = Math.round(245 * t + 139 * (1 - t));
        const g = Math.round(166 * t +  92 * (1 - t));
        const b = Math.round( 35 * t + 246 * (1 - t));

        ctx.globalAlpha = alpha;
        ctx.fillStyle   = `rgb(${r},${g},${b})`;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = 1;
      rafId.current = requestAnimationFrame(animate);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mousedown', onDown);
    window.addEventListener('mouseup',   onUp);
    window.addEventListener('mouseover', onOver);
    rafId.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize',    resize);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('mouseup',   onUp);
      window.removeEventListener('mouseover', onOver);
      cancelAnimationFrame(rafId.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      {/* Trail canvas */}
      <canvas
        ref={canvasRef}
        className="custom-cursor"
        style={{
          position: 'fixed', top: 0, left: 0,
          pointerEvents: 'none', zIndex: 9996,
        }}
      />

      {/* Dot */}
      <div
        ref={dotRef}
        className="custom-cursor"
        style={{
          position: 'fixed', top: 0, left: 0,
          width: 6, height: 6,
          borderRadius: '50%',
          background: '#F5A623',
          boxShadow: '0 0 8px rgba(245,166,35,0.9)',
          pointerEvents: 'none',
          zIndex: 9999,
          willChange: 'transform',
          transition: 'width 0.12s ease, height 0.12s ease',
          mixBlendMode: 'screen',
        }}
      />

      {/* Ring */}
      <div
        ref={ringRef}
        className="custom-cursor"
        style={{
          position: 'fixed', top: 0, left: 0,
          width: 34, height: 34,
          borderRadius: '50%',
          border: '1px solid rgba(245,166,35,0.5)',
          pointerEvents: 'none',
          zIndex: 9998,
          willChange: 'transform',
          transition: 'width 0.25s ease, height 0.25s ease, border-color 0.25s ease',
          mixBlendMode: 'screen',
        }}
      />
    </>
  );
}

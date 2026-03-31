'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

const IP = 'play.jodcraft.world';
const SCRAMBLE = '!<>-_\\/[]{}—=+*^?#@$%&ABCDEFabcdef0123456789';

function scramble(target: string, progress: number): string {
  return target
    .split('')
    .map((ch, i) => {
      if (i < Math.floor(target.length * progress)) return ch;
      return SCRAMBLE[Math.floor(Math.random() * SCRAMBLE.length)];
    })
    .join('');
}

/* ── Aurora Canvas ─────────────────────────────────────────── */
const BLOBS = [
  { bx: 0.18, by: 0.28, r: 0.48, color: [245, 166,  35], sx: 0.7,  sy: 0.5,  px: 0,   py: 1.2 },
  { bx: 0.78, by: 0.22, r: 0.52, color: [139,  92, 246], sx: 0.55, sy: 0.8,  px: 2.0, py: 0.8 },
  { bx: 0.48, by: 0.68, r: 0.42, color: [  6, 182, 212], sx: 0.9,  sy: 0.6,  px: 1.0, py: 2.0 },
  { bx: 0.12, by: 0.72, r: 0.38, color: [109,  40, 217], sx: 0.5,  sy: 0.7,  px: 3.0, py: 1.5 },
  { bx: 0.88, by: 0.62, r: 0.44, color: [  8, 145, 178], sx: 0.75, sy: 0.5,  px: 0.5, py: 2.5 },
  { bx: 0.58, by: 0.14, r: 0.36, color: [245, 158,  11], sx: 0.6,  sy: 0.9,  px: 1.5, py: 0.3 },
] as const;

function AuroraCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let t = 0;

    const resize = () => {
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const draw = () => {
      t += 0.0022;
      const { width: w, height: h } = canvas;

      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = '#03050A';
      ctx.fillRect(0, 0, w, h);

      for (const b of BLOBS) {
        const x = (b.bx + Math.sin(t * b.sx + b.px) * 0.13) * w;
        const y = (b.by + Math.cos(t * b.sy + b.py) * 0.11) * h;
        const r = Math.min(w, h) * b.r;
        const [R, G, B] = b.color;

        const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
        grad.addColorStop(0,    `rgba(${R},${G},${B},0.22)`);
        grad.addColorStop(0.45, `rgba(${R},${G},${B},0.10)`);
        grad.addColorStop(1,    `rgba(${R},${G},${B},0)`);

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }

      // Vignette
      const vig = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.75);
      vig.addColorStop(0.45, 'transparent');
      vig.addColorStop(1,    '#03050A');
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, w, h);

      animId = requestAnimationFrame(draw);
    };

    draw();
    return () => { ro.disconnect(); cancelAnimationFrame(animId); };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
    />
  );
}

/* ── Hero ──────────────────────────────────────────────────── */
export default function HeroSection() {
  const [ipDisplay, setIpDisplay] = useState(IP);
  const [copied, setCopied]       = useState(false);
  const [animating, setAnimating] = useState(false);
  const [magOffset, setMagOffset] = useState({ x: 0, y: 0 });
  const [mouse, setMouse]         = useState({ x: 0, y: 0 });

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef  = useRef<ReturnType<typeof setTimeout>  | null>(null);
  const btnRef      = useRef<HTMLDivElement>(null);

  // Magnetic button
  const handleMagMove = useCallback((e: React.MouseEvent) => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const cx   = rect.left + rect.width  / 2;
    const cy   = rect.top  + rect.height / 2;
    const dx   = e.clientX - cx;
    const dy   = e.clientY - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const max  = 90;
    if (dist < max) {
      const s = (max - dist) / max;
      setMagOffset({ x: dx * s * 0.45, y: dy * s * 0.45 });
    } else {
      setMagOffset({ x: 0, y: 0 });
    }
  }, []);

  const handleMagLeave = useCallback(() => setMagOffset({ x: 0, y: 0 }), []);

  // Mouse parallax
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      setMouse({
        x: (e.clientX / window.innerWidth  - 0.5) * 2,
        y: (e.clientY / window.innerHeight - 0.5) * 2,
      });
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  const handleCopy = useCallback(async () => {
    if (animating) return;
    setAnimating(true);
    await navigator.clipboard.writeText(IP).catch(() => {});
    const start = Date.now();
    const dur   = 800;
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      const p = Math.min((Date.now() - start) / dur, 1);
      if (p >= 1) {
        clearInterval(intervalRef.current!);
        setIpDisplay(IP);
        setCopied(true);
        timeoutRef.current = setTimeout(() => { setCopied(false); setAnimating(false); }, 2200);
        return;
      }
      setIpDisplay(scramble(IP, p));
    }, 40);
  }, [animating]);

  const titleLetters = 'JOD'.split('');

  return (
    <section
      style={{
        position: 'relative',
        height: '100vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#03050A',
      }}
    >
      {/* Aurora background */}
      <div
        style={{
          position: 'absolute',
          inset: '-5%',
          transform: `translate(${mouse.x * 22}px, ${mouse.y * 12}px)`,
          transition: 'transform 0.15s linear',
        }}
      >
        <AuroraCanvas />
      </div>

      {/* Subtle star field */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `
            radial-gradient(circle, rgba(255,255,255,0.6) 1px, transparent 1px),
            radial-gradient(circle, rgba(255,255,255,0.4) 1px, transparent 1px),
            radial-gradient(circle, rgba(255,255,255,0.3) 1px, transparent 1px)
          `,
          backgroundSize: '400px 400px, 280px 280px, 180px 180px',
          backgroundPosition: '0 0, 140px 200px, 80px 120px',
          opacity: 0.15,
          pointerEvents: 'none',
        }}
      />

      {/* Content */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: '1.75rem',
          padding: '0 2rem',
          transform: `translate(${mouse.x * 8}px, ${mouse.y * 5}px)`,
          transition: 'transform 0.2s linear',
        }}
      >
        {/* Over-label */}
        <motion.p
          initial={{ opacity: 0, y: -16, letterSpacing: '0.8em' }}
          animate={{ opacity: 1, y: 0,   letterSpacing: '0.35em' }}
          transition={{ duration: 0.9, delay: 0.2 }}
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 'clamp(0.55rem, 1.2vw, 0.72rem)',
            letterSpacing: '0.35em',
            color: 'rgba(245, 166, 35, 0.8)',
            textTransform: 'uppercase',
          }}
        >
          Private Minecraft Survival
        </motion.p>

        {/* Giant title — letter-by-letter */}
        <div style={{ display: 'flex', gap: 'clamp(0.1rem, 1vw, 0.5rem)' }}>
          {titleLetters.map((ch, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, y: 80, rotateX: -90 }}
              animate={{ opacity: 1, y: 0,  rotateX: 0   }}
              transition={{
                duration: 0.9,
                delay: 0.4 + i * 0.15,
                ease: [0.16, 1, 0.3, 1],
              }}
              style={{
                display: 'inline-block',
                fontFamily: "'Cinzel', serif",
                fontSize: 'clamp(9rem, 24vw, 24rem)',
                fontWeight: 900,
                lineHeight: 0.85,
                letterSpacing: '-0.02em',
                color: '#F0EAD6',
                textShadow: `
                  0 0 80px rgba(245,166,35,0.18),
                  0 0 160px rgba(139,92,246,0.10)
                `,
                userSelect: 'none',
              }}
            >
              {ch}
            </motion.span>
          ))}
        </div>

        {/* Divider line */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 1.0, delay: 0.9, ease: [0.16, 1, 0.3, 1] }}
          style={{
            width: 'clamp(120px, 30vw, 380px)',
            height: '1px',
            background: 'linear-gradient(to right, transparent, rgba(245,166,35,0.6), transparent)',
            transformOrigin: 'center',
          }}
        />

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0  }}
          transition={{ duration: 0.7, delay: 1.0 }}
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 'clamp(0.7rem, 1.6vw, 0.95rem)',
            letterSpacing: '0.22em',
            color: 'rgba(240, 234, 214, 0.45)',
            textTransform: 'uppercase',
            fontWeight: 300,
          }}
        >
          Custom Datapacks&nbsp;&nbsp;·&nbsp;&nbsp;Resource Pack&nbsp;&nbsp;·&nbsp;&nbsp;Since 2024
        </motion.p>

        {/* Magnetic IP button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0  }}
          transition={{ duration: 0.7, delay: 1.2 }}
          style={{ position: 'relative', paddingTop: '0.5rem' }}
          onMouseMove={handleMagMove}
          onMouseLeave={handleMagLeave}
        >
          <motion.div
            ref={btnRef}
            animate={{ x: magOffset.x, y: magOffset.y }}
            transition={{ type: 'spring', stiffness: 220, damping: 18, mass: 0.8 }}
          >
            <button
              onClick={handleCopy}
              data-cursor="hover"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                background: copied
                  ? 'rgba(245, 166, 35, 0.12)'
                  : 'rgba(8, 14, 28, 0.7)',
                border: `1px solid ${copied ? 'rgba(245,166,35,0.7)' : 'rgba(255,255,255,0.12)'}`,
                backdropFilter: 'blur(12px)',
                padding: '1rem 2rem',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 'clamp(0.75rem, 1.8vw, 0.9rem)',
                letterSpacing: '0.12em',
                color: copied ? '#F5A623' : '#F0EAD6',
                transition: 'border-color 0.4s ease, color 0.4s ease, background 0.4s ease, box-shadow 0.4s ease',
                boxShadow: copied
                  ? '0 0 40px rgba(245,166,35,0.25), 0 0 80px rgba(245,166,35,0.10)'
                  : '0 8px 32px rgba(0,0,0,0.4)',
                minWidth: '320px',
                justifyContent: 'space-between',
              }}
              onMouseEnter={e => {
                if (!copied) {
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(245,166,35,0.45)';
                  (e.currentTarget as HTMLElement).style.boxShadow   = '0 0 30px rgba(245,166,35,0.15), 0 8px 32px rgba(0,0,0,0.5)';
                }
              }}
              onMouseLeave={e => {
                if (!copied) {
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.12)';
                  (e.currentTarget as HTMLElement).style.boxShadow   = '0 8px 32px rgba(0,0,0,0.4)';
                }
              }}
            >
              <span style={{ color: 'rgba(245,166,35,0.6)', fontWeight: 400 }}>⌘</span>
              <span style={{ flex: 1, textAlign: 'left', letterSpacing: '0.1em', fontVariantNumeric: 'tabular-nums' }}>
                {copied ? 'COPIED  ✓' : ipDisplay}
              </span>
              <span className="cursor-blink" style={{ color: 'rgba(245,166,35,0.6)', opacity: copied ? 0 : 1 }}>│</span>
            </button>
          </motion.div>

          <p style={{
            marginTop: '0.6rem',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '0.55rem',
            letterSpacing: '0.18em',
            color: 'rgba(255,255,255,0.2)',
            textTransform: 'uppercase',
            textAlign: 'center',
          }}>
            click to copy · minecraft java edition
          </p>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.8, duration: 0.8 }}
        className="chevron-bounce"
        style={{
          position: 'absolute',
          bottom: '2.5rem',
          left: '50%',
          zIndex: 2,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0.35rem',
        }}
      >
        <span style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '0.5rem',
          letterSpacing: '0.35em',
          color: 'rgba(255,255,255,0.25)',
          textTransform: 'uppercase',
        }}>
          SCROLL
        </span>
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ color: 'rgba(245,166,35,0.5)' }}>
          <path d="M4 7L10 13L16 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </motion.div>

      {/* Bottom fade */}
      <div style={{
        position: 'absolute',
        bottom: 0, left: 0, right: 0,
        height: '120px',
        background: 'linear-gradient(to top, #03050A, transparent)',
        pointerEvents: 'none',
        zIndex: 1,
      }} />
    </section>
  );
}

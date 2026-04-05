'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import ParticleCanvas from './ParticleCanvas';

const IP = 'play.jodcraft.world';
const SCRAMBLE_CHARS = '!<>-_\\/[]{}—=+*^?#@$%&';

function scrambleText(target: string, progress: number, chars: string): string {
  return target
    .split('')
    .map((char, i) => {
      if (i < Math.floor(target.length * progress)) return char;
      return chars[Math.floor(Math.random() * chars.length)];
    })
    .join('');
}

export default function HeroSection() {
  const [ipDisplay,   setIpDisplay]   = useState(IP);
  const [copied,      setCopied]      = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [magOffset,   setMagOffset]   = useState({ x: 0, y: 0 });
  const [mouse,       setMouse]       = useState({ x: 0, y: 0 });

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef  = useRef<ReturnType<typeof setTimeout>  | null>(null);
  const btnWrapRef  = useRef<HTMLDivElement>(null);

  /* ── Mouse parallax ────────────────────────────────────────── */
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

  /* ── Magnetic button ───────────────────────────────────────── */
  const handleMagMove = useCallback((e: React.MouseEvent) => {
    if (!btnWrapRef.current) return;
    const rect = btnWrapRef.current.getBoundingClientRect();
    const cx   = rect.left + rect.width  / 2;
    const cy   = rect.top  + rect.height / 2;
    const dx   = e.clientX - cx;
    const dy   = e.clientY - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const max  = 80;
    if (dist < max) {
      const s = (max - dist) / max;
      setMagOffset({ x: dx * s * 0.45, y: dy * s * 0.45 });
    } else {
      setMagOffset({ x: 0, y: 0 });
    }
  }, []);
  const handleMagLeave = useCallback(() => setMagOffset({ x: 0, y: 0 }), []);

  /* ── IP copy ────────────────────────────────────────────────── */
  const handleCopy = useCallback(async () => {
    if (isAnimating) return;
    setIsAnimating(true);
    await navigator.clipboard.writeText(IP).catch(() => {});
    const startTime = Date.now();
    const duration  = 800;
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      const elapsed  = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      if (progress >= 1) {
        clearInterval(intervalRef.current!);
        setIpDisplay(IP);
        setCopied(true);
        timeoutRef.current = setTimeout(() => {
          setCopied(false);
          setIsAnimating(false);
        }, 2000);
        return;
      }
      setIpDisplay(scrambleText(IP, progress, SCRAMBLE_CHARS));
    }, 40);
  }, [isAnimating]);

  /* ── Render ─────────────────────────────────────────────────── */
  return (
    <section
      id="hero"
      style={{
        position:       'relative',
        height:         '100vh',
        overflow:       'hidden',
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        justifyContent: 'center',
        background:     '#080808',
      }}
    >
      {/* Particle layer — subtle parallax */}
      <div
        style={{
          position:   'absolute',
          inset:      '-5%',
          transform:  `translate(${mouse.x * 22}px, ${mouse.y * 12}px)`,
          transition: 'transform 0.12s linear',
          zIndex:     0,
        }}
      >
        <ParticleCanvas />
      </div>

      {/* CRT scanlines */}
      <div className="scanlines" style={{ zIndex: 1 }} />

      {/* Radial vignette */}
      <div
        style={{
          position:      'absolute',
          inset:         0,
          background:    'radial-gradient(ellipse at center, transparent 40%, #080808 100%)',
          pointerEvents: 'none',
          zIndex:        2,
        }}
      />

      {/* Content */}
      <div
        style={{
          position:      'relative',
          zIndex:        4,
          display:       'flex',
          flexDirection: 'column',
          alignItems:    'center',
          textAlign:     'center',
          gap:           '2rem',
          padding:       '0 1.5rem',
          transform:     `translate(${mouse.x * 7}px, ${mouse.y * 4}px)`,
          transition:    'transform 0.18s linear',
        }}
      >
        {/* Server label */}
        <motion.p
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          style={{
            fontFamily:    "'JetBrains Mono', monospace",
            fontSize:      '0.7rem',
            letterSpacing: '0.35em',
            color:         '#00ff41',
            textTransform: 'uppercase',
          }}
        >
          PRIVATE MINECRAFT SERVER
        </motion.p>

        {/* Giant title — letter-by-letter stagger */}
        <div style={{ position: 'relative' }}>
          <div
            style={{
              display:    'flex',
              gap:        'clamp(0.05rem, 0.4vw, 0.25rem)',
              transform:  `translate(${mouse.x * -3}px, ${mouse.y * -1.5}px)`,
              transition: 'transform 0.22s linear',
            }}
          >
            {['J', 'O', 'D'].map((letter, i) => (
              <motion.span
                key={letter}
                initial={{ opacity: 0, y: 70, rotateX: -50 }}
                animate={{ opacity: 1, y: 0,  rotateX: 0   }}
                transition={{
                  duration: 0.85,
                  delay:    0.35 + i * 0.14,
                  ease:     [0.16, 1, 0.3, 1],
                }}
                style={{
                  display:       'inline-block',
                  fontFamily:    "'Space Grotesk', sans-serif",
                  fontSize:      'clamp(8rem, 22vw, 22rem)',
                  fontWeight:    900,
                  lineHeight:    0.85,
                  letterSpacing: '-0.03em',
                  color:         '#f0f0f0',
                  userSelect:    'none',
                  textShadow:    '0 0 80px rgba(0,255,65,0.07)',
                }}
              >
                {letter}
              </motion.span>
            ))}
          </div>

          {/* Glitch pseudo-element overlay (transparent, just triggers animation) */}
          <span
            aria-hidden="true"
            className="glitch"
            data-text="JOD"
            style={{
              position:      'absolute',
              inset:         0,
              fontFamily:    "'Space Grotesk', sans-serif",
              fontSize:      'clamp(8rem, 22vw, 22rem)',
              fontWeight:    900,
              lineHeight:    0.85,
              letterSpacing: '-0.03em',
              color:         'transparent',
              userSelect:    'none',
              pointerEvents: 'none',
            }}
          />
        </div>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0  }}
          transition={{ duration: 0.6, delay: 0.77 }}
          style={{
            fontFamily:    "'JetBrains Mono', monospace",
            fontSize:      'clamp(0.65rem, 1.5vw, 0.85rem)',
            letterSpacing: '0.2em',
            color:         '#666666',
            textTransform: 'uppercase',
          }}
        >
          private survival&nbsp;&nbsp;·&nbsp;&nbsp;custom datapacks&nbsp;&nbsp;·&nbsp;&nbsp;resource pack
        </motion.p>

        {/* Magnetic IP terminal box */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0  }}
          transition={{ duration: 0.6, delay: 0.95 }}
          onMouseMove={handleMagMove}
          onMouseLeave={handleMagLeave}
          style={{ paddingTop: '0.5rem' }}
        >
          <motion.div
            ref={btnWrapRef}
            animate={{ x: magOffset.x, y: magOffset.y }}
            transition={{ type: 'spring', stiffness: 200, damping: 18, mass: 0.8 }}
          >
            <button
              onClick={handleCopy}
              data-cursor="hover"
              style={{
                display:        'flex',
                alignItems:     'center',
                gap:            '0.75rem',
                background:     '#111111',
                border:         `1px solid ${copied ? '#00ff41' : '#1a1a1a'}`,
                padding:        '0.875rem 1.5rem',
                fontFamily:     "'JetBrains Mono', monospace",
                fontSize:       'clamp(0.8rem, 2vw, 1rem)',
                color:          copied ? '#00ff41' : '#f0f0f0',
                letterSpacing:  '0.08em',
                transition:     'border-color 0.3s ease, color 0.3s ease, box-shadow 0.3s ease',
                boxShadow:      copied
                  ? '0 0 24px rgba(0,255,65,0.25), inset 0 0 24px rgba(0,255,65,0.05)'
                  : '0 0 0 transparent',
                minWidth:       '280px',
                justifyContent: 'space-between',
              }}
              onMouseEnter={e => {
                if (!copied) {
                  const el = e.currentTarget;
                  el.style.borderColor = '#333';
                  el.style.boxShadow   = '0 0 20px rgba(0,255,65,0.12)';
                }
              }}
              onMouseLeave={e => {
                if (!copied) {
                  const el = e.currentTarget;
                  el.style.borderColor = '#1a1a1a';
                  el.style.boxShadow   = '0 0 0 transparent';
                }
              }}
            >
              <span style={{ color: '#00ff41', marginRight: '0.25rem' }}>$</span>
              <span style={{ flex: 1, textAlign: 'left', fontVariantNumeric: 'tabular-nums', letterSpacing: '0.12em' }}>
                {copied ? 'COPIED ✓' : ipDisplay}
              </span>
              <span className="cursor-blink" style={{ color: '#00ff41', fontSize: '1.1em', opacity: copied ? 0 : 1 }}>
                █
              </span>
            </button>

            <p style={{
              marginTop:     '0.5rem',
              fontFamily:    "'JetBrains Mono', monospace",
              fontSize:      '0.6rem',
              letterSpacing: '0.15em',
              color:         '#444',
              textTransform: 'uppercase',
              textAlign:     'center',
            }}>
              click to copy
            </p>
          </motion.div>
        </motion.div>
      </div>

      {/* Scroll chevron */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 0.6 }}
        style={{
          position:      'absolute',
          bottom:        '2rem',
          left:          '50%',
          transform:     'translateX(-50%)',
          zIndex:        4,
          display:       'flex',
          flexDirection: 'column',
          alignItems:    'center',
          gap:           '0.25rem',
        }}
      >
        <span
          className="animate-chevron-bounce"
          style={{
            fontFamily:    "'JetBrains Mono', monospace",
            fontSize:      '0.55rem',
            letterSpacing: '0.3em',
            color:         '#333',
            textTransform: 'uppercase',
            display:       'block',
            marginBottom:  '0.25rem',
          }}
        >
          SCROLL
        </span>
        <svg
          className="animate-chevron-bounce"
          width="18" height="18" viewBox="0 0 18 18" fill="none"
          style={{ color: '#444' }}
        >
          <path d="M3 6L9 12L15 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square"/>
        </svg>
      </motion.div>

      {/* Bottom border line — faint green gradient */}
      <div
        style={{
          position:  'absolute',
          bottom:    0, left: 0, right: 0,
          height:    '1px',
          background: 'linear-gradient(to right, transparent, rgba(0,255,65,0.35) 30%, rgba(0,255,65,0.35) 70%, transparent)',
          zIndex:    4,
        }}
      />
    </section>
  );
}

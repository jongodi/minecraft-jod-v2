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
        background:     '#06080c',
      }}
    >
      {/* Particle layer */}
      <div
        style={{
          position:   'absolute',
          inset:      '-5%',
          transform:  `translate(${mouse.x * 20}px, ${mouse.y * 10}px)`,
          transition: 'transform 0.12s linear',
          zIndex:     0,
        }}
      >
        <ParticleCanvas />
      </div>

      {/* CRT scanlines */}
      <div className="scanlines" style={{ zIndex: 1 }} />

      {/* Vignette */}
      <div
        style={{
          position:      'absolute',
          inset:         0,
          background:    'radial-gradient(ellipse at center, transparent 35%, #06080c 95%)',
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
          gap:           '1.75rem',
          padding:       '0 1.5rem',
          transform:     `translate(${mouse.x * 6}px, ${mouse.y * 3}px)`,
          transition:    'transform 0.2s linear',
        }}
      >
        {/* Label */}
        <motion.p
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          style={{
            fontFamily:    "'JetBrains Mono', monospace",
            fontSize:      '0.62rem',
            letterSpacing: '0.38em',
            color:         '#00ff41',
            textTransform: 'uppercase',
          }}
        >
          PRIVATE MINECRAFT SERVER
        </motion.p>

        {/* Title — letter stagger */}
        <div style={{ position: 'relative' }}>
          <div
            style={{
              display:    'flex',
              gap:        'clamp(0.05rem, 0.4vw, 0.25rem)',
              transform:  `translate(${mouse.x * -2.5}px, ${mouse.y * -1.2}px)`,
              transition: 'transform 0.24s linear',
            }}
          >
            {['J', 'O', 'D'].map((letter, i) => (
              <motion.span
                key={letter}
                initial={{ opacity: 0, y: 60, rotateX: -45 }}
                animate={{ opacity: 1, y: 0,  rotateX: 0   }}
                transition={{
                  duration: 0.9,
                  delay:    0.3 + i * 0.13,
                  ease:     [0.16, 1, 0.3, 1],
                }}
                style={{
                  display:       'inline-block',
                  fontFamily:    "'Space Grotesk', sans-serif",
                  fontSize:      'clamp(8rem, 22vw, 22rem)',
                  fontWeight:    900,
                  lineHeight:    0.85,
                  letterSpacing: '-0.03em',
                  color:         '#dde1ec',
                  userSelect:    'none',
                  textShadow:    '0 0 120px rgba(0,255,65,0.05)',
                }}
              >
                {letter}
              </motion.span>
            ))}
          </div>

          {/* Glitch overlay */}
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
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0  }}
          transition={{ duration: 0.6, delay: 0.72 }}
          style={{
            fontFamily:    "'JetBrains Mono', monospace",
            fontSize:      'clamp(0.6rem, 1.4vw, 0.78rem)',
            letterSpacing: '0.22em',
            color:         '#505770',
            textTransform: 'uppercase',
          }}
        >
          private survival&nbsp;&nbsp;·&nbsp;&nbsp;custom datapacks&nbsp;&nbsp;·&nbsp;&nbsp;resource pack
        </motion.p>

        {/* IP copy terminal */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0  }}
          transition={{ duration: 0.6, delay: 0.9 }}
          onMouseMove={handleMagMove}
          onMouseLeave={handleMagLeave}
          style={{ paddingTop: '0.25rem' }}
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
                background:     '#0d1018',
                border:         `1px solid ${copied ? '#00ff41' : '#1c2030'}`,
                padding:        '0.85rem 1.5rem',
                fontFamily:     "'JetBrains Mono', monospace",
                fontSize:       'clamp(0.75rem, 1.8vw, 0.95rem)',
                color:          copied ? '#00ff41' : '#dde1ec',
                letterSpacing:  '0.1em',
                transition:     'border-color 0.3s ease, color 0.3s ease, box-shadow 0.3s ease',
                boxShadow:      copied
                  ? '0 0 28px rgba(0,255,65,0.2), inset 0 0 20px rgba(0,255,65,0.04)'
                  : '0 0 0 transparent',
                minWidth:       '290px',
                justifyContent: 'space-between',
              }}
              onMouseEnter={e => {
                if (!copied) {
                  e.currentTarget.style.borderColor = '#2a3045';
                  e.currentTarget.style.boxShadow   = '0 0 20px rgba(0,255,65,0.1)';
                }
              }}
              onMouseLeave={e => {
                if (!copied) {
                  e.currentTarget.style.borderColor = '#1c2030';
                  e.currentTarget.style.boxShadow   = '0 0 0 transparent';
                }
              }}
            >
              <span style={{ color: '#00ff41', marginRight: '0.2rem', opacity: 0.8 }}>$</span>
              <span style={{ flex: 1, textAlign: 'left', fontVariantNumeric: 'tabular-nums', letterSpacing: '0.12em' }}>
                {copied ? 'COPIED ✓' : ipDisplay}
              </span>
              <span className="cursor-blink" style={{ color: '#00ff41', fontSize: '1em', opacity: copied ? 0 : 0.7 }}>
                █
              </span>
            </button>

            <p style={{
              marginTop:     '0.5rem',
              fontFamily:    "'JetBrains Mono', monospace",
              fontSize:      '0.52rem',
              letterSpacing: '0.15em',
              color:         '#1e2230',
              textTransform: 'uppercase',
              textAlign:     'center',
            }}>
              click to copy
            </p>
          </motion.div>
        </motion.div>
      </div>

      {/* Scroll hint */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.6, duration: 0.7 }}
        style={{
          position:      'absolute',
          bottom:        '2rem',
          left:          '50%',
          transform:     'translateX(-50%)',
          zIndex:        4,
          display:       'flex',
          flexDirection: 'column',
          alignItems:    'center',
          gap:           '0.3rem',
        }}
      >
        <span
          style={{
            fontFamily:    "'JetBrains Mono', monospace",
            fontSize:      '0.5rem',
            letterSpacing: '0.32em',
            color:         '#1e2230',
            textTransform: 'uppercase',
            display:       'block',
          }}
        >
          SCROLL
        </span>
        <svg
          width="16" height="16" viewBox="0 0 16 16" fill="none"
          style={{ color: '#1e2230' }}
        >
          <path d="M2 5L8 11L14 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square"/>
        </svg>
      </motion.div>

      {/* Bottom gradient line */}
      <div
        style={{
          position:   'absolute',
          bottom:     0, left: 0, right: 0,
          height:     '1px',
          background: 'linear-gradient(to right, transparent, rgba(0,255,65,0.3) 25%, rgba(0,255,65,0.3) 75%, transparent)',
          zIndex:     4,
        }}
      />
    </section>
  );
}

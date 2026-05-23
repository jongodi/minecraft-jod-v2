'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

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
  const [imgLoaded,   setImgLoaded]   = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef  = useRef<ReturnType<typeof setTimeout>  | null>(null);
  const btnWrapRef  = useRef<HTMLDivElement>(null);
  const imgRef      = useRef<HTMLImageElement>(null);

  useEffect(() => {
    // Handle cached images: onLoad won't fire if already complete
    if (imgRef.current?.complete) setImgLoaded(true);
  }, []);

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
        position:   'relative',
        height:     '100vh',
        overflow:   'hidden',
        background: '#06080c',
      }}
    >
      {/* Full-bleed background screenshot */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imgRef}
        src="/screenshots/the-castle.png"
        alt=""
        aria-hidden="true"
        onLoad={() => setImgLoaded(true)}
        style={{
          position:       'absolute',
          top:            '-6%',
          left:           '-5%',
          width:          '110%',
          height:         '112%',
          objectFit:      'cover',
          objectPosition: 'center 40%',
          opacity:        imgLoaded ? 0.8 : 0,
          transform:      `translate(${mouse.x * -8}px, ${mouse.y * -8}px)`,
          transition:     imgLoaded ? 'opacity 1.2s ease' : 'none',
          pointerEvents:  'none',
        }}
      />

      {/* Bottom-heavy cinematic gradient */}
      <div style={{
        position:      'absolute',
        inset:         0,
        background:    'linear-gradient(to top, #06080c 0%, rgba(6,8,12,0.88) 18%, rgba(6,8,12,0.45) 50%, rgba(6,8,12,0.25) 100%)',
        pointerEvents: 'none',
        zIndex:        1,
      }} />

      {/* Left vignette */}
      <div style={{
        position:      'absolute',
        inset:         0,
        background:    'linear-gradient(to right, rgba(6,8,12,0.8) 0%, rgba(6,8,12,0.25) 55%, transparent 100%)',
        pointerEvents: 'none',
        zIndex:        1,
      }} />

      {/* CRT scanlines */}
      <div className="scanlines" style={{ zIndex: 2 }} />

      {/* Bottom fade into next section */}
      <div style={{
        position:      'absolute',
        bottom:        0, left: 0, right: 0,
        height:        '28vh',
        background:    'linear-gradient(to top, #06080c 0%, transparent 100%)',
        pointerEvents: 'none',
        zIndex:        2,
      }} />

      {/* Content — anchored bottom-left */}
      <div
        style={{
          position:  'absolute',
          bottom:    'clamp(3rem, 8vh, 7rem)',
          left:      'clamp(1.5rem, 6vw, 5rem)',
          right:     'clamp(1.5rem, 6vw, 5rem)',
          zIndex:    4,
          transform: `translate(${mouse.x * 5}px, ${mouse.y * 2.5}px)`,
          transition:'transform 0.2s linear',
        }}
      >
        {/* Label */}
        <motion.p
          initial={{ opacity: 0, x: -18 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          style={{
            fontFamily:    "'JetBrains Mono', monospace",
            fontSize:      '0.62rem',
            letterSpacing: '0.38em',
            color:         '#00ff41',
            textTransform: 'uppercase',
            marginBottom:  '1.25rem',
          }}
        >
          PRIVATE MINECRAFT SERVER — JAVA EDITION
        </motion.p>

        {/* Title — letter stagger */}
        <div style={{ overflow: 'visible', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', gap: 'clamp(0rem, 0.3vw, 0.2rem)' }}>
            {['J', 'O', 'D'].map((letter, i) => (
              <motion.span
                key={letter}
                initial={{ opacity: 0, y: 80, rotateX: -40 }}
                animate={{ opacity: 1, y: 0,  rotateX: 0   }}
                transition={{
                  duration: 0.95,
                  delay:    0.35 + i * 0.12,
                  ease:     [0.16, 1, 0.3, 1],
                }}
                style={{
                  display:       'inline-block',
                  fontFamily:    "'Space Grotesk', sans-serif",
                  fontSize:      'clamp(7rem, 20vw, 20rem)',
                  fontWeight:    900,
                  lineHeight:    0.85,
                  letterSpacing: '-0.04em',
                  color:         '#ffffff',
                  userSelect:    'none',
                  textShadow:    '0 8px 60px rgba(0,0,0,0.9), 0 2px 8px rgba(0,0,0,0.8)',
                }}
              >
                {letter}
              </motion.span>
            ))}
          </div>
        </div>

        {/* Bottom row: tagline + IP terminal */}
        <div style={{
          display:    'flex',
          alignItems: 'flex-end',
          gap:        'clamp(1.5rem, 5vw, 4rem)',
          flexWrap:   'wrap',
        }}>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.9 }}
            style={{
              fontFamily:    "'JetBrains Mono', monospace",
              fontSize:      'clamp(0.55rem, 1.15vw, 0.68rem)',
              letterSpacing: '0.2em',
              color:         'rgba(221,225,236,0.4)',
              textTransform: 'uppercase',
              lineHeight:    1.9,
            }}
          >
            private survival<br />
            custom datapacks · resource pack
          </motion.p>

          {/* IP copy terminal */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.05 }}
            onMouseMove={handleMagMove}
            onMouseLeave={handleMagLeave}
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
                  background:     'rgba(6,8,12,0.65)',
                  border:         `1px solid ${copied ? '#00ff41' : 'rgba(255,255,255,0.2)'}`,
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  padding:        '0.85rem 1.5rem',
                  fontFamily:     "'JetBrains Mono', monospace",
                  fontSize:       'clamp(0.72rem, 1.6vw, 0.9rem)',
                  color:          copied ? '#00ff41' : '#dde1ec',
                  letterSpacing:  '0.1em',
                  transition:     'border-color 0.3s ease, color 0.3s ease, box-shadow 0.3s ease',
                  boxShadow:      copied
                    ? '0 0 28px rgba(0,255,65,0.25), inset 0 0 20px rgba(0,255,65,0.04)'
                    : '0 0 0 transparent',
                  minWidth:       '280px',
                  justifyContent: 'space-between',
                }}
                onMouseEnter={e => {
                  if (!copied) {
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.45)';
                    e.currentTarget.style.boxShadow   = '0 0 20px rgba(0,255,65,0.1)';
                  }
                }}
                onMouseLeave={e => {
                  if (!copied) {
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
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
                fontSize:      '0.48rem',
                letterSpacing: '0.15em',
                color:         'rgba(255,255,255,0.18)',
                textTransform: 'uppercase',
              }}>
                click to copy server address
              </p>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Scroll hint — bottom right */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.8, duration: 0.7 }}
        style={{
          position:      'absolute',
          bottom:        '2.25rem',
          right:         'clamp(1.5rem, 6vw, 5rem)',
          zIndex:        4,
          display:       'flex',
          flexDirection: 'column',
          alignItems:    'flex-end',
          gap:           '0.35rem',
        }}
      >
        <span style={{
          fontFamily:    "'JetBrains Mono', monospace",
          fontSize:      '0.48rem',
          letterSpacing: '0.32em',
          color:         'rgba(255,255,255,0.22)',
          textTransform: 'uppercase',
        }}>
          SCROLL
        </span>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ color: 'rgba(255,255,255,0.22)' }}>
          <path d="M2 5L8 11L14 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square"/>
        </svg>
      </motion.div>
    </section>
  );
}

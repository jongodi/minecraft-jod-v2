'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';

const SERVER_IP      = 'play.jodcraft.world';
const SCRAMBLE_CHARS = '!<>-_\\/[]{}—=+*^?#@$%&ABCDEFabcdef0123456789';

export default function JoinSection() {
  const [copied,      setCopied]      = useState(false);
  const [btnText,     setBtnText]     = useState('COPY IP');
  const [isAnimating, setIsAnimating] = useState(false);
  const [magOffset,   setMagOffset]   = useState({ x: 0, y: 0 });
  const [glitching,   setGlitching]   = useState(false);
  const [imgLoaded,   setImgLoaded]   = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef  = useRef<ReturnType<typeof setTimeout>  | null>(null);
  const glitchTimer = useRef<ReturnType<typeof setTimeout>  | null>(null);
  const btnAreaRef  = useRef<HTMLDivElement>(null);
  const imgRef      = useRef<HTMLImageElement>(null);

  useEffect(() => {
    // Handle cached images: onLoad won't fire if already complete
    if (imgRef.current?.complete) setImgLoaded(true);
  }, []);

  useEffect(() => {
    const scheduleGlitch = () => {
      const delay = 4500 + Math.random() * 5500;
      glitchTimer.current = setTimeout(() => {
        setGlitching(true);
        setTimeout(() => {
          setGlitching(false);
          scheduleGlitch();
        }, 320);
      }, delay);
    };
    scheduleGlitch();
    return () => { if (glitchTimer.current) clearTimeout(glitchTimer.current); };
  }, []);

  const handleMagMove = useCallback((e: React.MouseEvent) => {
    if (!btnAreaRef.current) return;
    const rect = btnAreaRef.current.getBoundingClientRect();
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

  const handleCopy = useCallback(() => {
    if (isAnimating) return;
    setIsAnimating(true);
    navigator.clipboard.writeText(SERVER_IP).catch(() => {});
    const start = Date.now();
    const dur   = 700;
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      const p = Math.min((Date.now() - start) / dur, 1);
      if (p >= 1) {
        clearInterval(intervalRef.current!);
        setCopied(true);
        setBtnText('COPIED ✓');
        timeoutRef.current = setTimeout(() => {
          setCopied(false);
          setBtnText('COPY IP');
          setIsAnimating(false);
        }, 2200);
        return;
      }
      setBtnText(
        'COPY IP'.split('').map((ch, i) => {
          if (ch === ' ') return ' ';
          if (i < Math.floor('COPY IP'.length * p)) return ch;
          return SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
        }).join('')
      );
    }, 40);
  }, [isAnimating]);

  return (
    <section
      style={{
        minHeight:  '100vh',
        display:    'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding:    'clamp(5rem, 12vw, 9rem) clamp(1.5rem, 6vw, 5rem)',
        background: '#040508',
        position:   'relative',
        overflow:   'hidden',
        textAlign:  'center',
      }}
    >
      {/* Full-bleed night sky background */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imgRef}
        src="/screenshots/the-castle.png"
        alt=""
        aria-hidden="true"
        onLoad={() => setImgLoaded(true)}
        style={{
          position:       'absolute',
          inset:          0,
          width:          '100%',
          height:         '100%',
          objectFit:      'cover',
          objectPosition: 'center',
          opacity:        imgLoaded ? 0.52 : 0,
          transition:     'opacity 1.4s ease',
          pointerEvents:  'none',
        }}
      />

      {/* Radial vignette — darker at edges */}
      <div style={{
        position:      'absolute',
        inset:         0,
        background:    'radial-gradient(ellipse 80% 70% at 50% 50%, rgba(4,5,8,0.45) 0%, rgba(4,5,8,0.88) 100%)',
        pointerEvents: 'none',
        zIndex:        1,
      }} />

      {/* Top and bottom fades */}
      <div style={{
        position:      'absolute',
        top:           0, left: 0, right: 0,
        height:        '25%',
        background:    'linear-gradient(to bottom, #040508 0%, transparent 100%)',
        pointerEvents: 'none',
        zIndex:        1,
      }} />
      <div style={{
        position:      'absolute',
        bottom:        0, left: 0, right: 0,
        height:        '25%',
        background:    'linear-gradient(to top, #040508 0%, transparent 100%)',
        pointerEvents: 'none',
        zIndex:        1,
      }} />

      {/* Section label */}
      <motion.p
        initial={{ opacity: 0, y: -10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="section-label"
        style={{ position: 'relative', zIndex: 2 }}
      >
        06 — JOIN
      </motion.p>

      {/* Billboard IP address */}
      <motion.div
        initial={{ opacity: 0, scale: 0.94 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        style={{ position: 'relative', zIndex: 2, marginTop: '0.75rem' }}
      >
        <button
          onClick={handleCopy}
          data-cursor="hover"
          style={{
            background:  'transparent',
            border:      'none',
            padding:     0,
            display:     'block',
          }}
        >
          <motion.h2
            animate={{
              color:      copied ? '#00ff41' : '#ffffff',
              textShadow: copied
                ? '0 0 80px rgba(0,255,65,0.5), 0 0 160px rgba(0,255,65,0.2)'
                : '0 4px 60px rgba(0,0,0,0.8), 0 0 80px rgba(255,255,255,0.04)',
            }}
            transition={{ duration: 0.4 }}
            className={glitching ? 'glitch' : ''}
            data-text={SERVER_IP}
            style={{
              fontFamily:    "'Space Grotesk', sans-serif",
              fontSize:      'clamp(2rem, 9vw, 10rem)',
              fontWeight:    900,
              letterSpacing: '-0.04em',
              lineHeight:    0.9,
              userSelect:    'none',
            }}
          >
            {SERVER_IP}
          </motion.h2>
        </button>
      </motion.div>

      {/* Sub-label */}
      <motion.p
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.3 }}
        style={{
          marginTop:     '1.75rem',
          fontFamily:    "'JetBrains Mono', monospace",
          fontSize:      '0.65rem',
          color:         '#505770',
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          position:      'relative',
          zIndex:        2,
        }}
      >
        MINECRAFT JAVA EDITION
      </motion.p>

      {/* Magnetic copy button */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.44 }}
        style={{ marginTop: '3rem', position: 'relative', zIndex: 2 }}
        onMouseMove={handleMagMove}
        onMouseLeave={handleMagLeave}
      >
        <motion.div
          ref={btnAreaRef}
          animate={{ x: magOffset.x, y: magOffset.y }}
          transition={{ type: 'spring', stiffness: 200, damping: 18, mass: 0.8 }}
        >
          <button
            onClick={handleCopy}
            data-cursor="hover"
            className="btn-fill"
            style={{
              fontFamily:    "'JetBrains Mono', monospace",
              fontSize:      '0.72rem',
              letterSpacing: '0.28em',
              color:         copied ? '#040508' : '#00ff41',
              border:        '1px solid #00ff41',
              padding:       '0.9rem 2.5rem',
              background:    copied ? '#00ff41' : 'transparent',
              transition:    'background 0.3s ease, color 0.3s ease',
              minWidth:      '180px',
            }}
          >
            <span style={{ fontVariantNumeric: 'tabular-nums' }}>{btnText}</span>
          </button>
        </motion.div>
      </motion.div>

      {/* Whitelist note */}
      <motion.p
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.6 }}
        style={{
          marginTop:     '2.25rem',
          fontFamily:    "'JetBrains Mono', monospace",
          fontSize:      '0.5rem',
          color:         '#1e2230',
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          position:      'relative',
          zIndex:        2,
        }}
      >
        ◆ WHITELIST REQUIRED · INVITE ONLY ◆
      </motion.p>
    </section>
  );
}

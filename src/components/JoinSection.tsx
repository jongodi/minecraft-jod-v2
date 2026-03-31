'use client';

import { useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';

const SERVER_IP    = 'play.jodcraft.world';
const SCRAMBLE_CH  = '!<>-_\\/[]{}—=+*^?#@$%&ABCDEFabcdef0123456789';

export default function JoinSection() {
  const [copied,     setCopied]     = useState(false);
  const [btnText,    setBtnText]    = useState('COPY IP');
  const [animating,  setAnimating]  = useState(false);
  const [magOffset,  setMagOffset]  = useState({ x: 0, y: 0 });

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef  = useRef<ReturnType<typeof setTimeout>  | null>(null);
  const btnAreaRef  = useRef<HTMLDivElement>(null);

  const handleCopy = useCallback(() => {
    if (animating) return;
    setAnimating(true);
    navigator.clipboard.writeText(SERVER_IP).catch(() => {});

    const start = Date.now();
    const dur   = 700;
    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(() => {
      const p = Math.min((Date.now() - start) / dur, 1);
      if (p >= 1) {
        clearInterval(intervalRef.current!);
        setCopied(true);
        setBtnText('COPIED  ✓');
        timeoutRef.current = setTimeout(() => {
          setCopied(false);
          setBtnText('COPY IP');
          setAnimating(false);
        }, 2400);
        return;
      }
      setBtnText(
        'COPY IP'
          .split('')
          .map((ch, i) => {
            if (ch === ' ') return ' ';
            if (i < Math.floor('COPY IP'.length * p)) return ch;
            return SCRAMBLE_CH[Math.floor(Math.random() * SCRAMBLE_CH.length)];
          })
          .join('')
      );
    }, 40);
  }, [animating]);

  const handleMagMove = useCallback((e: React.MouseEvent) => {
    if (!btnAreaRef.current) return;
    const rect = btnAreaRef.current.getBoundingClientRect();
    const cx   = rect.left + rect.width  / 2;
    const cy   = rect.top  + rect.height / 2;
    const dx   = e.clientX - cx;
    const dy   = e.clientY - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const max  = 100;
    if (dist < max) {
      const s = (max - dist) / max;
      setMagOffset({ x: dx * s * 0.5, y: dy * s * 0.5 });
    } else {
      setMagOffset({ x: 0, y: 0 });
    }
  }, []);

  const handleMagLeave = useCallback(() => setMagOffset({ x: 0, y: 0 }), []);

  return (
    <section
      style={{
        minHeight:      '85vh',
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        justifyContent: 'center',
        padding:        'clamp(5rem, 12vw, 10rem) clamp(1.5rem, 6vw, 5rem)',
        background:     '#03050A',
        position:       'relative',
        overflow:       'hidden',
        textAlign:      'center',
      }}
    >
      {/* Aurora glow blobs */}
      <div
        style={{
          position:      'absolute',
          top:           '50%',
          left:          '50%',
          transform:     'translate(-50%, -50%)',
          width:         '90vw',
          height:        '90vh',
          background:    `
            radial-gradient(ellipse 60% 40% at 35% 50%, rgba(245,166,35,0.06) 0%, transparent 65%),
            radial-gradient(ellipse 50% 35% at 65% 45%, rgba(139,92,246,0.07) 0%, transparent 60%)
          `,
          pointerEvents: 'none',
        }}
      />

      {/* Rotating ring decoration */}
      <div
        style={{
          position:      'absolute',
          top:           '50%',
          left:          '50%',
          transform:     'translate(-50%, -50%)',
          width:         'min(60vw, 60vh)',
          height:        'min(60vw, 60vh)',
          border:        '1px solid rgba(245,166,35,0.04)',
          borderRadius:  '50%',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position:      'absolute',
          top:           '50%',
          left:          '50%',
          transform:     'translate(-50%, -50%)',
          width:         'min(80vw, 80vh)',
          height:        'min(80vw, 80vh)',
          border:        '1px solid rgba(139,92,246,0.03)',
          borderRadius:  '50%',
          pointerEvents: 'none',
        }}
      />

      {/* Section label */}
      <motion.p
        initial={{ opacity: 0, y: -12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        style={{
          fontFamily:    "'JetBrains Mono', monospace",
          fontSize:      '0.62rem',
          letterSpacing: '0.32em',
          color:         'rgba(245,166,35,0.7)',
          textTransform: 'uppercase',
          marginBottom:  '2.5rem',
          position:      'relative',
          zIndex:        1,
        }}
      >
        05 — Join
      </motion.p>

      {/* Big heading */}
      <motion.p
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.1 }}
        style={{
          fontFamily:    "'Playfair Display', serif",
          fontSize:      'clamp(0.9rem, 2vw, 1.3rem)',
          fontStyle:     'italic',
          fontWeight:    400,
          color:         'rgba(240,234,214,0.4)',
          letterSpacing: '0.08em',
          marginBottom:  '1.2rem',
          position:      'relative',
          zIndex:        1,
        }}
      >
        Enter the realm
      </motion.p>

      {/* Giant IP */}
      <motion.div
        initial={{ opacity: 0, scale: 0.88 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.9, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
        style={{ position: 'relative', zIndex: 1 }}
      >
        <button
          onClick={handleCopy}
          data-cursor="hover"
          style={{
            background:    'transparent',
            border:        'none',
            padding:       0,
            display:       'block',
          }}
        >
          <motion.h2
            animate={{
              color:      copied ? '#F5A623' : '#F0EAD6',
              textShadow: copied
                ? '0 0 80px rgba(245,166,35,0.5), 0 0 160px rgba(245,166,35,0.25)'
                : '0 0 0 transparent',
            }}
            transition={{ duration: 0.4 }}
            style={{
              fontFamily:    "'Cinzel', serif",
              fontSize:      'clamp(1.8rem, 6.5vw, 7.5rem)',
              fontWeight:    700,
              letterSpacing: '-0.02em',
              lineHeight:    0.95,
              userSelect:    'none',
            }}
          >
            play.jodcraft.world
          </motion.h2>
        </button>
      </motion.div>

      {/* Subtext */}
      <motion.p
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.4 }}
        style={{
          marginTop:     '1.2rem',
          fontFamily:    "'JetBrains Mono', monospace",
          fontSize:      '0.65rem',
          color:         'rgba(255,255,255,0.25)',
          letterSpacing: '0.25em',
          textTransform: 'uppercase',
          position:      'relative',
          zIndex:        1,
        }}
      >
        Minecraft Java Edition
      </motion.p>

      {/* Magnetic copy button */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.55 }}
        style={{ marginTop: '2.8rem', position: 'relative', zIndex: 1 }}
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
              color:         copied ? '#03050A' : '#F5A623',
              border:        '1px solid rgba(245,166,35,0.6)',
              padding:       '1rem 2.8rem',
              background:    copied ? '#F5A623' : 'transparent',
              transition:    'background 0.3s ease, color 0.3s ease',
              minWidth:      '200px',
            }}
          >
            <span style={{ fontVariantNumeric: 'tabular-nums' }}>{btnText}</span>
          </button>
        </motion.div>
      </motion.div>

      {/* Invite-only badge */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.7 }}
        style={{
          marginTop:     '2.5rem',
          position:      'relative',
          zIndex:        1,
          display:       'inline-flex',
          alignItems:    'center',
          gap:           '0.75rem',
          padding:       '0.5rem 1.2rem',
          border:        '1px solid rgba(255,255,255,0.06)',
          background:    'rgba(8,14,28,0.5)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <span
          style={{
            width:        6,
            height:       6,
            borderRadius: '50%',
            background:   'rgba(245,166,35,0.6)',
            flexShrink:   0,
          }}
        />
        <span
          style={{
            fontFamily:    "'JetBrains Mono', monospace",
            fontSize:      '0.52rem',
            color:         'rgba(255,255,255,0.25)',
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
          }}
        >
          Whitelist Required · Invite Only
        </span>
        <span
          style={{
            width:        6,
            height:       6,
            borderRadius: '50%',
            background:   'rgba(245,166,35,0.6)',
            flexShrink:   0,
          }}
        />
      </motion.div>
    </section>
  );
}

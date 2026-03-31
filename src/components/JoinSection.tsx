'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const SERVER_IP    = 'play.jodcraft.world';
const SCRAMBLE_CHARS = '!<>-_\\/[]{}—=+*^?#@$%&ABCDEFabcdef0123456789';

export default function JoinSection() {
  const [copied,     setCopied]     = useState(false);
  const [btnText,    setBtnText]    = useState('COPY IP');
  const [isAnimating,setIsAnimating]= useState(false);
  const [magOffset,  setMagOffset]  = useState({ x: 0, y: 0 });
  const [glitching,  setGlitching]  = useState(false);

  const intervalRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef   = useRef<ReturnType<typeof setTimeout>  | null>(null);
  const glitchTimer  = useRef<ReturnType<typeof setTimeout>  | null>(null);
  const btnAreaRef   = useRef<HTMLDivElement>(null);

  /* ── Occasional IP heading glitch ─────────────────────────── */
  useEffect(() => {
    const scheduleGlitch = () => {
      const delay = 4000 + Math.random() * 5000; // 4–9 s
      glitchTimer.current = setTimeout(() => {
        setGlitching(true);
        setTimeout(() => {
          setGlitching(false);
          scheduleGlitch();
        }, 350);
      }, delay);
    };
    scheduleGlitch();
    return () => { if (glitchTimer.current) clearTimeout(glitchTimer.current); };
  }, []);

  /* ── Magnetic button ───────────────────────────────────────── */
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
      setMagOffset({ x: dx * s * 0.48, y: dy * s * 0.48 });
    } else {
      setMagOffset({ x: 0, y: 0 });
    }
  }, []);
  const handleMagLeave = useCallback(() => setMagOffset({ x: 0, y: 0 }), []);

  /* ── Copy ──────────────────────────────────────────────────── */
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
        }).join(''),
      );
    }, 40);
  }, [isAnimating]);

  return (
    <section
      style={{
        minHeight:      '80vh',
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        justifyContent: 'center',
        padding:        'clamp(4rem, 10vw, 8rem) clamp(1.5rem, 6vw, 5rem)',
        background:     '#080808',
        position:       'relative',
        overflow:       'hidden',
        textAlign:      'center',
      }}
    >
      {/* Layered background glow — more dramatic */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '85vw', height: '65vh',
        background: 'radial-gradient(ellipse 70% 55% at 50% 50%, rgba(0,255,65,0.06) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', top: '50%', left: '30%',
        transform: 'translate(-50%, -60%)',
        width: '40vw', height: '40vh',
        background: 'radial-gradient(ellipse, rgba(0,255,65,0.04) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', top: '55%', left: '70%',
        transform: 'translate(-50%, -40%)',
        width: '35vw', height: '35vh',
        background: 'radial-gradient(ellipse, rgba(0,204,51,0.03) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Scanlines */}
      <div className="scanlines" style={{ zIndex: 1 }} />

      {/* Section label */}
      <motion.p
        initial={{ opacity: 0, y: -12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        style={{
          fontFamily:    "'JetBrains Mono', monospace",
          fontSize:      '0.65rem',
          letterSpacing: '0.3em',
          color:         '#00ff41',
          textTransform: 'uppercase',
          marginBottom:  '2rem',
          position:      'relative',
          zIndex:        2,
        }}
      >
        05 — JOIN
      </motion.p>

      {/* Big IP address — occasional glitch */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        style={{ position: 'relative', zIndex: 2 }}
      >
        <button
          onClick={handleCopy}
          data-cursor="hover"
          style={{ background: 'transparent', border: 'none', padding: 0, display: 'block' }}
        >
          <motion.h2
            animate={{
              color:      copied ? '#00ff41' : '#f0f0f0',
              textShadow: copied
                ? '0 0 60px rgba(0,255,65,0.5), 0 0 120px rgba(0,255,65,0.2)'
                : '0 0 0 transparent',
            }}
            transition={{ duration: 0.4 }}
            className={glitching ? 'glitch' : ''}
            data-text={SERVER_IP}
            style={{
              fontFamily:    "'Space Grotesk', sans-serif",
              fontSize:      'clamp(2rem, 8.5vw, 9rem)',
              fontWeight:    900,
              letterSpacing: '-0.04em',
              lineHeight:    0.9,
              userSelect:    'none',
              transition:    'color 0.3s ease',
            }}
          >
            {SERVER_IP}
          </motion.h2>
        </button>
      </motion.div>

      {/* Subtext */}
      <motion.p
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.3 }}
        style={{
          marginTop:     '1.5rem',
          fontFamily:    "'JetBrains Mono', monospace",
          fontSize:      '0.7rem',
          color:         '#444',
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          position:      'relative',
          zIndex:        2,
        }}
      >
        MINECRAFT JAVA EDITION
      </motion.p>

      {/* Magnetic copy button */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.45 }}
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
              fontSize:      '0.75rem',
              letterSpacing: '0.25em',
              color:         copied ? '#080808' : '#00ff41',
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

      {/* Invite-only note */}
      <motion.p
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.6 }}
        style={{
          marginTop:     '2rem',
          fontFamily:    "'JetBrains Mono', monospace",
          fontSize:      '0.55rem',
          color:         '#2a2a2a',
          letterSpacing: '0.2em',
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

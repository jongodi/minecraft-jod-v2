'use client';

import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const SERVER_IP = 'play.jodcraft.world';
const SCRAMBLE_CHARS = '!<>-_\\/[]{}—=+*^?#@$%&ABCDEFabcdef0123456789';

export default function JoinSection() {
  const [copied, setCopied] = useState(false);
  const [btnText, setBtnText] = useState('COPY IP');
  const [isAnimating, setIsAnimating] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleCopy = useCallback(() => {
    if (isAnimating) return;
    setIsAnimating(true);
    navigator.clipboard.writeText(SERVER_IP).catch(() => {});

    const startTime = Date.now();
    const duration = 700;

    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      if (progress >= 1) {
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

      // Scramble the button text during animation
      const scrambled = 'COPY IP'
        .split('')
        .map((ch, i) => {
          if (ch === ' ') return ' ';
          if (i < Math.floor('COPY IP'.length * progress)) return ch;
          return SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
        })
        .join('');
      setBtnText(scrambled);
    }, 40);
  }, [isAnimating]);

  return (
    <section
      style={{
        minHeight: '80vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'clamp(4rem, 10vw, 8rem) clamp(1.5rem, 6vw, 5rem)',
        background: '#080808',
        position: 'relative',
        overflow: 'hidden',
        textAlign: 'center',
      }}
    >
      {/* Background glow */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 'clamp(300px, 60vw, 800px)',
          height: 'clamp(200px, 40vw, 500px)',
          background: 'radial-gradient(ellipse, rgba(0,255,65,0.04) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      {/* Giant watermark text */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
          overflow: 'hidden',
        }}
      >
        <span
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 'clamp(18rem, 38vw, 58rem)',
            fontWeight: 900,
            color: 'transparent',
            WebkitTextStroke: '1px rgba(255,255,255,0.03)',
            letterSpacing: '-0.05em',
            lineHeight: 1,
            userSelect: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          JOD
        </span>
      </div>

      {/* Section label */}
      <motion.p
        initial={{ opacity: 0, y: -12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '0.65rem',
          letterSpacing: '0.3em',
          color: '#00ff41',
          textTransform: 'uppercase',
          marginBottom: '2rem',
          position: 'relative',
          zIndex: 1,
        }}
      >
        04 — JOIN
      </motion.p>

      {/* Big IP address */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        style={{ position: 'relative', zIndex: 1, padding: '1.5rem 0' }}
      >
        {/* Corner brackets */}

        {(['tl','tr','bl','br'] as const).map((pos) => (
          <motion.div
            key={pos}
            initial={{ opacity: 0, scale: 0.5 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.4 }}
            style={{
              position: 'absolute',
              width: 18,
              height: 18,
              ...(pos === 'tl' && { top: 0, left: -4,  borderTop: '1px solid rgba(0,255,65,0.5)', borderLeft: '1px solid rgba(0,255,65,0.5)' }),
              ...(pos === 'tr' && { top: 0, right: -4, borderTop: '1px solid rgba(0,255,65,0.5)', borderRight: '1px solid rgba(0,255,65,0.5)' }),
              ...(pos === 'bl' && { bottom: 0, left: -4,  borderBottom: '1px solid rgba(0,255,65,0.5)', borderLeft: '1px solid rgba(0,255,65,0.5)' }),
              ...(pos === 'br' && { bottom: 0, right: -4, borderBottom: '1px solid rgba(0,255,65,0.5)', borderRight: '1px solid rgba(0,255,65,0.5)' }),
            }}
          />
        ))}
        <button
          onClick={handleCopy}
          data-cursor="hover"
          style={{
            background: 'transparent',
            border: 'none',
            padding: 0,
            display: 'block',
          }}
        >
          <motion.h2
            animate={{
              color: copied ? '#00ff41' : '#f0f0f0',
              textShadow: copied ? '0 0 60px rgba(0,255,65,0.4)' : '0 0 0 transparent',
            }}
            transition={{ duration: 0.4 }}
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 'clamp(2rem, 9vw, 11rem)',
              fontWeight: 900,
              letterSpacing: '-0.04em',
              lineHeight: 0.9,
              userSelect: 'none',
              transition: 'color 0.3s ease',
            }}
          >
            play.jodcraft.world
          </motion.h2>
        </button>
      </motion.div>

      {/* Accent horizontal rule */}
      <motion.div
        initial={{ scaleX: 0, opacity: 0 }}
        whileInView={{ scaleX: 1, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1.2, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
        style={{
          width: 'min(700px, 90vw)',
          height: '1px',
          background: 'linear-gradient(to right, transparent, rgba(0,255,65,0.4) 30%, rgba(0,255,65,0.4) 70%, transparent)',
          transformOrigin: 'center',
          position: 'relative',
          zIndex: 1,
          marginTop: '-0.5rem',
        }}
      />

      {/* Subtext */}
      <motion.p
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.3 }}
        style={{
          marginTop: '1.5rem',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '0.7rem',
          color: '#444',
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          position: 'relative',
          zIndex: 1,
        }}
      >
        MINECRAFT JAVA EDITION
      </motion.p>

      {/* Copy button */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.45 }}
        style={{ marginTop: '3rem', position: 'relative', zIndex: 1 }}
      >
        <button
          onClick={handleCopy}
          data-cursor="hover"
          className="btn-fill"
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '0.72rem',
            letterSpacing: '0.25em',
            color: copied ? '#080808' : '#00ff41',
            border: '1px solid #00ff41',
            padding: '1rem 3.5rem',
            background: copied ? '#00ff41' : 'transparent',
            transition: 'background 0.3s ease, color 0.3s ease',
            minWidth: '180px',
          }}
        >
          <span style={{ fontVariantNumeric: 'tabular-nums' }}>{btnText}</span>
        </button>
      </motion.div>

      {/* Invite-only note */}
      <motion.p
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.6 }}
        style={{
          marginTop: '2rem',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '0.55rem',
          color: '#2a2a2a',
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          position: 'relative',
          zIndex: 1,
        }}
      >
        ◆ WHITELIST REQUIRED · INVITE ONLY ◆
      </motion.p>
    </section>
  );
}

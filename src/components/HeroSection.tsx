'use client';

import { useCallback, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import ParticleCanvas from './ParticleCanvas';

const IP = 'play.jod.cool';
const SCRAMBLE_CHARS = '!<>-_\\/[]{}—=+*^?#@$%&';

function scrambleText(
  target: string,
  progress: number,
  chars: string
): string {
  return target
    .split('')
    .map((char, i) => {
      if (i < Math.floor(target.length * progress)) return char;
      return chars[Math.floor(Math.random() * chars.length)];
    })
    .join('');
}

export default function HeroSection() {
  const [ipDisplay, setIpDisplay] = useState(IP);
  const [copied, setCopied] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleCopy = useCallback(async () => {
    if (isAnimating) return;
    setIsAnimating(true);

    await navigator.clipboard.writeText(IP).catch(() => {});

    const startTime = Date.now();
    const duration = 800;

    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
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
      style={{
        position: 'relative',
        height: '100vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#080808',
      }}
    >
      {/* Particle background */}
      <ParticleCanvas />

      {/* Gradient vignette overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(ellipse at center, transparent 40%, #080808 100%)',
          pointerEvents: 'none',
          zIndex: 1,
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
          gap: '2rem',
          padding: '0 1.5rem',
        }}
      >
        {/* Server label */}
        <motion.p
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '0.7rem',
            letterSpacing: '0.35em',
            color: '#00ff41',
            textTransform: 'uppercase',
          }}
        >
          PRIVATE MINECRAFT SERVER
        </motion.p>

        {/* Giant glitching title */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
          style={{ position: 'relative' }}
        >
          <h1
            className="glitch"
            data-text="JOD"
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 'clamp(8rem, 22vw, 22rem)',
              fontWeight: 900,
              lineHeight: 0.85,
              letterSpacing: '-0.03em',
              color: '#f0f0f0',
              userSelect: 'none',
            }}
          >
            JOD
          </h1>
        </motion.div>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7 }}
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 'clamp(0.65rem, 1.5vw, 0.85rem)',
            letterSpacing: '0.2em',
            color: '#666666',
            textTransform: 'uppercase',
          }}
        >
          private survival&nbsp;&nbsp;·&nbsp;&nbsp;custom datapacks&nbsp;&nbsp;·&nbsp;&nbsp;resource pack
        </motion.p>

        {/* IP Terminal box */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.9 }}
        >
          <button
            onClick={handleCopy}
            data-cursor="hover"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              background: '#111111',
              border: `1px solid ${copied ? '#00ff41' : '#1a1a1a'}`,
              padding: '0.875rem 1.5rem',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 'clamp(0.8rem, 2vw, 1rem)',
              color: copied ? '#00ff41' : '#f0f0f0',
              letterSpacing: '0.08em',
              transition: 'border-color 0.3s ease, color 0.3s ease, box-shadow 0.3s ease',
              boxShadow: copied
                ? '0 0 24px rgba(0,255,65,0.25), inset 0 0 24px rgba(0,255,65,0.05)'
                : '0 0 0 transparent',
              minWidth: '280px',
              justifyContent: 'space-between',
            }}
            onMouseEnter={(e) => {
              if (!copied) {
                (e.currentTarget as HTMLButtonElement).style.borderColor = '#333';
                (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 16px rgba(0,255,65,0.1)';
              }
            }}
            onMouseLeave={(e) => {
              if (!copied) {
                (e.currentTarget as HTMLButtonElement).style.borderColor = '#1a1a1a';
                (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 0 transparent';
              }
            }}
          >
            <span style={{ color: '#00ff41', marginRight: '0.25rem' }}>$</span>
            <span
              style={{
                flex: 1,
                textAlign: 'left',
                fontVariantNumeric: 'tabular-nums',
                letterSpacing: '0.12em',
              }}
            >
              {copied ? 'COPIED ✓' : ipDisplay}
            </span>
            <span
              className="cursor-blink"
              style={{
                color: '#00ff41',
                fontSize: '1.1em',
                opacity: copied ? 0 : 1,
              }}
            >
              █
            </span>
          </button>

          <p
            style={{
              marginTop: '0.5rem',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '0.6rem',
              letterSpacing: '0.15em',
              color: '#444',
              textTransform: 'uppercase',
              textAlign: 'center',
            }}
          >
            click to copy
          </p>
        </motion.div>
      </div>

      {/* Scroll chevron */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4, duration: 0.6 }}
        style={{
          position: 'absolute',
          bottom: '2rem',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 2,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0.25rem',
        }}
      >
        <span
          className="animate-chevron-bounce"
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '0.55rem',
            letterSpacing: '0.3em',
            color: '#333',
            textTransform: 'uppercase',
            display: 'block',
            marginBottom: '0.25rem',
          }}
        >
          SCROLL
        </span>
        <svg
          className="animate-chevron-bounce"
          width="18"
          height="18"
          viewBox="0 0 18 18"
          fill="none"
          style={{ color: '#444' }}
        >
          <path
            d="M3 6L9 12L15 6"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="square"
          />
        </svg>
      </motion.div>

      {/* Bottom border line */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '1px',
          background: '#1a1a1a',
          zIndex: 2,
        }}
      />
    </section>
  );
}

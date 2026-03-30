'use client';

import { useCallback, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import ParticleCanvas from './ParticleCanvas';

const IP = 'play.jodcraft.world';
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
      {/* Top-left corner label */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 0.2 }}
        style={{
          position: 'absolute',
          top: 'clamp(1.2rem, 2.5vw, 2rem)',
          left: 'clamp(1.2rem, 3vw, 2.5rem)',
          zIndex: 3,
          display: 'flex',
          flexDirection: 'column',
          gap: '0.18rem',
        }}
      >
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.52rem', letterSpacing: '0.35em', color: '#00ff41', textTransform: 'uppercase' }}>
          JOD
        </span>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.48rem', letterSpacing: '0.22em', color: '#282828', textTransform: 'uppercase' }}>
          PRIVATE SERVER
        </span>
      </motion.div>

      {/* Top-right corner label */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 0.3 }}
        style={{
          position: 'absolute',
          top: 'clamp(1.2rem, 2.5vw, 2rem)',
          right: 'clamp(1.2rem, 3vw, 2.5rem)',
          zIndex: 3,
          display: 'flex',
          flexDirection: 'column',
          gap: '0.18rem',
          alignItems: 'flex-end',
        }}
      >
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.48rem', letterSpacing: '0.22em', color: '#282828', textTransform: 'uppercase' }}>
          JAVA EDITION
        </span>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.48rem', letterSpacing: '0.18em', color: '#1e1e1e', textTransform: 'uppercase' }}>
          EST. 2024
        </span>
      </motion.div>

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
              fontSize: 'clamp(9rem, 26vw, 28rem)',
              fontWeight: 900,
              lineHeight: 0.85,
              letterSpacing: '-0.03em',
              color: '#f0f0f0',
              userSelect: 'none',
            }}
          >
            JOD
          </h1>
          {/* Decorative horizontal rules */}
          <motion.div
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            transition={{ duration: 1.2, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: 'absolute',
              bottom: '10%',
              left: '-8vw',
              right: '-8vw',
              height: '1px',
              background: 'linear-gradient(to right, transparent 0%, #1a1a1a 20%, #00ff41 50%, #1a1a1a 80%, transparent 100%)',
              transformOrigin: 'center',
              pointerEvents: 'none',
            }}
          />
        </motion.div>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7 }}
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 'clamp(0.6rem, 1.2vw, 0.75rem)',
            letterSpacing: '0.2em',
            color: '#323232',
            textTransform: 'uppercase',
          }}
        >
          PRIVATE SURVIVAL&nbsp;&nbsp;·&nbsp;&nbsp;CUSTOM DATAPACKS&nbsp;&nbsp;·&nbsp;&nbsp;RESOURCE PACK
        </motion.p>

        {/* Stats chips */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: 1.0 }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0',
            marginTop: '-0.5rem',
          }}
        >
          {(['EST. 2024', '8 MEMBERS', '14 DATAPACKS'] as const).map((v, i) => (
            <span key={v} style={{ display: 'inline-flex', alignItems: 'center' }}>
              <span
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '0.58rem',
                  letterSpacing: '0.22em',
                  color: '#383838',
                  textTransform: 'uppercase',
                }}
              >
                {v}
              </span>
              {i < 2 && (
                <span style={{ margin: '0 1.1rem', color: '#1e1e1e', fontSize: '0.5rem' }}>
                  /
                </span>
              )}
            </span>
          ))}
        </motion.div>

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
              background: 'transparent',
              border: `1px solid ${copied ? '#00ff41' : '#222'}`,
              padding: '0.9rem 1.75rem',
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

      {/* Animated scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.6, duration: 0.8 }}
        style={{
          position: 'absolute',
          bottom: '2.5rem',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 2,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0.5rem',
        }}
      >
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '0.48rem',
            letterSpacing: '0.4em',
            color: '#2a2a2a',
            textTransform: 'uppercase',
          }}
        >
          SCROLL
        </span>
        <div
          style={{
            width: '1px',
            height: '52px',
            background: '#1a1a1a',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <motion.div
            animate={{ y: ['-100%', '200%'] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'linear', repeatDelay: 0.3 }}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '40%',
              background: 'linear-gradient(to bottom, transparent, #00ff41, transparent)',
            }}
          />
        </div>
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

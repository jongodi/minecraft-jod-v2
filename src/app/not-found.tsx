'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

const SCRAMBLE = '!<>-_\\/[]{}—=+*^?#@$%&';

function useScramble(target: string, interval = 80) {
  const [display, setDisplay] = useState(target);
  useEffect(() => {
    let frame = 0;
    const id = setInterval(() => {
      frame++;
      setDisplay(
        target
          .split('')
          .map((ch, i) =>
            i < Math.floor((target.length * frame) / 24)
              ? ch
              : SCRAMBLE[Math.floor(Math.random() * SCRAMBLE.length)],
          )
          .join(''),
      );
      if (frame >= 24) clearInterval(id);
    }, interval);
    return () => clearInterval(id);
  }, [target, interval]);
  return display;
}

export default function NotFound() {
  const four04 = useScramble('404');
  const mono = "'JetBrains Mono', monospace";
  const sans = "'Space Grotesk', sans-serif";
  const green = '#00ff41';

  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#080808',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Ambient glow */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(ellipse at 50% 50%, rgba(0,255,65,0.04) 0%, transparent 65%)',
          pointerEvents: 'none',
        }}
      />

      <motion.p
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{
          fontFamily: mono,
          fontSize: '0.65rem',
          letterSpacing: '0.35em',
          color: green,
          textTransform: 'uppercase',
          marginBottom: '1.5rem',
        }}
      >
        ERROR
      </motion.p>

      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        style={{
          fontFamily: sans,
          fontSize: 'clamp(7rem, 22vw, 18rem)',
          fontWeight: 900,
          lineHeight: 0.85,
          letterSpacing: '-0.04em',
          color: '#f0f0f0',
          userSelect: 'none',
          marginBottom: '2rem',
        }}
      >
        {four04}
      </motion.h1>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        style={{
          fontFamily: mono,
          fontSize: 'clamp(0.65rem, 1.5vw, 0.8rem)',
          letterSpacing: '0.15em',
          color: '#444',
          textTransform: 'uppercase',
          marginBottom: '2.5rem',
          maxWidth: '360px',
          lineHeight: 1.8,
        }}
      >
        This block doesn&apos;t exist in the world.
        <br />
        Maybe it was never placed, or someone mined it.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55 }}
      >
        <Link
          href="/"
          style={{
            fontFamily: mono,
            fontSize: '0.65rem',
            letterSpacing: '0.25em',
            textTransform: 'uppercase',
            color: green,
            textDecoration: 'none',
            border: `1px solid rgba(0,255,65,0.3)`,
            padding: '0.7rem 1.5rem',
            display: 'inline-block',
            transition: 'border-color 0.2s, box-shadow 0.2s',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.borderColor = green;
            (e.currentTarget as HTMLElement).style.boxShadow = '0 0 20px rgba(0,255,65,0.15)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,255,65,0.3)';
            (e.currentTarget as HTMLElement).style.boxShadow = 'none';
          }}
        >
          ← BACK TO SPAWN
        </Link>
      </motion.div>

      {/* Bottom line */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '1px',
          background:
            'linear-gradient(to right, transparent, rgba(0,255,65,0.3) 30%, rgba(0,255,65,0.3) 70%, transparent)',
        }}
      />
    </main>
  );
}

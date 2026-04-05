'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';

interface CrewSummary {
  username:   string;
  bio:        string;
  photoCount: number;
  postCount:  number;
  lastPost:   string | null;
}

function CrewCard({ member, index }: { member: CrewSummary; index: number }) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: index * 0.07, ease: [0.16, 1, 0.3, 1] }}
    >
      <Link href={`/crew/${member.username}`} style={{ textDecoration: 'none', display: 'block' }}>
        <div
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          style={{
            background:  '#0d0d0d',
            border:      `1px solid ${hovered ? 'rgba(0,255,65,0.4)' : '#1a1a1a'}`,
            padding:     '1.25rem',
            display:     'flex',
            gap:         '1rem',
            alignItems:  'center',
            transform:   hovered ? 'translateY(-2px)' : 'none',
            boxShadow:   hovered ? '0 8px 32px rgba(0,0,0,0.6), 0 0 20px rgba(0,255,65,0.06)' : 'none',
            transition:  'all 0.25s ease',
            cursor:      'pointer',
          }}
        >
          {/* Avatar */}
          <div style={{
            width:        '56px',
            height:       '56px',
            flexShrink:   0,
            background:   '#111',
            border:       '1px solid #2a2a2a',
            overflow:     'hidden',
            imageRendering: 'pixelated',
          }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`https://mc-heads.net/head/${member.username}/128`}
              alt={member.username}
              width={56}
              height={56}
              style={{ width: '100%', height: '100%', objectFit: 'cover', imageRendering: 'pixelated' }}
              onError={(e) => {
                (e.target as HTMLImageElement).src = `https://minotar.net/helm/${member.username}/128`;
              }}
            />
          </div>

          {/* Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '1rem', fontWeight: 700, color: '#f0f0f0', letterSpacing: '-0.01em', marginBottom: '0.2rem' }}>
              {member.username}
            </p>
            {member.bio ? (
              <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.6rem', color: '#555', lineHeight: 1.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {member.bio}
              </p>
            ) : (
              <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.6rem', color: '#2a2a2a', fontStyle: 'italic' }}>
                No bio yet
              </p>
            )}
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.3rem', flexShrink: 0 }}>
            {member.photoCount > 0 && (
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.5rem', color: '#333', letterSpacing: '0.1em' }}>
                {member.photoCount} photo{member.photoCount !== 1 ? 's' : ''}
              </span>
            )}
            {member.postCount > 0 && (
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.5rem', color: '#333', letterSpacing: '0.1em' }}>
                {member.postCount} post{member.postCount !== 1 ? 's' : ''}
              </span>
            )}
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.5rem', color: hovered ? '#00ff41' : '#2a2a2a', transition: 'color 0.2s', letterSpacing: '0.1em' }}>
              VIEW →
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

export default function CrewPage() {
  const [crew, setCrew] = useState<CrewSummary[]>([]);

  useEffect(() => {
    fetch('/api/crew')
      .then(r => r.json())
      .then(setCrew)
      .catch(() => {});
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: '#080808', padding: 'clamp(5rem, 12vw, 9rem) clamp(1.5rem, 6vw, 5rem)' }}>
      {/* Header */}
      <motion.p
        initial={{ opacity: 0, x: -16 }}
        animate={{ opacity: 1, x: 0 }}
        style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.65rem', letterSpacing: '0.3em', color: '#00ff41', textTransform: 'uppercase', marginBottom: '0.75rem' }}
      >
        ← <Link href="/" style={{ color: '#00ff41', textDecoration: 'none' }}>BACK TO SITE</Link>
      </motion.p>

      <motion.h1
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 'clamp(2.5rem, 6vw, 5rem)', fontWeight: 900, letterSpacing: '-0.03em', color: '#f0f0f0', lineHeight: 1, marginBottom: '0.75rem' }}
      >
        THE CREW
      </motion.h1>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.25 }}
        style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.7rem', color: '#333', letterSpacing: '0.1em', marginBottom: '3rem' }}
      >
        {crew.length} members — private survival
      </motion.p>

      {/* Crew list */}
      <div style={{ maxWidth: '640px', display: 'flex', flexDirection: 'column', gap: '1px', background: '#1a1a1a', border: '1px solid #1a1a1a' }}>
        {crew.map((m, i) => (
          <CrewCard key={m.username} member={m} index={i} />
        ))}
      </div>
    </div>
  );
}

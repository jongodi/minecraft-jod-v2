'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { formatAge } from '@/lib/format';
import type { FeedPost } from '@/app/api/crew/feed/route';

const mono = "'JetBrains Mono', monospace";
const sans = "'Space Grotesk', sans-serif";
const green = '#00ff41';

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
          <div style={{ width: '56px', height: '56px', flexShrink: 0, background: '#111', border: '1px solid #2a2a2a', overflow: 'hidden', imageRendering: 'pixelated' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`https://mc-heads.net/head/${member.username}/128`}
              alt={member.username}
              width={56}
              height={56}
              style={{ width: '100%', height: '100%', objectFit: 'cover', imageRendering: 'pixelated' }}
              onError={(e) => { (e.target as HTMLImageElement).src = `https://minotar.net/helm/${member.username}/128`; }}
            />
          </div>

          {/* Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontFamily: sans, fontSize: '1rem', fontWeight: 700, color: '#f0f0f0', letterSpacing: '-0.01em', marginBottom: '0.2rem' }}>
              {member.username}
            </p>
            {member.bio ? (
              <p style={{ fontFamily: mono, fontSize: '0.6rem', color: '#555', lineHeight: 1.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {member.bio}
              </p>
            ) : (
              <p style={{ fontFamily: mono, fontSize: '0.6rem', color: '#2a2a2a', fontStyle: 'italic' }}>No bio yet</p>
            )}
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.3rem', flexShrink: 0 }}>
            {member.photoCount > 0 && (
              <span style={{ fontFamily: mono, fontSize: '0.5rem', color: '#333', letterSpacing: '0.1em' }}>
                {member.photoCount} photo{member.photoCount !== 1 ? 's' : ''}
              </span>
            )}
            {member.postCount > 0 && (
              <span style={{ fontFamily: mono, fontSize: '0.5rem', color: '#333', letterSpacing: '0.1em' }}>
                {member.postCount} post{member.postCount !== 1 ? 's' : ''}
              </span>
            )}
            <span style={{ fontFamily: mono, fontSize: '0.5rem', color: hovered ? green : '#2a2a2a', transition: 'color 0.2s', letterSpacing: '0.1em' }}>
              VIEW →
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

export default function CrewPage() {
  const [crew, setCrew]   = useState<CrewSummary[]>([]);
  const [feed, setFeed]   = useState<FeedPost[]>([]);
  const [tab,  setTab]    = useState<'members' | 'feed'>('members');

  useEffect(() => {
    fetch('/api/crew').then(r => r.json()).then(setCrew).catch(() => {});
    fetch('/api/crew/feed').then(r => r.json()).then(setFeed).catch(() => {});
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: '#080808', padding: 'clamp(5rem, 12vw, 9rem) clamp(1.5rem, 6vw, 5rem)' }}>
      {/* Header */}
      <motion.p
        initial={{ opacity: 0, x: -16 }}
        animate={{ opacity: 1, x: 0 }}
        style={{ fontFamily: mono, fontSize: '0.65rem', letterSpacing: '0.3em', color: green, textTransform: 'uppercase', marginBottom: '0.75rem' }}
      >
        ← <Link href="/" style={{ color: green, textDecoration: 'none' }}>BACK TO SITE</Link>
      </motion.p>

      <motion.h1
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        style={{ fontFamily: sans, fontSize: 'clamp(2.5rem, 6vw, 5rem)', fontWeight: 900, letterSpacing: '-0.03em', color: '#f0f0f0', lineHeight: 1, marginBottom: '0.75rem' }}
      >
        THE CREW
      </motion.h1>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.25 }}
        style={{ fontFamily: mono, fontSize: '0.7rem', color: '#333', letterSpacing: '0.1em', marginBottom: '2rem' }}
      >
        {crew.length} members — private survival
      </motion.p>

      {/* Tab switcher */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #1a1a1a', marginBottom: '2rem' }}>
        {(['members', 'feed'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              fontFamily: mono, fontSize: '0.55rem', letterSpacing: '0.2em', textTransform: 'uppercase',
              padding: '0.5rem 1rem', background: 'none', border: 'none',
              borderBottom: `2px solid ${tab === t ? green : 'transparent'}`,
              color: tab === t ? green : '#333',
              cursor: 'pointer', transition: 'color 0.2s, border-color 0.2s',
            }}
          >
            {t === 'members' ? 'MEMBERS' : `ACTIVITY FEED${feed.length > 0 ? ` (${feed.length})` : ''}`}
          </button>
        ))}
      </div>

      {/* Members grid */}
      {tab === 'members' && (
        <div style={{ maxWidth: '640px', display: 'flex', flexDirection: 'column', gap: '1px', background: '#1a1a1a', border: '1px solid #1a1a1a' }}>
          {crew.map((m, i) => (
            <CrewCard key={m.username} member={m} index={i} />
          ))}
        </div>
      )}

      {/* Activity feed */}
      {tab === 'feed' && (
        <div style={{ maxWidth: '640px' }}>
          {feed.length === 0 ? (
            <p style={{ fontFamily: mono, fontSize: '0.6rem', color: '#2a2a2a', fontStyle: 'italic' }}>
              No posts yet — crew members can share updates on their profile pages.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', background: '#1a1a1a' }}>
              {feed.map((post, i) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.04 }}
                  style={{ background: '#0d0d0d', padding: '0.9rem 1rem', display: 'flex', gap: '0.85rem', alignItems: 'flex-start' }}
                >
                  {/* Mini avatar */}
                  <div style={{ width: 28, height: 28, flexShrink: 0, border: '1px solid #1a1a1a', overflow: 'hidden', imageRendering: 'pixelated', marginTop: '0.1rem' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`https://mc-heads.net/head/${post.username}/64`}
                      alt={post.username}
                      width={28}
                      height={28}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', imageRendering: 'pixelated' }}
                      onError={(e) => { (e.target as HTMLImageElement).src = `https://minotar.net/helm/${post.username}/64`; }}
                    />
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Author + time */}
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.3rem', flexWrap: 'wrap' }}>
                      <Link href={`/crew/${post.username}`} style={{ fontFamily: sans, fontSize: '0.8rem', fontWeight: 700, color: '#f0f0f0', textDecoration: 'none' }}>
                        {post.username}
                      </Link>
                      <span style={{ fontFamily: mono, fontSize: '0.45rem', color: '#2a2a2a', letterSpacing: '0.1em' }}>
                        {formatAge(post.createdAt).toUpperCase()}
                      </span>
                    </div>
                    <p style={{ fontFamily: mono, fontSize: '0.7rem', color: '#888', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {post.text}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

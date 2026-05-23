'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { formatAge } from '@/lib/format';
import type { FeedPost } from '@/app/api/crew/feed/route';

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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: index * 0.06, ease: [0.16, 1, 0.3, 1] }}
    >
      <Link href={`/crew/${member.username}`} style={{ textDecoration: 'none', display: 'block' }}>
        <div
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          style={{
            background:  '#131722',
            border:      `1px solid ${hovered ? '#2a3045' : '#1c2030'}`,
            padding:     '1.25rem',
            display:     'flex',
            gap:         '1rem',
            alignItems:  'center',
            transform:   hovered ? 'translateY(-2px)' : 'none',
            boxShadow:   hovered ? '0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(0,255,65,0.06)' : 'none',
            transition:  'all 0.25s ease',
            cursor:      'pointer',
            position:    'relative',
            overflow:    'hidden',
          }}
        >
          {/* Top accent line */}
          <div style={{
            position:        'absolute',
            top:             0, left: 0, right: 0,
            height:          '1px',
            background:      'linear-gradient(to right, #00ff41, transparent)',
            transform:       `scaleX(${hovered ? 1 : 0})`,
            transformOrigin: 'left',
            transition:      'transform 0.4s cubic-bezier(0.16,1,0.3,1)',
          }} />

          {/* Avatar */}
          <div style={{
            width:           '52px',
            height:          '52px',
            flexShrink:      0,
            background:      '#0d1018',
            border:          '1px solid #1c2030',
            overflow:        'hidden',
            imageRendering:  'pixelated',
          }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`https://mc-heads.net/head/${member.username}/128`}
              alt={member.username}
              width={52}
              height={52}
              style={{ width: '100%', height: '100%', objectFit: 'cover', imageRendering: 'pixelated' }}
              onError={e => { (e.target as HTMLImageElement).src = `https://minotar.net/helm/${member.username}/128`; }}
            />
          </div>

          {/* Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{
              fontFamily:    "'Space Grotesk', sans-serif",
              fontSize:      '0.95rem',
              fontWeight:    700,
              color:         '#dde1ec',
              letterSpacing: '-0.01em',
              marginBottom:  '0.2rem',
            }}>
              {member.username}
            </p>
            {member.bio ? (
              <p style={{
                fontFamily:    "'JetBrains Mono', monospace",
                fontSize:      '0.58rem',
                color:         '#505770',
                lineHeight:    1.5,
                overflow:      'hidden',
                textOverflow:  'ellipsis',
                whiteSpace:    'nowrap',
              }}>
                {member.bio}
              </p>
            ) : (
              <p style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize:   '0.58rem',
                color:      '#1e2230',
              }}>
                No bio yet
              </p>
            )}
          </div>

          {/* Stats + view arrow */}
          <div style={{
            display:       'flex',
            flexDirection: 'column',
            alignItems:    'flex-end',
            gap:           '0.28rem',
            flexShrink:    0,
          }}>
            {member.photoCount > 0 && (
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.46rem', color: '#1e2230', letterSpacing: '0.1em' }}>
                {member.photoCount} photo{member.photoCount !== 1 ? 's' : ''}
              </span>
            )}
            {member.postCount > 0 && (
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.46rem', color: '#1e2230', letterSpacing: '0.1em' }}>
                {member.postCount} post{member.postCount !== 1 ? 's' : ''}
              </span>
            )}
            <span style={{
              fontFamily:    "'JetBrains Mono', monospace",
              fontSize:      '0.48rem',
              color:         hovered ? '#00ff41' : '#1e2230',
              transition:    'color 0.2s',
              letterSpacing: '0.1em',
              marginTop:     '0.1rem',
            }}>
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
  const [feed, setFeed] = useState<FeedPost[]>([]);
  const [tab,  setTab]  = useState<'members' | 'feed'>('members');

  useEffect(() => {
    fetch('/api/crew').then(r => r.json()).then(setCrew).catch(() => {});
    fetch('/api/crew/feed').then(r => r.json()).then(setFeed).catch(() => {});
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      background: '#06080c',
      padding:    'clamp(5rem, 12vw, 9rem) clamp(1.5rem, 6vw, 5rem)',
    }}>
      {/* Back link */}
      <motion.p
        initial={{ opacity: 0, x: -12 }}
        animate={{ opacity: 1, x: 0 }}
        style={{ marginBottom: '0.75rem' }}
      >
        <Link
          href="/"
          style={{
            fontFamily:     "'JetBrains Mono', monospace",
            fontSize:       '0.58rem',
            letterSpacing:  '0.22em',
            textTransform:  'uppercase',
            color:          '#505770',
            textDecoration: 'none',
            transition:     'color 0.2s',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = '#00ff41')}
          onMouseLeave={e => (e.currentTarget.style.color = '#505770')}
        >
          ← BACK TO SITE
        </Link>
      </motion.p>

      {/* Header */}
      <motion.h1
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
        style={{
          fontFamily:    "'Space Grotesk', sans-serif",
          fontSize:      'clamp(3rem, 7vw, 6rem)',
          fontWeight:    900,
          letterSpacing: '-0.03em',
          color:         '#dde1ec',
          lineHeight:    0.95,
          marginBottom:  '0.75rem',
        }}
      >
        THE CREW
      </motion.h1>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.22 }}
        style={{
          fontFamily:    "'JetBrains Mono', monospace",
          fontSize:      '0.65rem',
          color:         '#505770',
          letterSpacing: '0.1em',
          marginBottom:  '2.5rem',
        }}
      >
        {crew.length} members — private survival
      </motion.p>

      {/* Tab switcher */}
      <div style={{
        display:       'flex',
        gap:           0,
        borderBottom:  '1px solid #1c2030',
        marginBottom:  '2rem',
      }}>
        {(['members', 'feed'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              fontFamily:    "'JetBrains Mono', monospace",
              fontSize:      '0.52rem',
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              padding:       '0.5rem 1rem',
              background:    'none',
              border:        'none',
              borderBottom:  `2px solid ${tab === t ? '#00ff41' : 'transparent'}`,
              color:         tab === t ? '#00ff41' : '#1e2230',
              cursor:        'pointer',
              transition:    'color 0.2s, border-color 0.2s',
            }}
            onMouseEnter={e => { if (tab !== t) e.currentTarget.style.color = '#505770'; }}
            onMouseLeave={e => { if (tab !== t) e.currentTarget.style.color = '#1e2230'; }}
          >
            {t === 'members' ? 'MEMBERS' : `ACTIVITY FEED${feed.length > 0 ? ` (${feed.length})` : ''}`}
          </button>
        ))}
      </div>

      {/* Members */}
      {tab === 'members' && (
        <div style={{
          maxWidth:        '620px',
          display:         'flex',
          flexDirection:   'column',
          gap:             '1px',
          background:      '#1c2030',
          border:          '1px solid #1c2030',
        }}>
          {crew.map((m, i) => (
            <CrewCard key={m.username} member={m} index={i} />
          ))}
        </div>
      )}

      {/* Feed */}
      {tab === 'feed' && (
        <div style={{ maxWidth: '620px' }}>
          {feed.length === 0 ? (
            <p style={{
              fontFamily:    "'JetBrains Mono', monospace",
              fontSize:      '0.6rem',
              color:         '#1e2230',
              lineHeight:    1.7,
            }}>
              No posts yet — crew members can share updates on their profile pages.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', background: '#1c2030' }}>
              {feed.map((post, i) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: Math.min(i * 0.04, 0.3) }}
                  style={{
                    background: '#131722',
                    padding:    '0.9rem 1rem',
                    display:    'flex',
                    gap:        '0.85rem',
                    alignItems: 'flex-start',
                  }}
                >
                  {/* Mini avatar */}
                  <div style={{
                    width:          26,
                    height:         26,
                    flexShrink:     0,
                    border:         '1px solid #1c2030',
                    overflow:       'hidden',
                    imageRendering: 'pixelated',
                    marginTop:      '0.1rem',
                  }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`https://mc-heads.net/head/${post.username}/64`}
                      alt={post.username}
                      width={26}
                      height={26}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', imageRendering: 'pixelated' }}
                      onError={e => { (e.target as HTMLImageElement).src = `https://minotar.net/helm/${post.username}/64`; }}
                    />
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.3rem', flexWrap: 'wrap' }}>
                      <Link
                        href={`/crew/${post.username}`}
                        style={{
                          fontFamily:     "'Space Grotesk', sans-serif",
                          fontSize:       '0.82rem',
                          fontWeight:     700,
                          color:          '#dde1ec',
                          textDecoration: 'none',
                          transition:     'color 0.2s',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.color = '#00ff41')}
                        onMouseLeave={e => (e.currentTarget.style.color = '#dde1ec')}
                      >
                        {post.username}
                      </Link>
                      <span style={{
                        fontFamily:    "'JetBrains Mono', monospace",
                        fontSize:      '0.44rem',
                        color:         '#1e2230',
                        letterSpacing: '0.1em',
                      }}>
                        {formatAge(post.createdAt).toUpperCase()} AGO
                      </span>
                    </div>
                    <p style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize:   '0.68rem',
                      color:      '#505770',
                      lineHeight: 1.65,
                      whiteSpace: 'pre-wrap',
                      wordBreak:  'break-word',
                    }}>
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

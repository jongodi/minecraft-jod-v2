'use client';

import { motion } from 'framer-motion';
import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import type { StatusResponse } from '@/app/api/server-status/route';

const CREW = [
  'stebbias',
  'AmmaGaur',
  'joenana',
  'ingunnbirta',
  'Gamla123',
  'fafnir1994',
  'IMlonely',
  'eikibleiki',
];

const HEAD_SOURCES = (name: string) => [
  `https://mc-heads.net/head/${name}/128`,
  `https://minotar.net/helm/${name}/128`,
];

function CrewCard({ name, isOnline, index }: { name: string; isOnline: boolean; index: number }) {
  const [hovered, setHovered]   = useState(false);
  const [srcIndex, setSrcIndex] = useState(0);
  const sources    = HEAD_SOURCES(name);
  const allFailed  = srcIndex >= sources.length;

  return (
    <Link href={`/crew/${name}`} style={{ textDecoration: 'none' }}>
      <motion.div
        initial={{ opacity: 0, y: 14, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, delay: 0.06 + index * 0.045, ease: [0.16, 1, 0.3, 1] }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          position:      'relative',
          display:       'flex',
          flexDirection: 'column',
          alignItems:    'center',
          gap:           '0.45rem',
          padding:       '0.85rem 0.6rem 0.75rem',
          background:    isOnline ? `rgba(var(--accent-rgb), 0.04)` : 'var(--bg-card)',
          border:        `1px solid ${
            isOnline
              ? hovered ? `rgba(var(--accent-rgb), 0.55)` : `rgba(var(--accent-rgb), 0.15)`
              : hovered ? 'var(--border-strong)' : 'var(--border)'
          }`,
          boxShadow:     isOnline && hovered
            ? `0 8px 28px rgba(0,0,0,0.6), 0 0 16px rgba(var(--accent-rgb), 0.12)`
            : 'none',
          transform:     hovered ? 'translateY(-3px)' : 'none',
          transition:    'all 0.22s ease',
          opacity:       isOnline ? 1 : 0.4,
          cursor:        'pointer',
        }}
      >
        {/* Online dot */}
        {isOnline && (
          <span style={{
            position:     'absolute',
            top:          '0.35rem',
            right:        '0.35rem',
            width:        5,
            height:       5,
            borderRadius: '50%',
            background:   'var(--accent)',
            boxShadow:    `0 0 6px rgba(var(--accent-rgb), 0.9)`,
          }} />
        )}

        {/* Avatar */}
        {!allFailed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={sources[srcIndex]}
            alt={name}
            width={44}
            height={44}
            onError={() => {
              if (srcIndex < sources.length - 1) setSrcIndex(i => i + 1);
              else setSrcIndex(sources.length);
            }}
            style={{
              imageRendering: 'pixelated',
              transform:      hovered ? 'scale(1.08) translateY(-2px)' : 'scale(1)',
              transition:     'transform 0.28s ease',
              filter:         isOnline && hovered
                ? `drop-shadow(0 3px 8px rgba(var(--accent-rgb), 0.25))`
                : !isOnline
                ? 'grayscale(0.5) brightness(0.6)'
                : 'none',
            }}
          />
        ) : (
          <div style={{
            width:          44,
            height:         44,
            background:     'var(--bg-card)',
            border:         '1px solid var(--border)',
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            fontFamily:     'var(--font-display)',
            fontSize:       '1.1rem',
            fontWeight:     900,
            color:          isOnline ? 'var(--accent)' : 'var(--faint)',
          }}>
            {name.charAt(0).toUpperCase()}
          </div>
        )}

        {/* Name */}
        <p style={{
          fontFamily:    'var(--font-mono)',
          fontSize:      '0.44rem',
          fontWeight:    600,
          letterSpacing: '0.06em',
          color:         isOnline
            ? hovered ? 'var(--accent)' : `rgba(var(--accent-rgb), 0.65)`
            : hovered ? 'var(--muted)' : 'var(--faint)',
          textTransform: 'uppercase',
          textAlign:     'center',
          wordBreak:     'break-all',
          lineHeight:    1.3,
          transition:    'color 0.22s ease',
        }}>
          {name}
        </p>
      </motion.div>
    </Link>
  );
}

export default function ServerStatus() {
  const [data,        setData]        = useState<StatusResponse | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [lastUpdated, setLastUpdated] = useState('');

  const fetchStatus = useCallback(async () => {
    try {
      const res  = await fetch('/api/server-status', { cache: 'no-store' });
      const json: StatusResponse = await res.json();
      setData(json);
      setLastUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    } catch {
      setData({ online: false, source: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const id = setInterval(fetchStatus, 60_000);
    const onVisibility = () => { if (document.visibilityState === 'visible') fetchStatus(); };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [fetchStatus]);

  const isOnline    = data?.online ?? false;
  const playerCount = data?.players?.online ?? 0;
  const playerMax   = data?.players?.max ?? 0;
  const motd        = data?.motd?.clean?.[0] ?? '';

  const onlineNames = useMemo(
    () => new Set((data?.players?.list ?? []).map(p => p.name.toLowerCase())),
    [data?.players?.list]
  );

  return (
    <section
      id="server"
      style={{
        padding:    'clamp(5rem, 12vw, 9rem) clamp(1.5rem, 6vw, 5rem)',
        position:   'relative',
        overflow:   'hidden',
        background: 'var(--bg-elevated)',
      }}
    >
      {/* Online ambient glow — left edge */}
      {isOnline && !loading && (
        <div style={{
          position:      'absolute',
          top:           0,
          left:          '-5%',
          width:         '50%',
          height:        '100%',
          background:    `radial-gradient(ellipse at 0% 50%, rgba(var(--accent-rgb), 0.06) 0%, transparent 60%)`,
          pointerEvents: 'none',
        }} />
      )}

      {/* Two-column split layout */}
      <div className="server-split">

        {/* LEFT — Status */}
        <div style={{ position: 'relative' }}>
          <motion.p
            initial={{ opacity: 0, x: -14 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="section-label"
          >
            01 — SERVER
          </motion.p>

          {/* Pulsing orb */}
          <motion.div
            initial={{ opacity: 0, scale: 0.4 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            style={{ position: 'relative', width: 14, height: 14, marginBottom: '1.5rem' }}
          >
            {isOnline && !loading && (
              <>
                <span className="status-ring" style={{ position: 'absolute', inset: -1, borderRadius: '50%', background: 'var(--accent)' }} />
                <span className="status-ring status-ring-delay" style={{ position: 'absolute', inset: -1, borderRadius: '50%', background: 'var(--accent)' }} />
              </>
            )}
            <span style={{
              position:     'absolute',
              inset:        0,
              borderRadius: '50%',
              background:   loading ? 'var(--faint)' : isOnline ? 'var(--accent)' : 'var(--status-offline)',
              boxShadow:    isOnline && !loading ? `0 0 12px rgba(var(--accent-rgb), 0.7)` : 'none',
              transition:   'background 0.5s ease, box-shadow 0.5s ease',
              zIndex:       1,
            }} />
          </motion.div>

          {/* Giant status word */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.65, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          >
            <h2 style={{
              fontFamily:    'var(--font-display)',
              fontSize:      'clamp(4rem, 11vw, 11rem)',
              fontWeight:    900,
              letterSpacing: '-0.04em',
              lineHeight:    0.88,
              color:         loading ? 'var(--faint)' : isOnline ? 'var(--accent)' : 'var(--status-offline)',
              textShadow:    isOnline && !loading ? `0 0 120px rgba(var(--accent-rgb), 0.2), 0 0 40px rgba(var(--accent-rgb), 0.12)` : 'none',
              transition:    'color 0.5s ease, text-shadow 0.5s ease',
              marginBottom:  '2rem',
            }}>
              {loading ? '· · ·' : isOnline ? 'ONLINE' : 'OFFLINE'}
            </h2>
          </motion.div>

          {/* Server meta */}
          {!loading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.25 }}
              style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}
            >
              {/* Server icon + address */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {data?.icon && (
                  <div style={{ flexShrink: 0, border: '1px solid var(--border)', lineHeight: 0 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={data.icon}
                      alt="Server icon"
                      width={40}
                      height={40}
                      style={{ imageRendering: 'pixelated', display: 'block' }}
                    />
                  </div>
                )}
                <div>
                  <p style={{
                    fontFamily:    'var(--font-mono)',
                    fontSize:      '0.72rem',
                    letterSpacing: '0.08em',
                    color:         'var(--muted)',
                    lineHeight:    1,
                  }}>
                    play.jodcraft.world
                  </p>
                  {motd && (
                    <p style={{
                      fontFamily:    'var(--font-mono)',
                      fontSize:      '0.52rem',
                      color:         'var(--border-strong)',
                      letterSpacing: '0.08em',
                      marginTop:     '0.25rem',
                    }}>
                      {motd}
                    </p>
                  )}
                </div>
              </div>

              {/* Player count */}
              {isOnline && (
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginTop: '0.25rem' }}>
                  <span style={{
                    fontFamily:    'var(--font-display)',
                    fontSize:      'clamp(1.8rem, 3.5vw, 3rem)',
                    fontWeight:    800,
                    letterSpacing: '-0.02em',
                    color:         'var(--text)',
                    lineHeight:    1,
                  }}>
                    {playerCount}
                  </span>
                  <span style={{
                    fontFamily:    'var(--font-mono)',
                    fontSize:      '0.6rem',
                    color:         'var(--faint)',
                    letterSpacing: '0.1em',
                  }}>
                    / {playerMax} players
                  </span>
                </div>
              )}

              {/* Divider line */}
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 1.2, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  height:          '1px',
                  background:      isOnline
                    ? `linear-gradient(to right, rgba(var(--accent-rgb), 0.7), rgba(var(--accent-rgb), 0.15) 50%, transparent)`
                    : 'linear-gradient(to right, rgba(var(--status-offline-rgb, 255,51,85), 0.5), transparent)',
                  transformOrigin: 'left',
                  marginTop:       '0.5rem',
                }}
              />

              {lastUpdated && (
                <p style={{
                  fontFamily:    'var(--font-mono)',
                  fontSize:      '0.44rem',
                  color:         'var(--border)',
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                }}>
                  UPDATED {lastUpdated} · REFRESHES EVERY 60S{data?.source === 'exaroton' ? ' · EXAROTON API' : ''}
                </p>
              )}
            </motion.div>
          )}
        </div>

        {/* RIGHT — Crew */}
        <div style={{
          borderLeft:  '1px solid var(--border)',
          paddingLeft: 'clamp(2rem, 5vw, 4rem)',
        }}>
          {!loading && (
            <motion.div
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.55, delay: 0.2 }}
            >
              <p style={{
                fontFamily:    'var(--font-mono)',
                fontSize:      '0.5rem',
                letterSpacing: '0.3em',
                color:         'var(--faint)',
                textTransform: 'uppercase',
                marginBottom:  '0.4rem',
              }}>
                WHO&apos;S IN
              </p>
              <h3 style={{
                fontFamily:    'var(--font-display)',
                fontSize:      'clamp(1.5rem, 3.5vw, 2.5rem)',
                fontWeight:    800,
                letterSpacing: '-0.02em',
                color:         'var(--text)',
                lineHeight:    1,
                marginBottom:  '1.5rem',
              }}>
                THE CREW
                <span style={{
                  fontFamily:    'var(--font-mono)',
                  fontSize:      '0.52rem',
                  fontWeight:    400,
                  letterSpacing: '0.2em',
                  color:         'var(--faint)',
                  marginLeft:    '0.85rem',
                  verticalAlign: 'middle',
                }}>
                  {CREW.length} MEMBERS
                </span>
              </h3>

              <div className="crew-grid">
                {CREW.map((name, i) => (
                  <CrewCard
                    key={name}
                    name={name}
                    isOnline={onlineNames.has(name.toLowerCase())}
                    index={i}
                  />
                ))}
              </div>

              {isOnline && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.4, delay: 0.55 }}
                  style={{
                    marginTop:     '1rem',
                    fontFamily:    'var(--font-mono)',
                    fontSize:      '0.46rem',
                    color:         'var(--faint)',
                    letterSpacing: '0.2em',
                    textTransform: 'uppercase',
                  }}
                >
                  {onlineNames.size > 0
                    ? `${onlineNames.size} OF ${CREW.length} IN GAME`
                    : 'NO CREW MEMBERS CURRENTLY IN GAME'}
                </motion.p>
              )}
            </motion.div>
          )}
        </div>

      </div>

      <style>{`
        .server-split {
          display: grid;
          grid-template-columns: 1fr;
          gap: 3rem;
        }
        @media (min-width: 800px) {
          .server-split {
            grid-template-columns: 1fr 1fr;
            gap: clamp(3rem, 6vw, 5rem);
            align-items: start;
          }
        }
        .crew-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 0.5rem;
        }
        @media (max-width: 1100px) {
          .crew-grid {
            grid-template-columns: repeat(4, 1fr);
          }
        }
        @media (max-width: 500px) {
          .crew-grid {
            grid-template-columns: repeat(4, 1fr);
            gap: 0.4rem;
          }
        }
      `}</style>
    </section>
  );
}

'use client';

import { motion } from 'framer-motion';
import { useEffect, useState, useCallback } from 'react';
import type { StatusResponse } from '@/app/api/server-status/route';

const CREW = [
  'stebbias', 'AmmaGaur', 'joenana', 'ingunnbirta',
  'Gamla123', 'fafnir1994', 'IMlonely', 'eikibleiki',
];

const HEAD_SOURCES = (name: string) => [
  `https://mc-heads.net/head/${name}/128`,
  `https://minotar.net/helm/${name}/128`,
];

function CrewCard({ name, isOnline, index }: { name: string; isOnline: boolean; index: number }) {
  const [hovered,  setHovered]  = useState(false);
  const [srcIndex, setSrcIndex] = useState(0);
  const sources  = HEAD_SOURCES(name);
  const allFailed = srcIndex >= sources.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, delay: 0.12 + index * 0.06, ease: [0.16, 1, 0.3, 1] }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      data-cursor="hover"
      style={{
        position:       'relative',
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        gap:            '0.6rem',
        padding:        '1.25rem 0.9rem 1rem',
        width:          100,
        background:     hovered
          ? isOnline ? 'rgba(245,166,35,0.06)' : 'rgba(255,255,255,0.04)'
          : isOnline ? 'rgba(245,166,35,0.03)' : 'rgba(8,14,28,0.6)',
        border:         `1px solid ${
          isOnline
            ? hovered ? 'rgba(245,166,35,0.5)' : 'rgba(245,166,35,0.18)'
            : hovered ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.05)'
        }`,
        backdropFilter: 'blur(8px)',
        boxShadow:      isOnline && hovered
          ? '0 8px 32px rgba(0,0,0,0.5), 0 0 30px rgba(245,166,35,0.1)'
          : '0 4px 16px rgba(0,0,0,0.3)',
        transform:      hovered ? 'translateY(-6px)' : 'translateY(0)',
        transition:     'all 0.3s cubic-bezier(0.16,1,0.3,1)',
        opacity:        isOnline ? 1 : 0.4,
      }}
    >
      {/* Online dot */}
      {isOnline && (
        <span
          style={{
            position:     'absolute',
            top:          '0.5rem',
            right:        '0.5rem',
            width:        7,
            height:       7,
            borderRadius: '50%',
            background:   '#10B981',
            boxShadow:    '0 0 8px rgba(16,185,129,0.9)',
          }}
        />
      )}

      {/* Avatar */}
      {!allFailed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={sources[srcIndex]}
          alt={name}
          width={52}
          height={52}
          onError={() => setSrcIndex(i => (i < sources.length - 1 ? i + 1 : sources.length))}
          style={{
            imageRendering: 'pixelated',
            transform:      hovered ? 'scale(1.1) translateY(-2px)' : 'scale(1)',
            transition:     'transform 0.3s ease',
            filter:         isOnline && hovered
              ? 'drop-shadow(0 4px 12px rgba(245,166,35,0.35))'
              : isOnline ? 'none' : 'grayscale(0.5) brightness(0.6)',
          }}
        />
      ) : (
        <div
          style={{
            width:          52,
            height:         52,
            background:     'rgba(8,14,28,0.8)',
            border:         '1px solid rgba(255,255,255,0.08)',
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            fontFamily:     "'Playfair Display', serif",
            fontSize:       '1.3rem',
            fontWeight:     700,
            color:          isOnline ? '#F5A623' : '#4B5563',
          }}
        >
          {name.charAt(0).toUpperCase()}
        </div>
      )}

      {/* Name */}
      <p
        style={{
          fontFamily:    "'JetBrains Mono', monospace",
          fontSize:      '0.52rem',
          fontWeight:    500,
          letterSpacing: '0.05em',
          color:         isOnline
            ? hovered ? '#F5A623' : 'rgba(245,166,35,0.65)'
            : hovered ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.2)',
          textTransform: 'uppercase',
          textAlign:     'center',
          wordBreak:     'break-all',
          lineHeight:    1.3,
          transition:    'color 0.25s ease',
        }}
      >
        {name}
      </p>

      {isOnline && (
        <span
          style={{
            fontFamily:    "'JetBrains Mono', monospace",
            fontSize:      '0.4rem',
            letterSpacing: '0.2em',
            color:         'rgba(16,185,129,0.7)',
            textTransform: 'uppercase',
            marginTop:     '-0.2rem',
          }}
        >
          IN GAME
        </span>
      )}
    </motion.div>
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
    return () => clearInterval(id);
  }, [fetchStatus]);

  const isOnline    = data?.online ?? false;
  const playerCount = data?.players?.online ?? 0;
  const playerMax   = data?.players?.max   ?? 0;
  const motd        = data?.motd?.clean?.[0] ?? '';
  const onlineNames = new Set((data?.players?.list ?? []).map(p => p.name.toLowerCase()));

  return (
    <section
      style={{
        padding:      'clamp(5rem, 12vw, 10rem) clamp(1.5rem, 6vw, 5rem)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        position:     'relative',
        overflow:     'hidden',
        background:   '#060A14',
      }}
    >
      {/* Ambient glow */}
      <div
        style={{
          position:      'absolute',
          top:           '-10%',
          left:          '-5%',
          width:         '50%',
          height:        '120%',
          background:    isOnline
            ? 'radial-gradient(ellipse at 0% 50%, rgba(245,166,35,0.05) 0%, transparent 65%)'
            : 'none',
          pointerEvents: 'none',
          transition:    'background 1s ease',
        }}
      />

      {/* Section label */}
      <motion.p
        initial={{ opacity: 0, x: -16 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        style={{
          fontFamily:    "'JetBrains Mono', monospace",
          fontSize:      '0.62rem',
          letterSpacing: '0.32em',
          color:         'rgba(245,166,35,0.7)',
          textTransform: 'uppercase',
          marginBottom:  '2.5rem',
        }}
      >
        01 — Server
      </motion.p>

      {/* Status row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(1.2rem, 3vw, 2.5rem)', flexWrap: 'wrap' }}>
        {/* Pulse orb */}
        <motion.div
          initial={{ opacity: 0, scale: 0.3 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          style={{ position: 'relative', width: 20, height: 20, flexShrink: 0 }}
        >
          {isOnline && !loading && (
            <>
              <span className="glow-ring" style={{ position: 'absolute', inset: -1, borderRadius: '50%', background: '#F5A623' }} />
              <span className="glow-ring glow-ring-delay" style={{ position: 'absolute', inset: -1, borderRadius: '50%', background: '#F5A623' }} />
            </>
          )}
          <span
            style={{
              position:   'absolute',
              inset:      0,
              borderRadius: '50%',
              background:   loading ? '#1a1a2e' : isOnline ? '#F5A623' : '#EF4444',
              boxShadow:    isOnline && !loading ? '0 0 16px rgba(245,166,35,0.8), 0 0 6px rgba(245,166,35,1)' : 'none',
              transition:   'background 0.6s ease, box-shadow 0.6s ease',
              zIndex:       1,
            }}
          />
        </motion.div>

        {/* Server icon */}
        {data?.icon && (
          <motion.div
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            style={{
              flexShrink:   0,
              border:       '1px solid rgba(255,255,255,0.08)',
              lineHeight:   0,
              boxShadow:    isOnline ? '0 0 20px rgba(245,166,35,0.12)' : 'none',
              background:   'rgba(8,14,28,0.6)',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={data.icon}
              alt="Server icon"
              width={56}
              height={56}
              style={{ imageRendering: 'pixelated', display: 'block' }}
            />
          </motion.div>
        )}

        {/* Status text */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            style={{
              fontFamily:    "'Playfair Display', serif",
              fontSize:      'clamp(2.8rem, 7vw, 6rem)',
              fontWeight:    900,
              fontStyle:     'italic',
              letterSpacing: '-0.01em',
              lineHeight:    1,
              color:         loading ? '#1a2a4a' : isOnline ? '#F5A623' : '#EF4444',
              textShadow:    isOnline && !loading ? '0 0 60px rgba(245,166,35,0.3)' : 'none',
              transition:    'color 0.6s ease, text-shadow 0.6s ease',
            }}
          >
            {loading ? '· · ·' : isOnline ? 'Online' : 'Offline'}
          </motion.h2>
          {!loading && isOnline && motd && (
            <motion.p
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              style={{
                fontFamily:    "'Inter', sans-serif",
                fontSize:      '0.75rem',
                color:         'rgba(255,255,255,0.3)',
                letterSpacing: '0.05em',
                fontWeight:    300,
              }}
            >
              {motd}
            </motion.p>
          )}
        </div>

        {/* Player count */}
        {!loading && isOnline && (
          <motion.div
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            style={{
              marginLeft:     'auto',
              padding:        '0.8rem 1.4rem',
              background:     'rgba(8,14,28,0.7)',
              border:         '1px solid rgba(245,166,35,0.2)',
              backdropFilter: 'blur(8px)',
              textAlign:      'center',
            }}
          >
            <p
              style={{
                fontFamily:    "'JetBrains Mono', monospace",
                fontSize:      '0.48rem',
                color:         'rgba(255,255,255,0.3)',
                letterSpacing: '0.25em',
                textTransform: 'uppercase',
                marginBottom:  '0.2rem',
              }}
            >
              PLAYERS
            </p>
            <p
              style={{
                fontFamily:    "'Playfair Display', serif",
                fontSize:      'clamp(1.6rem, 3.5vw, 2.8rem)',
                fontWeight:    700,
                lineHeight:    1,
                color:         '#F0EAD6',
              }}
            >
              {playerCount}
              <span
                style={{
                  fontFamily:    "'JetBrains Mono', monospace",
                  fontSize:      '0.7rem',
                  fontWeight:    400,
                  color:         'rgba(255,255,255,0.2)',
                  letterSpacing: '0.08em',
                }}
              >
                {' '}/ {playerMax}
              </span>
            </p>
          </motion.div>
        )}
      </div>

      {/* Divider */}
      {!loading && (
        <motion.div
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.0, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          style={{
            height:          '1px',
            background:      isOnline
              ? 'linear-gradient(to right, rgba(245,166,35,0.6), rgba(245,166,35,0.12) 50%, transparent)'
              : 'linear-gradient(to right, rgba(239,68,68,0.4), rgba(239,68,68,0.06) 50%, transparent)',
            margin:          '3rem 0',
            transformOrigin: 'left',
          }}
        />
      )}

      {/* Crew */}
      {!loading && (
        <>
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.35 }}
            style={{ marginBottom: '1.8rem' }}
          >
            <p
              style={{
                fontFamily:    "'JetBrains Mono', monospace",
                fontSize:      '0.52rem',
                letterSpacing: '0.3em',
                color:         'rgba(255,255,255,0.2)',
                textTransform: 'uppercase',
                marginBottom:  '0.4rem',
              }}
            >
              WHO&apos;S IN
            </p>
            <h3
              style={{
                fontFamily:    "'Playfair Display', serif",
                fontSize:      'clamp(1.6rem, 3.5vw, 2.5rem)',
                fontWeight:    700,
                fontStyle:     'italic',
                color:         '#F0EAD6',
                lineHeight:    1,
              }}
            >
              The Crew
              <span
                style={{
                  fontFamily:    "'JetBrains Mono', monospace",
                  fontSize:      '0.58rem',
                  fontWeight:    400,
                  fontStyle:     'normal',
                  letterSpacing: '0.22em',
                  color:         'rgba(255,255,255,0.2)',
                  marginLeft:    '1.2rem',
                  verticalAlign: 'middle',
                }}
              >
                {CREW.length} MEMBERS
              </span>
            </h3>
          </motion.div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
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
              transition={{ duration: 0.4, delay: 0.7 }}
              style={{
                marginTop:     '1.5rem',
                fontFamily:    "'JetBrains Mono', monospace",
                fontSize:      '0.5rem',
                color:         'rgba(255,255,255,0.15)',
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
              }}
            >
              {onlineNames.size > 0
                ? `${onlineNames.size} of ${CREW.length} crew members in game`
                : 'No crew members currently in game'}
            </motion.p>
          )}
        </>
      )}

      {lastUpdated && (
        <p
          style={{
            marginTop:     '2.5rem',
            fontFamily:    "'JetBrains Mono', monospace",
            fontSize:      '0.46rem',
            color:         'rgba(255,255,255,0.1)',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
          }}
        >
          UPDATED {lastUpdated} · REFRESHES EVERY 60S
          {data?.source === 'exaroton' ? ' · EXAROTON API' : ''}
        </p>
      )}
    </section>
  );
}

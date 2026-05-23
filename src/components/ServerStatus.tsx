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
        initial={{ opacity: 0, y: 16, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, delay: 0.08 + index * 0.05, ease: [0.16, 1, 0.3, 1] }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          position:      'relative',
          display:       'flex',
          flexDirection: 'column',
          alignItems:    'center',
          gap:           '0.55rem',
          padding:       '1rem 0.75rem 0.85rem',
          width:         92,
          background:    isOnline ? 'rgba(0,255,65,0.03)' : '#090b10',
          border:        `1px solid ${
            isOnline
              ? hovered ? 'rgba(0,255,65,0.55)' : 'rgba(0,255,65,0.15)'
              : hovered ? '#2a3045' : '#131722'
          }`,
          boxShadow:     isOnline && hovered
            ? '0 8px 30px rgba(0,0,0,0.6), 0 0 18px rgba(0,255,65,0.14)'
            : 'none',
          transform:     hovered ? 'translateY(-4px)' : 'none',
          transition:    'all 0.25s ease',
          opacity:       isOnline ? 1 : 0.4,
        }}
      >
        {/* Online dot */}
        {isOnline && (
          <span
            style={{
              position:     'absolute',
              top:          '0.4rem',
              right:        '0.4rem',
              width:        5,
              height:       5,
              borderRadius: '50%',
              background:   '#00ff41',
              boxShadow:    '0 0 6px rgba(0,255,65,0.9)',
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
            onError={() => {
              if (srcIndex < sources.length - 1) setSrcIndex(i => i + 1);
              else setSrcIndex(sources.length);
            }}
            style={{
              imageRendering: 'pixelated',
              transform:      hovered ? 'scale(1.06) translateY(-2px)' : 'scale(1)',
              transition:     'transform 0.3s ease',
              filter:         isOnline && hovered
                ? 'drop-shadow(0 3px 8px rgba(0,255,65,0.25))'
                : !isOnline
                ? 'grayscale(0.5) brightness(0.65)'
                : 'none',
            }}
          />
        ) : (
          <div
            style={{
              width:           52,
              height:          52,
              background:      '#131722',
              border:          '1px solid #1c2030',
              display:         'flex',
              alignItems:      'center',
              justifyContent:  'center',
              fontFamily:      "'Space Grotesk', sans-serif",
              fontSize:        '1.3rem',
              fontWeight:      900,
              color:           isOnline ? '#00ff41' : '#1e2230',
            }}
          >
            {name.charAt(0).toUpperCase()}
          </div>
        )}

        {/* Name */}
        <p
          style={{
            fontFamily:    "'JetBrains Mono', monospace",
            fontSize:      '0.48rem',
            fontWeight:    600,
            letterSpacing: '0.06em',
            color:         isOnline
              ? hovered ? '#00ff41' : 'rgba(0,255,65,0.65)'
              : hovered ? '#505770' : '#1e2230',
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
              fontSize:      '0.38rem',
              letterSpacing: '0.18em',
              color:         'rgba(0,255,65,0.45)',
              textTransform: 'uppercase',
              marginTop:     '-0.2rem',
            }}
          >
            IN GAME
          </span>
        )}
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
        padding:      'clamp(5rem, 12vw, 9rem) clamp(1.5rem, 6vw, 5rem)',
        borderBottom: '1px solid #1c2030',
        position:     'relative',
        overflow:     'hidden',
        background:   '#0d1018',
      }}
    >
      {/* Online ambient glow */}
      {isOnline && (
        <div
          style={{
            position:      'absolute',
            top:           0,
            left:          '-10%',
            width:         '60%',
            height:        '100%',
            background:    'radial-gradient(ellipse at 0% 40%, rgba(0,255,65,0.05) 0%, transparent 65%)',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Section label */}
      <motion.p
        initial={{ opacity: 0, x: -14 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="section-label"
      >
        01 — SERVER
      </motion.p>

      {/* Status row */}
      <div
        style={{
          display:     'flex',
          alignItems:  'center',
          gap:         'clamp(1rem, 2.5vw, 2rem)',
          flexWrap:    'wrap',
        }}
      >
        {/* Pulsing orb */}
        <motion.div
          initial={{ opacity: 0, scale: 0.4 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          style={{ position: 'relative', width: 16, height: 16, flexShrink: 0 }}
        >
          {isOnline && (
            <>
              <span
                className="status-ring"
                style={{ position: 'absolute', inset: -1, borderRadius: '50%', background: '#00ff41' }}
              />
              <span
                className="status-ring status-ring-delay"
                style={{ position: 'absolute', inset: -1, borderRadius: '50%', background: '#00ff41' }}
              />
            </>
          )}
          <span
            style={{
              position:     'absolute',
              inset:        0,
              borderRadius: '50%',
              background:   loading ? '#1e2230' : isOnline ? '#00ff41' : '#ff3355',
              boxShadow:    isOnline && !loading ? '0 0 12px rgba(0,255,65,0.7), 0 0 4px rgba(0,255,65,1)' : 'none',
              transition:   'background 0.5s ease, box-shadow 0.5s ease',
              zIndex:       1,
            }}
          />
        </motion.div>

        {/* Server icon */}
        {data?.icon && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.05 }}
            style={{
              flexShrink:  0,
              border:      '1px solid #1c2030',
              lineHeight:  0,
              boxShadow:   isOnline ? '0 0 14px rgba(0,255,65,0.07)' : 'none',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={data.icon}
              alt="Server icon"
              width={52}
              height={52}
              style={{ imageRendering: 'pixelated', display: 'block' }}
            />
          </motion.div>
        )}

        {/* ONLINE / OFFLINE + MOTD */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            style={{
              fontFamily:  "'Space Grotesk', sans-serif",
              fontSize:    'clamp(2.5rem, 6vw, 5.5rem)',
              fontWeight:  900,
              letterSpacing: '-0.03em',
              lineHeight:  1,
              color:       loading ? '#1e2230' : isOnline ? '#00ff41' : '#ff3355',
              textShadow:  isOnline && !loading ? '0 0 80px rgba(0,255,65,0.18)' : 'none',
              transition:  'color 0.5s ease, text-shadow 0.5s ease',
            }}
          >
            {loading ? '· · ·' : isOnline ? 'ONLINE' : 'OFFLINE'}
          </motion.h2>

          {!loading && isOnline && motd && (
            <motion.p
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              style={{
                fontFamily:    "'JetBrains Mono', monospace",
                fontSize:      '0.6rem',
                color:         '#2a3045',
                letterSpacing: '0.1em',
                lineHeight:    1,
              }}
            >
              {motd}
            </motion.p>
          )}
        </div>

        {/* Player count */}
        {!loading && isOnline && (
          <motion.div
            initial={{ opacity: 0, x: 14 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            style={{ marginLeft: 'auto' }}
          >
            <p
              style={{
                fontFamily:    "'JetBrains Mono', monospace",
                fontSize:      '0.48rem',
                color:         '#1e2230',
                letterSpacing: '0.28em',
                textTransform: 'uppercase',
                marginBottom:  '0.15rem',
              }}
            >
              PLAYERS ONLINE
            </p>
            <p
              style={{
                fontFamily:    "'Space Grotesk', sans-serif",
                fontSize:      'clamp(1.5rem, 3vw, 2.5rem)',
                fontWeight:    800,
                letterSpacing: '-0.02em',
                color:         '#dde1ec',
                lineHeight:    1,
                textAlign:     'right',
              }}
            >
              {playerCount}
              <span
                style={{
                  fontFamily:    "'JetBrains Mono', monospace",
                  fontSize:      '0.7rem',
                  fontWeight:    400,
                  color:         '#1e2230',
                  letterSpacing: '0.1em',
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
          transition={{ duration: 1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          style={{
            height:          '1px',
            background:      isOnline
              ? 'linear-gradient(to right, rgba(0,255,65,0.8), rgba(0,255,65,0.25) 35%, rgba(0,255,65,0.06) 65%, transparent)'
              : 'linear-gradient(to right, rgba(255,51,85,0.6), rgba(255,51,85,0.1) 40%, transparent)',
            margin:          '2.5rem 0 3rem',
            transformOrigin: 'left',
          }}
        />
      )}

      {/* Crew subsection */}
      {!loading && (
        <>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            style={{ marginBottom: '1.5rem' }}
          >
            <p
              style={{
                fontFamily:    "'JetBrains Mono', monospace",
                fontSize:      '0.5rem',
                letterSpacing: '0.3em',
                color:         '#1e2230',
                textTransform: 'uppercase',
                marginBottom:  '0.3rem',
              }}
            >
              WHO&apos;S IN
            </p>
            <h3
              style={{
                fontFamily:    "'Space Grotesk', sans-serif",
                fontSize:      'clamp(1.3rem, 3vw, 2rem)',
                fontWeight:    800,
                letterSpacing: '-0.02em',
                color:         '#dde1ec',
                lineHeight:    1,
              }}
            >
              THE CREW
              <span
                style={{
                  fontFamily:    "'JetBrains Mono', monospace",
                  fontSize:      '0.55rem',
                  fontWeight:    400,
                  letterSpacing: '0.2em',
                  color:         '#1e2230',
                  marginLeft:    '1rem',
                  verticalAlign: 'middle',
                }}
              >
                {CREW.length} MEMBERS
              </span>
            </h3>
          </motion.div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>
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
              transition={{ duration: 0.4, delay: 0.6 }}
              style={{
                marginTop:     '1.25rem',
                fontFamily:    "'JetBrains Mono', monospace",
                fontSize:      '0.46rem',
                color:         '#1e2230',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
              }}
            >
              {onlineNames.size > 0
                ? `${onlineNames.size} OF ${CREW.length} CREW MEMBERS IN GAME`
                : 'NO CREW MEMBERS CURRENTLY IN GAME'}
            </motion.p>
          )}
        </>
      )}

      {/* Attribution */}
      {lastUpdated && (
        <p
          style={{
            marginTop:     '2rem',
            fontFamily:    "'JetBrains Mono', monospace",
            fontSize:      '0.44rem',
            color:         '#131722',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
          }}
        >
          UPDATED {lastUpdated} · REFRESHES EVERY 60S{data?.source === 'exaroton' ? ' · EXAROTON API' : ''}
        </p>
      )}
    </section>
  );
}

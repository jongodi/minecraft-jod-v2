'use client';

'use client';

import { motion } from 'framer-motion';
import { useEffect, useState, useCallback } from 'react';
import type { StatusResponse } from '@/app/api/server-status/route';

// ─── Static crew list ────────────────────────────────────────────────────────
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

// ─── Crew card ───────────────────────────────────────────────────────────────
function CrewCard({
  name,
  isOnline,
  index,
}: {
  name: string;
  isOnline: boolean;
  index: number;
}) {
  const [hovered, setHovered] = useState(false);
  const [srcIndex, setSrcIndex] = useState(0);
  const sources = HEAD_SOURCES(name);
  const allFailed = srcIndex >= sources.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 18, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.45, delay: 0.1 + index * 0.055, ease: [0.16, 1, 0.3, 1] }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.6rem',
        padding: '1.25rem 0.9rem 1rem',
        width: 100,
        background: isOnline
          ? 'rgba(0,255,65,0.03)'
          : '#090909',
        border: `1px solid ${
          isOnline
            ? hovered ? 'rgba(0,255,65,0.45)' : 'rgba(0,255,65,0.18)'
            : hovered ? '#2a2a2a' : '#141414'
        }`,
        boxShadow: isOnline && hovered
          ? '0 8px 32px rgba(0,255,65,0.14), 0 0 0 1px rgba(0,255,65,0.18)'
          : 'none',
        transform: hovered ? 'translateY(-5px)' : 'translateY(0)',
        transition: 'all 0.25s ease',
        opacity: isOnline ? 1 : 0.45,
        cursor: 'default',
      }}
    >
      {/* Online indicator ring */}
      {isOnline && (
        <span
          style={{
            position: 'absolute',
            top: '0.45rem',
            right: '0.45rem',
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: '#00ff41',
            boxShadow: '0 0 7px rgba(0,255,65,0.9)',
          }}
        />
      )}

      {/* Avatar */}
      {!allFailed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={sources[srcIndex]}
          alt={name}
          width={60}
          height={60}
          onError={() => {
            if (srcIndex < sources.length - 1) setSrcIndex((i) => i + 1);
            else setSrcIndex(sources.length);
          }}
          style={{
            imageRendering: 'pixelated',
            transform: hovered ? 'scale(1.08) translateY(-2px)' : 'scale(1)',
            transition: 'transform 0.3s ease',
            filter: isOnline && hovered
              ? 'drop-shadow(0 3px 10px rgba(0,255,65,0.3))'
              : isOnline
              ? 'none'
              : 'grayscale(0.4) brightness(0.7)',
          }}
        />
      ) : (
        <div
          style={{
            width: 60,
            height: 60,
            background: '#111',
            border: '1px solid #1a1a1a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: '1.4rem',
            fontWeight: 900,
            color: isOnline ? '#00ff41' : '#333',
          }}
        >
          {name.charAt(0).toUpperCase()}
        </div>
      )}

      {/* Name */}
      <p
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '0.55rem',
          fontWeight: 600,
          letterSpacing: '0.06em',
          color: isOnline
            ? hovered ? '#00ff41' : 'rgba(0,255,65,0.7)'
            : hovered ? '#444' : '#2a2a2a',
          textTransform: 'uppercase',
          textAlign: 'center',
          wordBreak: 'break-all',
          lineHeight: 1.3,
          transition: 'color 0.25s ease',
        }}
      >
        {name}
      </p>

      {/* ONLINE label */}
      {isOnline && (
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '0.42rem',
            letterSpacing: '0.18em',
            color: 'rgba(0,255,65,0.55)',
            textTransform: 'uppercase',
            marginTop: '-0.25rem',
          }}
        >
          IN GAME
        </span>
      )}
    </motion.div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────
export default function ServerStatus() {
  const [data, setData] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState('');

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/server-status', { cache: 'no-store' });
      const json: StatusResponse = await res.json();
      setData(json);
      setLastUpdated(
        new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      );
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

  const isOnline = data?.online ?? false;
  const playerCount = data?.players?.online ?? 0;
  const playerMax = data?.players?.max ?? 0;
  const motd = data?.motd?.clean?.[0] ?? '';

  // Build a set of online player names (lowercase) for fast lookup
  const onlineNames = new Set(
    (data?.players?.list ?? []).map((p) => p.name.toLowerCase())
  );

  return (
    <section
      style={{
        padding: 'clamp(4rem, 10vw, 8rem) clamp(1.5rem, 6vw, 5rem)',
        borderBottom: '1px solid #1a1a1a',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Ambient glow when online */}
      {isOnline && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: '-5%',
            width: '55%',
            height: '100%',
            background:
              'radial-gradient(ellipse at 0% 40%, rgba(0,255,65,0.04) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Section label */}
      <motion.p
        initial={{ opacity: 0, x: -16 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '0.65rem',
          letterSpacing: '0.3em',
          color: '#00ff41',
          textTransform: 'uppercase',
          marginBottom: '2rem',
        }}
      >
        01 — SERVER
      </motion.p>

      {/* ── Status row ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'clamp(1rem, 2.5vw, 2rem)',
          flexWrap: 'wrap',
        }}
      >
        {/* Pulsing orb */}
        <motion.div
          initial={{ opacity: 0, scale: 0.4 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          style={{ position: 'relative', width: 18, height: 18, flexShrink: 0 }}
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
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              background: loading ? '#222' : isOnline ? '#00ff41' : '#ff3333',
              boxShadow: isOnline && !loading ? '0 0 14px rgba(0,255,65,0.7), 0 0 4px rgba(0,255,65,1)' : 'none',
              transition: 'background 0.5s ease, box-shadow 0.5s ease',
              zIndex: 1,
            }}
          />
        </motion.div>

        {/* Server icon */}
        {data?.icon && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.05 }}
            style={{
              flexShrink: 0,
              border: '1px solid #1a1a1a',
              lineHeight: 0,
              boxShadow: isOnline ? '0 0 16px rgba(0,255,65,0.08)' : 'none',
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
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 'clamp(3rem, 7vw, 6.5rem)',
              fontWeight: 900,
              letterSpacing: '-0.03em',
              lineHeight: 1,
              color: loading ? '#222' : isOnline ? '#00ff41' : '#ff3333',
              textShadow: isOnline && !loading ? '0 0 60px rgba(0,255,65,0.25)' : 'none',
              transition: 'color 0.5s ease, text-shadow 0.5s ease',
            }}
          >
            {loading ? '· · ·' : isOnline ? 'ONLINE' : 'OFFLINE'}
          </motion.h2>

          {!loading && isOnline && motd && (
            <motion.p
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.25 }}
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '0.65rem',
                color: '#444',
                letterSpacing: '0.1em',
                lineHeight: 1,
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
            style={{ marginLeft: 'auto' }}
          >
            <p
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '0.5rem',
                color: '#333',
                letterSpacing: '0.25em',
                textTransform: 'uppercase',
                marginBottom: '0.15rem',
              }}
            >
              PLAYERS ONLINE
            </p>
            <p
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: 'clamp(1.5rem, 3vw, 2.5rem)',
                fontWeight: 800,
                letterSpacing: '-0.02em',
                color: '#f0f0f0',
                lineHeight: 1,
                textAlign: 'right',
              }}
            >
              {playerCount}
              <span
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '0.75rem',
                  fontWeight: 400,
                  color: '#2a2a2a',
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
          transition={{ duration: 0.9, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
          style={{
            height: '1px',
            background: isOnline
              ? 'linear-gradient(to right, rgba(0,255,65,0.6), rgba(0,255,65,0.1) 40%, transparent)'
              : 'linear-gradient(to right, rgba(255,51,51,0.5), rgba(255,51,51,0.08) 40%, transparent)',
            margin: '2.5rem 0 3rem',
            transformOrigin: 'left',
          }}
        />
      )}

      {/* ── THE CREW subsection ── */}
      {!loading && (
        <>
          {/* Sub-heading */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            style={{ marginBottom: '1.5rem' }}
          >
            <p
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '0.55rem',
                letterSpacing: '0.3em',
                color: '#2a2a2a',
                textTransform: 'uppercase',
                marginBottom: '0.25rem',
              }}
            >
              WHO&apos;S IN
            </p>
            <h3
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: 'clamp(1.8rem, 4vw, 3rem)',
                fontWeight: 900,
                letterSpacing: '-0.02em',
                color: '#f0f0f0',
                lineHeight: 1,
              }}
            >
              THE CREW
              <span
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '0.6rem',
                  fontWeight: 400,
                  letterSpacing: '0.2em',
                  color: '#2a2a2a',
                  marginLeft: '1rem',
                  verticalAlign: 'middle',
                }}
              >
                {CREW.length} MEMBERS
              </span>
            </h3>
          </motion.div>

          {/* Crew grid */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.65rem',
            }}
          >
            {CREW.map((name, i) => (
              <CrewCard
                key={name}
                name={name}
                isOnline={onlineNames.has(name.toLowerCase())}
                index={i}
              />
            ))}
          </div>

          {/* Online count hint */}
          {isOnline && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.6 }}
              style={{
                marginTop: '1.25rem',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '0.5rem',
                color: '#1e1e1e',
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

      {/* Last updated */}
      {lastUpdated && (
        <p
          style={{
            marginTop: '2rem',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '0.48rem',
            color: '#1a1a1a',
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

'use client';

import { motion } from 'framer-motion';
import { useEffect, useState, useCallback } from 'react';

interface Player {
  name: string;
  uuid: string;
}

interface ServerData {
  online: boolean;
  players?: {
    online: number;
    max: number;
    list?: Player[];
  };
  motd?: {
    clean?: string[];
  };
  icon?: string;
  version?: string;
}

const HEAD_SOURCES = (uuid: string, name: string) => [
  `https://mc-heads.net/head/${uuid}/128`,
  `https://crafatar.com/renders/head/${uuid}?size=128&overlay=true`,
  `https://minotar.net/helm/${name}/128`,
];

function PlayerCard({ player, index }: { player: Player; index: number }) {
  const [hovered, setHovered] = useState(false);
  const [srcIndex, setSrcIndex] = useState(0);
  const sources = HEAD_SOURCES(player.uuid, player.name);
  const allFailed = srcIndex >= sources.length;

  const handleImgError = () => {
    if (srcIndex < sources.length - 1) {
      setSrcIndex((i) => i + 1);
    } else {
      setSrcIndex(sources.length); // mark all failed
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.45, delay: 0.2 + index * 0.08, ease: [0.16, 1, 0.3, 1] }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: '#0d0d0d',
        border: `1px solid ${hovered ? 'rgba(0,255,65,0.35)' : '#1a1a1a'}`,
        padding: '1.25rem 1rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.75rem',
        width: 110,
        position: 'relative',
        transition: 'border-color 0.3s ease, transform 0.3s ease, box-shadow 0.3s ease',
        transform: hovered ? 'translateY(-6px)' : 'translateY(0)',
        boxShadow: hovered
          ? '0 8px 32px rgba(0,255,65,0.12), 0 0 1px rgba(0,255,65,0.3)'
          : 'none',
      }}
    >
      {/* Online dot */}
      <span
        style={{
          position: 'absolute',
          top: '0.5rem',
          right: '0.5rem',
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: '#00ff41',
          boxShadow: '0 0 8px rgba(0,255,65,0.9)',
        }}
      />

      {/* Head render */}
      {!allFailed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={sources[srcIndex]}
          alt={player.name}
          width={64}
          height={64}
          onError={handleImgError}
          style={{
            imageRendering: 'pixelated',
            transform: hovered ? 'scale(1.1) translateY(-2px)' : 'scale(1)',
            transition: 'transform 0.35s ease',
            filter: hovered ? 'drop-shadow(0 4px 12px rgba(0,255,65,0.25))' : 'none',
          }}
        />
      ) : (
        <div
          style={{
            width: 64,
            height: 64,
            background: '#111',
            border: '1px solid #1a1a1a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: '1.75rem',
            fontWeight: 900,
            color: '#00ff41',
          }}
        >
          {player.name.charAt(0).toUpperCase()}
        </div>
      )}

      {/* Name */}
      <p
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '0.6rem',
          fontWeight: 600,
          letterSpacing: '0.08em',
          color: hovered ? '#00ff41' : '#888',
          textTransform: 'uppercase',
          textAlign: 'center',
          transition: 'color 0.3s ease',
          wordBreak: 'break-all',
          lineHeight: 1.3,
        }}
      >
        {player.name}
      </p>
    </motion.div>
  );
}

export default function ServerStatus() {
  const [data, setData] = useState<ServerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState('');

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(
        'https://api.mcsrvstat.us/3/stebbias.exaroton.me',
        { cache: 'no-store' }
      );
      const json: ServerData = await res.json();
      setData(json);
      setLastUpdated(
        new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      );
    } catch {
      setData({ online: false });
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
  const players = data?.players?.list ?? [];
  const motd = data?.motd?.clean?.[0] ?? '';

  return (
    <section
      style={{
        padding: 'clamp(4rem, 10vw, 8rem) clamp(1.5rem, 6vw, 5rem)',
        borderBottom: '1px solid #1a1a1a',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Ambient glow */}
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

      {/* Status row: orb + icon + ONLINE + player count */}
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
                style={{
                  position: 'absolute',
                  inset: -1,
                  borderRadius: '50%',
                  background: '#00ff41',
                }}
              />
              <span
                className="status-ring status-ring-delay"
                style={{
                  position: 'absolute',
                  inset: -1,
                  borderRadius: '50%',
                  background: '#00ff41',
                }}
              />
            </>
          )}
          <span
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              background: loading ? '#222' : isOnline ? '#00ff41' : '#ff3333',
              boxShadow:
                isOnline && !loading
                  ? '0 0 14px rgba(0,255,65,0.7), 0 0 4px rgba(0,255,65,1)'
                  : 'none',
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
              fontSize: 'clamp(2.5rem, 6vw, 5rem)',
              fontWeight: 900,
              letterSpacing: '-0.03em',
              lineHeight: 1,
              color: loading ? '#222' : isOnline ? '#00ff41' : '#ff3333',
              textShadow:
                isOnline && !loading ? '0 0 60px rgba(0,255,65,0.25)' : 'none',
              transition: 'color 0.5s ease, text-shadow 0.5s ease',
            }}
          >
            {loading ? '· · ·' : isOnline ? 'ONLINE' : 'OFFLINE'}
          </motion.h2>

          {/* MOTD */}
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

      {/* Gradient divider */}
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
            margin: '2.5rem 0',
            transformOrigin: 'left',
          }}
        />
      )}

      {/* Player cards */}
      {!loading && isOnline && (
        <>
          {players.length === 0 ? (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '0.65rem',
                color: '#2a2a2a',
                letterSpacing: '0.25em',
                textTransform: 'uppercase',
              }}
            >
              NO PLAYERS ONLINE
            </motion.p>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
              {players.map((player, i) => (
                <PlayerCard key={player.uuid || player.name} player={player} index={i} />
              ))}
            </div>
          )}
        </>
      )}

      {/* Last updated */}
      {lastUpdated && (
        <p
          style={{
            marginTop: '2.5rem',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '0.48rem',
            color: '#1e1e1e',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
          }}
        >
          UPDATED {lastUpdated} · REFRESHES EVERY 60S
        </p>
      )}
    </section>
  );
}

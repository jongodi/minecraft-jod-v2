'use client';

import { motion, useInView } from 'framer-motion';
import { useRef, useState, useEffect } from 'react';
import type { PlayerStat, StatsResponse } from '@/app/api/stats/route';

type StatKey = 'deaths' | 'mobKills' | 'playTimeHours' | 'distanceWalked' | 'itemsCrafted';

interface Tab { id: StatKey; label: string; unit: string; format: (v: number) => string }

const TABS: Tab[] = [
  { id: 'playTimeHours',   label: 'PLAYTIME',  unit: 'hrs',  format: v => `${v}h`   },
  { id: 'mobKills',        label: 'KILLS',     unit: 'mobs', format: v => v.toLocaleString() },
  { id: 'deaths',          label: 'DEATHS',    unit: '',     format: v => v.toLocaleString() },
  { id: 'itemsCrafted',    label: 'CRAFTED',   unit: 'items',format: v => v.toLocaleString() },
  { id: 'distanceWalked',  label: 'WALKED',    unit: 'km',   format: v => `${(v / 100000).toFixed(1)} km` },
];

function LeaderboardRow({
  player,
  rank,
  tab,
  maxVal,
}: {
  player:  PlayerStat;
  rank:    number;
  tab:     Tab;
  maxVal:  number;
}) {
  const value    = player[tab.id] as number;
  const barWidth = maxVal > 0 ? (value / maxVal) * 100 : 0;
  const isGold   = rank === 1;

  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35, delay: (rank - 1) * 0.07 }}
      style={{
        display:    'flex',
        alignItems: 'center',
        gap:        '0.75rem',
        padding:    '0.7rem 1rem',
        background: isGold ? '#f0a50008' : '#0d0d0d',
        border:     `1px solid ${isGold ? '#f0a50033' : '#1a1a1a'}`,
        position:   'relative',
        overflow:   'hidden',
      }}
    >
      {/* Bar fill */}
      <div style={{
        position:   'absolute',
        left: 0, top: 0, bottom: 0,
        width:      `${barWidth}%`,
        background: isGold ? '#f0a50012' : '#ffffff04',
        transition: 'width 0.6s cubic-bezier(0.16,1,0.3,1)',
        pointerEvents: 'none',
      }} />

      {/* Rank */}
      <span style={{
        fontFamily:    "'JetBrains Mono', monospace",
        fontSize:      '0.6rem',
        color:         isGold ? '#f0a500' : '#333',
        width:         '1.5rem',
        textAlign:     'right',
        flexShrink:    0,
        letterSpacing: '0.05em',
        position:      'relative',
      }}>
        #{rank}
      </span>

      {/* Avatar */}
      <div style={{ width: '28px', height: '28px', flexShrink: 0, imageRendering: 'pixelated', border: `1px solid ${isGold ? '#f0a50033' : '#1a1a1a'}`, overflow: 'hidden', position: 'relative' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`https://mc-heads.net/head/${player.username}/64`}
          alt={player.username}
          style={{ width: '100%', height: '100%', objectFit: 'cover', imageRendering: 'pixelated' }}
          onError={(e) => {
            (e.target as HTMLImageElement).src = `https://minotar.net/helm/${player.username}/64`;
          }}
        />
      </div>

      {/* Username */}
      <span style={{
        fontFamily:    "'Space Grotesk', sans-serif",
        fontSize:      '0.85rem',
        fontWeight:    600,
        color:         isGold ? '#f0c040' : '#aaa',
        flex:          1,
        position:      'relative',
      }}>
        {player.username}
      </span>

      {/* Value */}
      <span style={{
        fontFamily:    "'JetBrains Mono', monospace",
        fontSize:      '0.75rem',
        color:         isGold ? '#f0a500' : '#555',
        position:      'relative',
        fontWeight:    isGold ? 700 : 400,
        letterSpacing: '0.02em',
      }}>
        {tab.format(value)}
      </span>
    </motion.div>
  );
}

export default function StatsSection() {
  const headerRef = useRef<HTMLDivElement>(null);
  const isInView  = useInView(headerRef, { once: true, margin: '-80px' });
  const [stats,   setStats]   = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<StatKey>('playTimeHours');

  useEffect(() => {
    if (!isInView || loading || stats) return;
    setLoading(true);
    fetch('/api/stats')
      .then(r => r.json())
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isInView, loading, stats]);

  const tab = TABS.find(t => t.id === activeTab) ?? TABS[0];

  const sorted = [...(stats?.players ?? [])]
    .sort((a, b) => (b[tab.id] as number) - (a[tab.id] as number));

  const maxVal = sorted[0] ? (sorted[0][tab.id] as number) : 0;

  const mono = "'JetBrains Mono', monospace";
  const sans = "'Space Grotesk', sans-serif";
  const green = '#00ff41';

  return (
    <section
      id="stats"
      style={{
        padding:      'clamp(4rem, 10vw, 8rem) clamp(1.5rem, 6vw, 5rem)',
        borderBottom: '1px solid #1a1a1a',
        background:   '#080808',
      }}
    >
      {/* Header */}
      <div ref={headerRef} style={{ marginBottom: '2.5rem' }}>
        <motion.p
          initial={{ opacity: 0, x: -16 }}
          animate={isInView ? { opacity: 1, x: 0 } : {}}
          style={{ fontFamily: mono, fontSize: '0.65rem', letterSpacing: '0.3em', color: green, textTransform: 'uppercase', marginBottom: '0.75rem' }}
        >
          05 — LEADERBOARD
        </motion.p>
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.1 }}
          style={{ fontFamily: sans, fontSize: 'clamp(2.5rem, 6vw, 5rem)', fontWeight: 900, letterSpacing: '-0.03em', color: '#f0f0f0', lineHeight: 1 }}
        >
          STATS
        </motion.h2>
      </div>

      {/* Unavailable notice */}
      {stats?.source === 'unavailable' && (
        <p style={{ fontFamily: mono, fontSize: '0.65rem', color: '#2a2a2a', letterSpacing: '0.1em', marginBottom: '1.5rem' }}>
          Stats unavailable — server may be offline or Exaroton not configured.
        </p>
      )}

      {loading && (
        <p style={{ fontFamily: mono, fontSize: '0.65rem', color: '#333', letterSpacing: '0.2em', marginBottom: '1.5rem' }}>
          LOADING STATS...
        </p>
      )}

      {/* Tab switcher */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #1a1a1a', marginBottom: '1.5rem', overflowX: 'auto' }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={{
              fontFamily:    mono,
              fontSize:      '0.55rem',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              padding:       '0.5rem 0.9rem',
              background:    'none',
              border:        'none',
              borderBottom:  `2px solid ${activeTab === t.id ? green : 'transparent'}`,
              color:         activeTab === t.id ? green : '#333',
              cursor:        'pointer',
              whiteSpace:    'nowrap',
              transition:    'color 0.2s, border-color 0.2s',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Leaderboard */}
      {sorted.length > 0 ? (
        <div style={{ maxWidth: '600px', display: 'flex', flexDirection: 'column', gap: '1px' }}>
          {sorted.map((player, i) => (
            <LeaderboardRow
              key={player.username}
              player={player}
              rank={i + 1}
              tab={tab}
              maxVal={maxVal}
            />
          ))}
        </div>
      ) : (
        !loading && stats?.source === 'exaroton' && (
          <p style={{ fontFamily: mono, fontSize: '0.65rem', color: '#2a2a2a' }}>No stat data found.</p>
        )
      )}
    </section>
  );
}

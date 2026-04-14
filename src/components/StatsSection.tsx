'use client';

import { motion, useInView } from 'framer-motion';
import { useRef, useState, useEffect } from 'react';
import type { PlayerStat, StatsResponse, StatGrowth } from '@/app/api/stats/route';
import { formatAge } from '@/lib/format';

type StatKey = 'deaths' | 'mobKills' | 'playTimeHours' | 'distanceWalked' | 'itemsCrafted';

interface Tab { id: StatKey; label: string; unit: string; format: (v: number) => string }

const TABS: Tab[] = [
  { id: 'playTimeHours',  label: 'PLAYTIME', unit: 'hrs',  format: v => `${v}h`  },
  { id: 'mobKills',       label: 'KILLS',    unit: 'mobs', format: v => v.toLocaleString() },
  { id: 'deaths',         label: 'DEATHS',   unit: '',     format: v => v.toLocaleString() },
  { id: 'itemsCrafted',   label: 'CRAFTED',  unit: 'items',format: v => v.toLocaleString() },
  { id: 'distanceWalked', label: 'WALKED',   unit: 'km',   format: v => `${(v / 100000).toFixed(1)} km` },
];

function GrowthBadge({ delta, tab }: { delta: number; tab: Tab }) {
  if (delta === 0) return null;
  const positive = delta > 0;
  const label    = positive
    ? `+${tab.format(delta)}`
    : tab.format(delta);
  return (
    <span style={{
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: '0.48rem',
      color: positive ? '#00ff41' : '#ff4444',
      background: positive ? 'rgba(0,255,65,0.07)' : 'rgba(255,68,68,0.07)',
      border: `1px solid ${positive ? 'rgba(0,255,65,0.2)' : 'rgba(255,68,68,0.2)'}`,
      padding: '0.1rem 0.35rem',
      borderRadius: 2,
      letterSpacing: '0.05em',
      whiteSpace: 'nowrap',
      flexShrink: 0,
    }}>
      {positive ? '↑' : '↓'}{label.replace(/^[+-]/, '')}
    </span>
  );
}

function LeaderboardRow({
  player, rank, tab, maxVal, growth,
}: { player: PlayerStat; rank: number; tab: Tab; maxVal: number; growth?: StatGrowth }) {
  const value    = player[tab.id] as number;
  const barWidth = maxVal > 0 ? (value / maxVal) * 100 : 0;
  const isGold   = rank === 1;
  const delta    = growth?.[player.username]?.[tab.id] as number | undefined;

  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35, delay: (rank - 1) * 0.07 }}
      style={{
        display: 'flex', alignItems: 'center', gap: '0.75rem',
        padding: '0.7rem 1rem',
        background: isGold ? '#f0a50008' : '#0d0d0d',
        border: `1px solid ${isGold ? '#f0a50033' : '#1a1a1a'}`,
        position: 'relative', overflow: 'hidden',
      }}
    >
      {/* Bar fill */}
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0,
        width: `${barWidth}%`,
        background: isGold ? 'rgba(240,165,0,0.04)' : 'rgba(0,255,65,0.03)',
        transition: 'width 0.6s ease',
        pointerEvents: 'none',
      }} />

      {/* Rank */}
      <span style={{
        fontFamily: "'JetBrains Mono', monospace", fontSize: '0.55rem',
        color: isGold ? '#f0a500' : '#333', letterSpacing: '0.05em',
        width: '1.2rem', textAlign: 'center', flexShrink: 0, position: 'relative',
      }}>
        {isGold ? '★' : `#${rank}`}
      </span>

      {/* Username */}
      <span style={{
        fontFamily: "'Space Grotesk', sans-serif", fontSize: '0.85rem',
        fontWeight: isGold ? 700 : 500, color: isGold ? '#f0a500' : '#ccc',
        flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        position: 'relative',
      }}>
        {player.username}
      </span>

      {/* Weekly growth badge */}
      {delta !== undefined && <GrowthBadge delta={delta} tab={tab} />}

      {/* Value */}
      <span style={{
        fontFamily: "'JetBrains Mono', monospace", fontSize: '0.75rem',
        color: isGold ? '#f0a500' : '#555', position: 'relative',
        fontWeight: isGold ? 700 : 400, letterSpacing: '0.02em',
      }}>
        {tab.format(value)}
      </span>
    </motion.div>
  );
}

export default function StatsSection() {
  const headerRef  = useRef<HTMLDivElement>(null);
  const isInView   = useInView(headerRef, { once: true, margin: '-80px' });
  const [stats,    setStats]    = useState<StatsResponse | null>(null);
  const [loading,  setLoading]  = useState(false);
  const [activeTab,setActiveTab]= useState<StatKey>('playTimeHours');

  useEffect(() => {
    if (!isInView || loading || stats) return;
    setLoading(true);
    fetch('/api/stats')
      .then(r => r.json())
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isInView, loading, stats]);

  const tab    = TABS.find(t => t.id === activeTab) ?? TABS[0];
  const sorted = [...(stats?.players ?? [])].sort((a, b) => (b[tab.id] as number) - (a[tab.id] as number));
  const maxVal = sorted[0] ? (sorted[0][tab.id] as number) : 0;

  const mono  = "'JetBrains Mono', monospace";
  const sans  = "'Space Grotesk', sans-serif";
  const green = '#00ff41';

  return (
    <section id="stats" style={{ padding: 'clamp(4rem, 10vw, 8rem) clamp(1.5rem, 6vw, 5rem)', borderBottom: '1px solid #1a1a1a', background: '#080808' }}>
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

      {loading && (
        <div style={{ maxWidth: '600px' }}>
          {/* Tab skeleton */}
          <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #1a1a1a', marginBottom: '1.5rem' }}>
            {[80, 60, 70, 75, 65].map((w, i) => (
              <div key={i} style={{ width: w, height: 28, margin: '0 2px', background: '#111', animation: 'skeleton-pulse 1.4s ease-in-out infinite', animationDelay: `${i * 0.1}s` }} />
            ))}
          </div>
          {/* Row skeletons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
            {[1,2,3,4,5,6,7,8].map(i => (
              <div key={i} style={{ height: 44, background: '#0d0d0d', border: '1px solid #1a1a1a', display: 'flex', alignItems: 'center', padding: '0 1rem', gap: '0.75rem' }}>
                <div style={{ width: 18, height: 8, background: '#111', borderRadius: 2, animation: 'skeleton-pulse 1.4s ease-in-out infinite', animationDelay: `${i * 0.07}s` }} />
                <div style={{ width: `${55 + (i % 3) * 20}px`, height: 8, background: '#111', borderRadius: 2, animation: 'skeleton-pulse 1.4s ease-in-out infinite', animationDelay: `${i * 0.07 + 0.1}s` }} />
                <div style={{ marginLeft: 'auto', width: 48, height: 8, background: '#111', borderRadius: 2, animation: 'skeleton-pulse 1.4s ease-in-out infinite', animationDelay: `${i * 0.07 + 0.2}s` }} />
              </div>
            ))}
          </div>
          <style>{`
            @keyframes skeleton-pulse {
              0%, 100% { opacity: 0.4; }
              50%       { opacity: 0.9; }
            }
          `}</style>
        </div>
      )}

      {/* Source indicator */}
      {!loading && stats && stats.source !== 'unavailable' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
          {stats.source === 'live' && (
            <>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: green, boxShadow: `0 0 6px ${green}`, display: 'inline-block' }} />
              <span style={{ fontFamily: mono, fontSize: '0.5rem', color: '#444', letterSpacing: '0.15em' }}>LIVE DATA</span>
            </>
          )}
          {stats.source === 'cached' && stats.cachedAt && (
            <>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f0a500', display: 'inline-block' }} />
              <span style={{ fontFamily: mono, fontSize: '0.5rem', color: '#444', letterSpacing: '0.15em' }}>
                LAST UPDATED {formatAge(stats.cachedAt).toUpperCase()} — SERVER OFFLINE
              </span>
            </>
          )}
        </div>
      )}

      {/* Unavailable state */}
      {!loading && stats?.source === 'unavailable' && (
        <div style={{ maxWidth: '480px' }}>
          <p style={{ fontFamily: mono, fontSize: '0.65rem', color: '#2a2a2a', letterSpacing: '0.1em', lineHeight: 1.8, margin: 0 }}>
            LEADERBOARD COMING SOON
          </p>
          <p style={{ fontFamily: sans, fontSize: '0.95rem', color: '#333', marginTop: '0.5rem', lineHeight: 1.6 }}>
            Stats tracking is being set up. Check back after the crew has been playing for a while.
          </p>
        </div>
      )}

      {/* Tab switcher */}
      {sorted.length > 0 && (
        <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #1a1a1a', marginBottom: '1.5rem', overflowX: 'auto' }}>
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              style={{
                fontFamily: mono, fontSize: '0.55rem', letterSpacing: '0.2em', textTransform: 'uppercase',
                padding: '0.5rem 0.9rem', background: 'none', border: 'none',
                borderBottom: `2px solid ${activeTab === t.id ? green : 'transparent'}`,
                color: activeTab === t.id ? green : '#333',
                cursor: 'pointer', whiteSpace: 'nowrap', transition: 'color 0.2s, border-color 0.2s',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* Leaderboard */}
      {sorted.length > 0 && (
        <div style={{ maxWidth: '600px', display: 'flex', flexDirection: 'column', gap: '1px' }}>
          {sorted.map((player, i) => (
            <LeaderboardRow key={player.username} player={player} rank={i + 1} tab={tab} maxVal={maxVal} growth={stats?.growth} />
          ))}
        </div>
      )}
    </section>
  );
}

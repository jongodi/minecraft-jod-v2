'use client';

import { motion, useInView } from 'framer-motion';
import { useRef, useState, useEffect } from 'react';
import type { PlayerStat, StatsResponse } from '@/app/api/stats/route';
import { formatAge } from '@/lib/format';

type StatKey = 'deaths' | 'mobKills' | 'playTimeHours' | 'distanceWalked' | 'itemsCrafted';

interface Tab { id: StatKey; label: string; format: (v: number) => string }

const TABS: Tab[] = [
  { id: 'playTimeHours',  label: 'PLAYTIME', format: v => `${v}h`  },
  { id: 'mobKills',       label: 'KILLS',    format: v => v.toLocaleString() },
  { id: 'deaths',         label: 'DEATHS',   format: v => v.toLocaleString() },
  { id: 'itemsCrafted',   label: 'CRAFTED',  format: v => v.toLocaleString() },
  { id: 'distanceWalked', label: 'WALKED',   format: v => `${(v / 100000).toFixed(1)} km` },
];

function LeaderboardRow({ player, rank, tab, maxVal }: { player: PlayerStat; rank: number; tab: Tab; maxVal: number }) {
  const value    = player[tab.id] as number;
  const barWidth = maxVal > 0 ? (value / maxVal) * 100 : 0;
  const isGold   = rank === 1;
  const isSilver = rank === 2;
  const isBronze = rank === 3;

  const rankColor = isGold ? '#f0a500' : isSilver ? '#9aa0b0' : isBronze ? '#c0785a' : '#1e2230';
  const nameColor = isGold ? '#f0a500' : isSilver ? '#9aa0b0' : '#dde1ec';

  return (
    <motion.div
      initial={{ opacity: 0, x: -14 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35, delay: Math.min((rank - 1) * 0.07, 0.4) }}
      style={{
        display:    'flex',
        alignItems: 'center',
        gap:        '0.75rem',
        padding:    '0.7rem 1rem',
        background: isGold ? 'rgba(240,165,0,0.05)' : '#0d1018',
        border:     `1px solid ${isGold ? 'rgba(240,165,0,0.18)' : '#1c2030'}`,
        position:   'relative',
        overflow:   'hidden',
      }}
    >
      {/* Bar fill */}
      <div style={{
        position:   'absolute',
        left: 0, top: 0, bottom: 0,
        width:      `${barWidth}%`,
        background: isGold ? 'rgba(240,165,0,0.04)' : 'rgba(0,255,65,0.025)',
        transition: 'width 0.7s ease',
        pointerEvents: 'none',
      }} />

      {/* Rank */}
      <span style={{
        fontFamily:    "'JetBrains Mono', monospace",
        fontSize:      '0.55rem',
        color:         rankColor,
        letterSpacing: '0.05em',
        width:         '1.5rem',
        textAlign:     'center',
        flexShrink:    0,
        position:      'relative',
        fontWeight:    isGold ? 700 : 400,
      }}>
        {isGold ? '★' : `#${rank}`}
      </span>

      {/* Username */}
      <span style={{
        fontFamily:    "'Space Grotesk', sans-serif",
        fontSize:      '0.88rem',
        fontWeight:    isGold ? 700 : 500,
        color:         nameColor,
        flex:          1,
        overflow:      'hidden',
        textOverflow:  'ellipsis',
        whiteSpace:    'nowrap',
        position:      'relative',
      }}>
        {player.username}
      </span>

      {/* Value */}
      <span style={{
        fontFamily:    "'JetBrains Mono', monospace",
        fontSize:      '0.72rem',
        color:         isGold ? '#f0a500' : '#505770',
        position:      'relative',
        fontWeight:    isGold ? 600 : 400,
        letterSpacing: '0.02em',
        flexShrink:    0,
      }}>
        {tab.format(value)}
      </span>
    </motion.div>
  );
}

export default function StatsSection() {
  const headerRef               = useRef<HTMLDivElement>(null);
  const isInView                = useInView(headerRef, { once: true, margin: '-80px' });
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

  return (
    <section
      id="stats"
      style={{
        padding:      'clamp(5rem, 12vw, 9rem) clamp(1.5rem, 6vw, 5rem)',
        borderBottom: '1px solid #1c2030',
        background:   '#06080c',
      }}
    >
      <div ref={headerRef} style={{ marginBottom: 'clamp(2.5rem, 5vw, 4rem)' }}>
        <motion.p
          initial={{ opacity: 0, x: -14 }}
          animate={isInView ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="section-label"
        >
          05 — LEADERBOARD
        </motion.p>
        <motion.h2
          initial={{ opacity: 0, y: 14 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.65, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
          style={{
            fontFamily:    "'Space Grotesk', sans-serif",
            fontSize:      'clamp(3rem, 7vw, 6rem)',
            fontWeight:    900,
            letterSpacing: '-0.03em',
            color:         '#dde1ec',
            lineHeight:    0.95,
          }}
        >
          STATS
        </motion.h2>
      </div>

      {loading && (
        <p style={{
          fontFamily:    "'JetBrains Mono', monospace",
          fontSize:      '0.58rem',
          color:         '#1e2230',
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          marginBottom:  '1.5rem',
        }}>
          LOADING STATS...
        </p>
      )}

      {/* Source indicator */}
      {!loading && stats && stats.source !== 'unavailable' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
          {stats.source === 'live' && (
            <>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#00ff41', boxShadow: '0 0 5px rgba(0,255,65,0.8)', display: 'inline-block' }} />
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.5rem', color: '#505770', letterSpacing: '0.15em' }}>LIVE DATA</span>
            </>
          )}
          {stats.source === 'cached' && stats.cachedAt && (
            <>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#f0a500', display: 'inline-block' }} />
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.5rem', color: '#505770', letterSpacing: '0.15em' }}>
                LAST UPDATED {formatAge(stats.cachedAt).toUpperCase()} — SERVER OFFLINE
              </span>
            </>
          )}
        </div>
      )}

      {/* Unavailable state */}
      {!loading && stats?.source === 'unavailable' && (
        <div style={{ maxWidth: '480px' }}>
          <p style={{
            fontFamily:    "'JetBrains Mono', monospace",
            fontSize:      '0.62rem',
            color:         '#1e2230',
            letterSpacing: '0.12em',
            lineHeight:    1.8,
            margin:        0,
          }}>
            LEADERBOARD COMING SOON
          </p>
          <p style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize:   '0.95rem',
            color:      '#505770',
            marginTop:  '0.5rem',
            lineHeight: 1.6,
          }}>
            Stats tracking is being set up. Check back after the crew has been playing for a while.
          </p>
        </div>
      )}

      {/* Tabs */}
      {sorted.length > 0 && (
        <div style={{
          display:       'flex',
          gap:           0,
          borderBottom:  '1px solid #1c2030',
          marginBottom:  '1.25rem',
          overflowX:     'auto',
        }}>
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              style={{
                fontFamily:     "'JetBrains Mono', monospace",
                fontSize:       '0.5rem',
                letterSpacing:  '0.22em',
                textTransform:  'uppercase',
                padding:        '0.5rem 0.9rem',
                background:     'none',
                border:         'none',
                borderBottom:   `2px solid ${activeTab === t.id ? '#00ff41' : 'transparent'}`,
                color:          activeTab === t.id ? '#00ff41' : '#1e2230',
                cursor:         'pointer',
                whiteSpace:     'nowrap',
                transition:     'color 0.2s, border-color 0.2s',
              }}
              onMouseEnter={e => { if (activeTab !== t.id) e.currentTarget.style.color = '#505770'; }}
              onMouseLeave={e => { if (activeTab !== t.id) e.currentTarget.style.color = '#1e2230'; }}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* Leaderboard */}
      {sorted.length > 0 && (
        <div style={{ maxWidth: '560px', display: 'flex', flexDirection: 'column', gap: '1px' }}>
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
      )}
    </section>
  );
}

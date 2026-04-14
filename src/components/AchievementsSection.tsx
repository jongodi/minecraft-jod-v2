'use client';

import { motion, useInView } from 'framer-motion';
import { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { PlayerStat, StatsResponse } from '@/app/api/stats/route';

interface BadgeDef {
  id: string;
  label: string;
  category: string;
  tier: number;
  check: (s: PlayerStat) => boolean;
}

const BADGE_DEFS: BadgeDef[] = [
  { id: 'played-10h',   label: 'Newbie',         category: 'playtime', tier: 1, check: s => s.playTimeHours  >= 10    },
  { id: 'played-100h',  label: 'Active Player',  category: 'playtime', tier: 2, check: s => s.playTimeHours  >= 100   },
  { id: 'played-500h',  label: 'MVP Player',     category: 'playtime', tier: 3, check: s => s.playTimeHours  >= 500   },
  { id: 'kills-100',    label: '100 Mob Kills',  category: 'kills',    tier: 1, check: s => s.mobKills       >= 100   },
  { id: 'kills-1k',     label: 'Mob Slayer',     category: 'kills',    tier: 2, check: s => s.mobKills       >= 1000  },
  { id: 'kills-5k',     label: 'Mob Butcher',    category: 'kills',    tier: 3, check: s => s.mobKills       >= 5000  },
  { id: 'walked-100km', label: 'Map Explorer',   category: 'distance', tier: 1, check: s => s.distanceWalked >= 100 * 100_000 },
  { id: 'walked-500km', label: 'World Traveller',category: 'distance', tier: 2, check: s => s.distanceWalked >= 500 * 100_000 },
  { id: 'deaths-10',    label: 'Clumsy',         category: 'deaths',   tier: 1, check: s => s.deaths         >= 10   },
  { id: 'deaths-50',    label: 'Not So Lucky',   category: 'deaths',   tier: 2, check: s => s.deaths         >= 50   },
  { id: 'crafted-1k',   label: 'Crafter',        category: 'crafted',  tier: 1, check: s => s.itemsCrafted   >= 1000  },
  { id: 'pvp',          label: 'PvP',            category: 'pvp',      tier: 1, check: s => s.playerKills    >= 1    },
];

interface AchievementEntry {
  username: string;
  badge: BadgeDef;
}

function getBadgesForPlayer(stat: PlayerStat): BadgeDef[] {
  const topPerCategory = new Map<string, BadgeDef>();
  for (const b of BADGE_DEFS) {
    if (b.check(stat)) topPerCategory.set(b.category, b);
  }
  return Array.from(topPerCategory.values());
}

const mono  = "'JetBrains Mono', monospace";
const sans  = "'Space Grotesk', sans-serif";
const green = '#00ff41';
const gold  = '#f0a500';

export default function AchievementsSection() {
  const ref     = useRef<HTMLDivElement>(null);
  const inView  = useInView(ref, { once: true, margin: '-80px' });
  const [entries, setEntries] = useState<AchievementEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!inView || loading || entries.length) return;
    setLoading(true);
    fetch('/api/stats')
      .then(r => r.json())
      .then((data: StatsResponse) => {
        const all: AchievementEntry[] = [];
        for (const player of data.players) {
          for (const badge of getBadgesForPlayer(player)) {
            all.push({ username: player.username, badge });
          }
        }
        // Sort by tier desc then alphabetically for consistent order
        all.sort((a, b) => b.badge.tier - a.badge.tier || a.username.localeCompare(b.username));
        setEntries(all);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [inView, loading, entries.length]);

  if (!inView && !entries.length) return <div ref={ref} style={{ height: 1 }} />;

  return (
    <section
      id="achievements"
      ref={ref}
      style={{
        padding: 'clamp(4rem, 10vw, 8rem) clamp(1.5rem, 6vw, 5rem)',
        borderBottom: '1px solid #1a1a1a',
        background: '#060606',
      }}
    >
      {/* Header */}
      <motion.p
        initial={{ opacity: 0, x: -16 }}
        animate={inView ? { opacity: 1, x: 0 } : {}}
        style={{ fontFamily: mono, fontSize: '0.65rem', letterSpacing: '0.3em', color: green, textTransform: 'uppercase', marginBottom: '0.75rem' }}
      >
        06 — HALL OF FAME
      </motion.p>
      <motion.h2
        initial={{ opacity: 0, y: 16 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ delay: 0.1 }}
        style={{ fontFamily: sans, fontSize: 'clamp(2.5rem, 6vw, 5rem)', fontWeight: 900, letterSpacing: '-0.03em', color: '#f0f0f0', lineHeight: 1, marginBottom: '2.5rem' }}
      >
        ACHIEVEMENTS
      </motion.h2>

      {loading && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} style={{ height: 28, width: `${70 + (i % 4) * 25}px`, background: '#111', animation: 'skeleton-pulse 1.4s ease-in-out infinite', animationDelay: `${i * 0.06}s` }} />
          ))}
          <style>{`@keyframes skeleton-pulse { 0%,100%{opacity:0.4} 50%{opacity:0.9} }`}</style>
        </div>
      )}

      {!loading && entries.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', maxWidth: '900px' }}>
          {entries.map(({ username, badge }, i) => (
            <motion.div
              key={`${username}-${badge.id}`}
              initial={{ opacity: 0, scale: 0.85 }}
              animate={inView ? { opacity: 1, scale: 1 } : {}}
              transition={{ delay: i * 0.03, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            >
              <Link
                href={`/crew/${username}`}
                style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <span style={{
                  fontFamily: mono,
                  fontSize: '0.5rem',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: badge.tier >= 3 ? gold : badge.tier === 2 ? '#c0c0c0' : '#666',
                  background: badge.tier >= 3 ? 'rgba(240,165,0,0.06)' : badge.tier === 2 ? 'rgba(192,192,192,0.04)' : '#0d0d0d',
                  border: `1px solid ${badge.tier >= 3 ? 'rgba(240,165,0,0.25)' : badge.tier === 2 ? 'rgba(192,192,192,0.15)' : '#1a1a1a'}`,
                  padding: '0.25rem 0.55rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  transition: 'border-color 0.2s',
                }}>
                  {/* Player head tiny */}
                  <Image
                    src={`https://mc-heads.net/head/${username}/32`}
                    alt={username}
                    width={12}
                    height={12}
                    unoptimized
                    style={{ imageRendering: 'pixelated', flexShrink: 0 }}
                  />
                  <span style={{ color: '#888', marginRight: '0.1rem' }}>{username}</span>
                  <span style={{ color: '#333' }}>·</span>
                  {badge.label}
                </span>
              </Link>
            </motion.div>
          ))}
        </div>
      )}

      {!loading && entries.length === 0 && (
        <p style={{ fontFamily: mono, fontSize: '0.65rem', color: '#2a2a2a', letterSpacing: '0.1em' }}>
          No achievements yet — play more to earn badges.
        </p>
      )}
    </section>
  );
}

'use client';

import { useState, useEffect } from 'react';

const EMOJIS = ['🔥', '💚', '⚔️', '🏗️', '👑', '💀'] as const;

interface Props {
  photoId: string;
  isLoggedIn: boolean;
}

export default function PhotoReactions({ photoId, isLoggedIn }: Props) {
  const [counts, setCounts]       = useState<Record<string, number>>({});
  const [loading, setLoading]     = useState(false);
  const [userVote, setUserVote]   = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/crew/reactions?photoId=${encodeURIComponent(photoId)}`)
      .then(r => r.json())
      .then((d: Record<string, number>) => setCounts(d))
      .catch(() => {});
  }, [photoId]);

  async function react(emoji: string) {
    if (!isLoggedIn || loading) return;
    setLoading(true);
    try {
      const res = await fetch('/api/crew/reactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoId, emoji }),
      });
      if (res.ok) {
        const updated = await res.json() as Record<string, number>;
        setCounts(updated);
        setUserVote(prev => (prev === emoji ? null : emoji));
      }
    } catch { /* non-fatal */ }
    finally { setLoading(false); }
  }

  const total = Object.values(counts).reduce((s, n) => s + n, 0);
  if (total === 0 && !isLoggedIn) return null;

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', padding: '0.4rem 0.5rem', background: 'rgba(0,0,0,0.5)' }}>
      {EMOJIS.map(emoji => {
        const count = counts[emoji] ?? 0;
        const active = userVote === emoji;
        if (count === 0 && !isLoggedIn) return null;
        return (
          <button
            key={emoji}
            onClick={() => react(emoji)}
            disabled={!isLoggedIn || loading}
            style={{
              background:    active ? 'rgba(0,255,65,0.15)' : count > 0 ? 'rgba(255,255,255,0.05)' : 'transparent',
              border:        `1px solid ${active ? 'rgba(0,255,65,0.4)' : count > 0 ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)'}`,
              borderRadius:  2,
              padding:       '0.15rem 0.35rem',
              cursor:        isLoggedIn ? 'pointer' : 'default',
              display:       'flex',
              alignItems:    'center',
              gap:           '0.2rem',
              fontSize:      '0.75rem',
              lineHeight:    1,
              transition:    'border-color 0.15s, background 0.15s',
              opacity:       count === 0 && !isLoggedIn ? 0 : 1,
            }}
            title={isLoggedIn ? `React with ${emoji}` : undefined}
          >
            <span style={{ fontSize: '0.75rem' }}>{emoji}</span>
            {count > 0 && (
              <span style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize:   '0.45rem',
                color:      active ? '#00ff41' : '#888',
                letterSpacing: '0.05em',
              }}>
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

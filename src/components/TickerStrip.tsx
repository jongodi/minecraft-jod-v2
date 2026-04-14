'use client';

import { useEffect, useState } from 'react';

const STATIC_ITEMS = [
  'SURVIVAL',
  'COMMUNITY',
  'CUSTOM DATAPACKS',
  'CUSTOM RESOURCE PACK',
  'PLAY.JODCRAFT.WORLD',
  'SINCE 2024',
];

export default function TickerStrip() {
  const [items, setItems] = useState(STATIC_ITEMS);

  useEffect(() => {
    fetch('/api/server-status', { cache: 'no-store' })
      .then(r => r.json())
      .then((d: { online?: boolean; players?: { online?: number; max?: number } }) => {
        const dynamic: string[] = [];
        if (d.online) {
          const count = d.players?.online ?? 0;
          dynamic.push(`${count} PLAYER${count !== 1 ? 'S' : ''} ONLINE`);
        } else {
          dynamic.push('SERVER OFFLINE');
        }
        setItems([...STATIC_ITEMS.slice(0, 5), ...dynamic, STATIC_ITEMS[5]]);
      })
      .catch(() => {});
  }, []);

  // Duplicate for seamless loop
  const track = [...items, ...items];

  return (
    <div
      style={{
        borderTop: '1px solid #1a1a1a',
        borderBottom: '1px solid #1a1a1a',
        background: '#0a0a0a',
        overflow: 'hidden',
        padding: '0.75rem 0',
        position: 'relative',
        zIndex: 10,
      }}
    >
      {/* Fade edges */}
      <div
        style={{
          position: 'absolute', left: 0, top: 0, bottom: 0, width: '80px',
          background: 'linear-gradient(to right, #080808, transparent)',
          zIndex: 2, pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute', right: 0, top: 0, bottom: 0, width: '80px',
          background: 'linear-gradient(to left, #080808, transparent)',
          zIndex: 2, pointerEvents: 'none',
        }}
      />

      <div className="ticker-track" style={{ display: 'inline-flex', alignItems: 'center' }}>
        {track.map((item, idx) => {
          const isOnlineItem = item.includes('ONLINE') || item.includes('OFFLINE');
          const isGreen = isOnlineItem
            ? item.includes('ONLINE')
            : idx % items.length === 4; // PLAY.JODCRAFT.WORLD always green
          return (
            <span
              key={idx}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '0.65rem',
                letterSpacing: '0.25em',
                textTransform: 'uppercase',
                color: isGreen ? '#00ff41' : '#444444',
                fontWeight: isGreen ? 600 : 400,
              }}
            >
              {item}
              <span
                style={{
                  display: 'inline-block',
                  margin: '0 1.5rem',
                  color: '#1a1a1a',
                  fontSize: '0.5rem',
                }}
              >
                ◆
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
}

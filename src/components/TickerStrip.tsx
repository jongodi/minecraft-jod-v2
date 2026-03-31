'use client';

export default function TickerStrip() {
  const items = [
    'SURVIVAL',
    'COMMUNITY',
    'CUSTOM DATAPACKS',
    'CUSTOM RESOURCE PACK',
    'PLAY.JODCRAFT.WORLD',
    'SINCE 2024',
    'SURVIVAL',
    'COMMUNITY',
    'CUSTOM DATAPACKS',
    'CUSTOM RESOURCE PACK',
    'PLAY.JODCRAFT.WORLD',
    'SINCE 2024',
  ];

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
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: '80px',
          background: 'linear-gradient(to right, #080808, transparent)',
          zIndex: 2,
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          right: 0,
          top: 0,
          bottom: 0,
          width: '80px',
          background: 'linear-gradient(to left, #080808, transparent)',
          zIndex: 2,
          pointerEvents: 'none',
        }}
      />

      <div className="ticker-track" style={{ display: 'inline-flex', alignItems: 'center' }}>
        {[...items, ...items].map((item, idx) => (
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
              color: idx % 6 === 4 ? '#00ff41' : '#444444',
              fontWeight: idx % 6 === 4 ? 600 : 400,
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
        ))}
      </div>
    </div>
  );
}

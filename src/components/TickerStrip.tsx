'use client';

const TOP_ITEMS = [
  'SURVIVAL',
  'COMMUNITY',
  'CUSTOM DATAPACKS',
  'CUSTOM RESOURCE PACK',
  'PLAY.JODCRAFT.WORLD',
  'SINCE 2024',
];

const BOTTOM_ITEMS = [
  'PRIVATE SERVER',
  'WHITELIST ONLY',
  'JAVA EDITION',
  'JOD · 2024',
  'PLAY.JODCRAFT.WORLD',
  'INVITE ONLY',
];

function TickerRow({
  items,
  reverse,
}: {
  items:   string[];
  reverse: boolean;
}) {
  const repeated = [...items, ...items, ...items, ...items];

  return (
    <div style={{ overflow: 'hidden', position: 'relative' }}>
      <div
        className={reverse ? 'ticker-reverse' : 'ticker-track'}
        style={{
          display:    'inline-flex',
          alignItems: 'center',
          whiteSpace: 'nowrap',
        }}
      >
        {repeated.map((item, idx) => {
          const isIP = item === 'PLAY.JODCRAFT.WORLD';
          return (
            <span
              key={idx}
              style={{
                display:       'inline-flex',
                alignItems:    'center',
                fontFamily:    "'JetBrains Mono', monospace",
                fontSize:      '0.56rem',
                letterSpacing: '0.28em',
                textTransform: 'uppercase',
                color:         isIP ? '#00ff41' : '#3a4260',
                fontWeight:    isIP ? 600 : 400,
                whiteSpace:    'nowrap',
              }}
            >
              {item}
              <span style={{
                display:       'inline-block',
                margin:        '0 1.4rem',
                color:         isIP ? 'rgba(0,255,65,0.35)' : '#252a3a',
                fontSize:      '0.38rem',
                verticalAlign: 'middle',
              }}>
                ◆
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
}

export default function TickerStrip() {
  return (
    <div
      style={{
        borderTop:    '1px solid #181e2c',
        borderBottom: '1px solid #181e2c',
        background:   '#080b12',
        overflow:     'hidden',
        position:     'relative',
        zIndex:       10,
      }}
    >
      {/* Left edge fade */}
      <div style={{
        position:      'absolute',
        left:          0, top: 0, bottom: 0,
        width:         '80px',
        background:    'linear-gradient(to right, #06080c, transparent)',
        zIndex:        2,
        pointerEvents: 'none',
      }} />

      {/* Right edge fade */}
      <div style={{
        position:      'absolute',
        right:         0, top: 0, bottom: 0,
        width:         '80px',
        background:    'linear-gradient(to left, #06080c, transparent)',
        zIndex:        2,
        pointerEvents: 'none',
      }} />

      {/* Top row — scrolls left */}
      <div style={{ padding: '0.6rem 0 0.3rem' }}>
        <TickerRow items={TOP_ITEMS} reverse={false} />
      </div>

      {/* Thin divider between rows */}
      <div style={{
        height:     '1px',
        background: 'linear-gradient(to right, transparent, #1c2030 20%, #1c2030 80%, transparent)',
        margin:     '0 2rem',
      }} />

      {/* Bottom row — scrolls right (counter-scroll) */}
      <div style={{ padding: '0.3rem 0 0.6rem' }}>
        <TickerRow items={BOTTOM_ITEMS} reverse={true} />
      </div>

      <style>{`
        @keyframes ticker-reverse {
          0%   { transform: translateX(-50%); }
          100% { transform: translateX(0); }
        }
        .ticker-reverse {
          animation: ticker-reverse 44s linear infinite;
        }
        .ticker-reverse:hover,
        .ticker-track:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
}

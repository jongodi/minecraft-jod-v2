'use client';

const ITEMS = [
  'SURVIVAL',
  'COMMUNITY',
  'CUSTOM DATAPACKS',
  'CUSTOM RESOURCE PACK',
  'PLAY.JODCRAFT.WORLD',
  'SINCE 2024',
];

export default function TickerStrip() {
  const doubled = [...ITEMS, ...ITEMS, ...ITEMS, ...ITEMS];

  return (
    <div
      style={{
        borderTop:    '1px solid rgba(255,255,255,0.05)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        background:   '#060A14',
        overflow:     'hidden',
        padding:      '1rem 0',
        position:     'relative',
        zIndex:       10,
      }}
    >
      {/* Fade edges */}
      {(['left', 'right'] as const).map((side) => (
        <div
          key={side}
          style={{
            position: 'absolute',
            [side]: 0, top: 0, bottom: 0,
            width: '100px',
            background: `linear-gradient(to ${side === 'left' ? 'right' : 'left'}, #03050A, transparent)`,
            zIndex: 2,
            pointerEvents: 'none',
          }}
        />
      ))}

      <div className="ticker-track" style={{ display: 'inline-flex', alignItems: 'center' }}>
        {doubled.map((item, idx) => {
          const base  = idx % ITEMS.length;
          const isIP  = base === 4;
          const isDot = false;

          return (
            <span
              key={idx}
              style={{
                display:       'inline-flex',
                alignItems:    'center',
                fontFamily:    "'JetBrains Mono', monospace",
                fontSize:      '0.6rem',
                letterSpacing: '0.28em',
                textTransform: 'uppercase',
                color:          isIP ? '#F5A623' : 'rgba(240,234,214,0.25)',
                fontWeight:     isIP ? 600 : 400,
              }}
            >
              {item}
              <span
                style={{
                  display: 'inline-block',
                  margin:   '0 1.8rem',
                  color:    'rgba(139,92,246,0.35)',
                  fontSize: '0.45rem',
                }}
              >
                ✦
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
}

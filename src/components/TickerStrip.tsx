'use client';

export default function TickerStrip() {
  const items = [
    'SURVIVAL',
    'COMMUNITY',
    'CUSTOM DATAPACKS',
    'CUSTOM RESOURCE PACK',
    'PLAY.JODCRAFT.WORLD',
    'SINCE 2024',
  ];

  const doubled = [...items, ...items, ...items, ...items];

  return (
    <div
      style={{
        borderTop:    '1px solid #1c2030',
        borderBottom: '1px solid #1c2030',
        background:   '#0a0c12',
        overflow:     'hidden',
        padding:      '0.6rem 0',
        position:     'relative',
        zIndex:       10,
      }}
    >
      {/* Fade edges */}
      <div
        style={{
          position:      'absolute',
          left:          0, top: 0, bottom: 0,
          width:         '100px',
          background:    'linear-gradient(to right, #06080c, transparent)',
          zIndex:        2,
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position:      'absolute',
          right:         0, top: 0, bottom: 0,
          width:         '100px',
          background:    'linear-gradient(to left, #06080c, transparent)',
          zIndex:        2,
          pointerEvents: 'none',
        }}
      />

      <div className="ticker-track" style={{ display: 'inline-flex', alignItems: 'center' }}>
        {doubled.map((item, idx) => {
          const isIP = item === 'PLAY.JODCRAFT.WORLD';
          return (
            <span
              key={idx}
              style={{
                display:        'inline-flex',
                alignItems:     'center',
                fontFamily:     "'JetBrains Mono', monospace",
                fontSize:       '0.58rem',
                letterSpacing:  '0.28em',
                textTransform:  'uppercase',
                color:          isIP ? '#00ff41' : '#1e2230',
                fontWeight:     isIP ? 600 : 400,
                whiteSpace:     'nowrap',
              }}
            >
              {item}
              <span
                style={{
                  display:      'inline-block',
                  margin:       '0 1.6rem',
                  color:        '#1c2030',
                  fontSize:     '0.4rem',
                  verticalAlign: 'middle',
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

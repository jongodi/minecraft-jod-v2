'use client';

const ITEMS_A = [
  'SURVIVAL', 'COMMUNITY', 'CUSTOM DATAPACKS', 'CUSTOM RESOURCE PACK', 'PLAY.JODCRAFT.WORLD', 'SINCE 2024',
  'SURVIVAL', 'COMMUNITY', 'CUSTOM DATAPACKS', 'CUSTOM RESOURCE PACK', 'PLAY.JODCRAFT.WORLD', 'SINCE 2024',
];

const ITEMS_B = [
  'WHITELIST', 'JAVA EDITION', '14 DATAPACKS', '11 LOCATIONS', '8 MEMBERS', 'PRIVATE SERVER',
  'WHITELIST', 'JAVA EDITION', '14 DATAPACKS', '11 LOCATIONS', '8 MEMBERS', 'PRIVATE SERVER',
];

function TickerRow({
  items,
  reverse = false,
  accentIndex = 4,
}: {
  items: string[];
  reverse?: boolean;
  accentIndex?: number;
}) {
  return (
    <div
      className={reverse ? 'ticker-track-reverse' : 'ticker-track'}
      style={{ display: 'inline-flex', alignItems: 'center' }}
    >
      {[...items, ...items].map((item, idx) => (
        <span
          key={idx}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '0.58rem',
            letterSpacing: '0.28em',
            textTransform: 'uppercase',
            color: idx % items.length === accentIndex ? '#00ff41' : '#2e2e2e',
            fontWeight: idx % items.length === accentIndex ? 600 : 400,
          }}
        >
          {item}
          <span style={{ display: 'inline-block', margin: '0 1.4rem', color: '#1a1a1a', fontSize: '0.4rem' }}>
            ◆
          </span>
        </span>
      ))}
    </div>
  );
}

export default function TickerStrip() {
  return (
    <div
      style={{
        borderTop: '1px solid #111',
        borderBottom: '1px solid #111',
        background: '#050505',
        overflow: 'hidden',
        position: 'relative',
        zIndex: 10,
      }}
    >
      {/* Fade edges */}
      {(['left', 'right'] as const).map((side) => (
        <div
          key={side}
          style={{
            position: 'absolute',
            [side]: 0,
            top: 0,
            bottom: 0,
            width: '120px',
            background: `linear-gradient(to ${side === 'left' ? 'right' : 'left'}, #080808, transparent)`,
            zIndex: 2,
            pointerEvents: 'none',
          }}
        />
      ))}

      {/* Row 1 — forward */}
      <div style={{ padding: '0.6rem 0 0', overflow: 'hidden' }}>
        <TickerRow items={ITEMS_A} accentIndex={4} />
      </div>

      {/* Thin separator */}
      <div style={{ height: '1px', background: '#0f0f0f', margin: '0' }} />

      {/* Row 2 — reverse */}
      <div style={{ padding: '0 0 0.6rem', overflow: 'hidden' }}>
        <TickerRow items={ITEMS_B} reverse accentIndex={5} />
      </div>
    </div>
  );
}

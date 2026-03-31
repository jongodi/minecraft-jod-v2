import HeroSection      from '@/components/HeroSection';
import TickerStrip      from '@/components/TickerStrip';
import ServerStatus     from '@/components/ServerStatus';
import DatapacksSection from '@/components/DatapacksSection';
import GallerySection   from '@/components/GallerySection';
import MapSection       from '@/components/MapSection';
import JoinSection      from '@/components/JoinSection';

export default function Home() {
  return (
    <main style={{ background: '#03050A', minHeight: '100vh' }}>
      <HeroSection />
      <TickerStrip />
      <ServerStatus />
      <GallerySection />
      <MapSection />
      <DatapacksSection />
      <JoinSection />

      <footer
        style={{
          borderTop:   '1px solid rgba(255,255,255,0.05)',
          padding:     'clamp(2rem, 4vw, 3rem) clamp(1.5rem, 6vw, 5rem)',
          display:     'flex',
          alignItems:  'center',
          justifyContent: 'space-between',
          flexWrap:    'wrap',
          gap:         '1rem',
          background:  '#03050A',
        }}
      >
        <p
          style={{
            fontFamily:    "'Cinzel', serif",
            fontSize:      '0.85rem',
            fontWeight:    600,
            letterSpacing: '0.35em',
            color:         'rgba(245,166,35,0.55)',
            textTransform: 'uppercase',
          }}
        >
          JOD
        </p>

        <div
          style={{
            display:   'flex',
            alignItems: 'center',
            gap:        '1.5rem',
          }}
        >
          <span
            style={{
              width:        4,
              height:       4,
              borderRadius: '50%',
              background:   'rgba(245,166,35,0.3)',
              display:      'inline-block',
            }}
          />
          <p
            style={{
              fontFamily:    "'JetBrains Mono', monospace",
              fontSize:      '0.55rem',
              letterSpacing: '0.2em',
              color:         'rgba(255,255,255,0.12)',
              textTransform: 'uppercase',
            }}
          >
            Private Survival · Since 2024
          </p>
          <span
            style={{
              width:        4,
              height:       4,
              borderRadius: '50%',
              background:   'rgba(139,92,246,0.3)',
              display:      'inline-block',
            }}
          />
        </div>

        <p
          style={{
            fontFamily:    "'JetBrains Mono', monospace",
            fontSize:      '0.52rem',
            letterSpacing: '0.12em',
            color:         'rgba(255,255,255,0.1)',
            textTransform: 'uppercase',
          }}
        >
          play.jodcraft.world
        </p>
      </footer>
    </main>
  );
}

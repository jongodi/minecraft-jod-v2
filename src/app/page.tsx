import HeroSection from '@/components/HeroSection';
import TickerStrip from '@/components/TickerStrip';
import ServerStatus from '@/components/ServerStatus';
import GallerySection from '@/components/GallerySection';
import MapSection from '@/components/MapSection';
import DatapacksSection from '@/components/DatapacksSection';
import StatsSection from '@/components/StatsSection';
import JoinSection from '@/components/JoinSection';
import Link from 'next/link';

const FOOTER_LINKS = [
  { label: 'Server',    href: '/#server'    },
  { label: 'Gallery',   href: '/#gallery'   },
  { label: 'Map',       href: '/#map'       },
  { label: 'Datapacks', href: '/#datapacks' },
  { label: 'Crew',      href: '/crew'       },
  { label: 'RP Editor', href: '/rp-editor'  },
];

export default function Home() {
  return (
    <main style={{ background: '#06080c', minHeight: '100vh' }}>
      <HeroSection />
      <TickerStrip />
      <ServerStatus />
      <GallerySection />
      <MapSection />
      <DatapacksSection />
      <StatsSection />
      <JoinSection />

      <footer
        style={{
          background:     '#06080c',
          borderTop:      '1px solid #1c2030',
          padding:        '1.25rem clamp(1.5rem, 6vw, 5rem)',
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
          gap:            '1.5rem',
          flexWrap:       'wrap',
        }}
      >
        {/* Brand mark */}
        <span
          style={{
            fontFamily:    "'Space Grotesk', sans-serif",
            fontSize:      '0.95rem',
            fontWeight:    900,
            letterSpacing: '-0.04em',
            color:         '#00ff41',
            lineHeight:    1,
            flexShrink:    0,
          }}
        >
          JOD
        </span>

        {/* Nav links */}
        <nav style={{ display: 'flex', gap: '0.1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          {FOOTER_LINKS.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className="footer-link"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Attribution */}
        <span
          style={{
            fontFamily:    "'JetBrains Mono', monospace",
            fontSize:      '0.42rem',
            letterSpacing: '0.18em',
            color:         '#1e2230',
            textTransform: 'uppercase',
            flexShrink:    0,
          }}
        >
          PRIVATE · SINCE 2024
        </span>
      </footer>

    </main>
  );
}

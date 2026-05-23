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
          background: '#0d1018',
          borderTop:  '1px solid #1c2030',
          padding:    'clamp(2.5rem, 6vw, 4rem) clamp(1.5rem, 6vw, 5rem)',
        }}
      >
        <div className="footer-grid">
          {/* Brand */}
          <div>
            <p
              style={{
                fontFamily:    "'Space Grotesk', sans-serif",
                fontSize:      '1.4rem',
                fontWeight:    900,
                letterSpacing: '-0.04em',
                color:         '#00ff41',
                marginBottom:  '0.5rem',
                lineHeight:    1,
              }}
            >
              JOD
            </p>
            <p
              style={{
                fontFamily:    "'JetBrains Mono', monospace",
                fontSize:      '0.52rem',
                letterSpacing: '0.16em',
                color:         '#1e2230',
                textTransform: 'uppercase',
                lineHeight:    1.9,
              }}
            >
              Private survival server<br />
              Minecraft Java Edition
            </p>
          </div>

          {/* Nav links */}
          <nav>
            <p
              style={{
                fontFamily:    "'JetBrains Mono', monospace",
                fontSize:      '0.46rem',
                letterSpacing: '0.3em',
                color:         '#1e2230',
                textTransform: 'uppercase',
                marginBottom:  '0.75rem',
              }}
            >
              PAGES
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {FOOTER_LINKS.map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="footer-link"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </nav>

          {/* Server info */}
          <div>
            <p
              style={{
                fontFamily:    "'JetBrains Mono', monospace",
                fontSize:      '0.46rem',
                letterSpacing: '0.3em',
                color:         '#1e2230',
                textTransform: 'uppercase',
                marginBottom:  '0.75rem',
              }}
            >
              SERVER
            </p>
            <p
              style={{
                fontFamily:    "'JetBrains Mono', monospace",
                fontSize:      '0.68rem',
                letterSpacing: '0.1em',
                color:         '#505770',
                marginBottom:  '0.4rem',
              }}
            >
              play.jodcraft.world
            </p>
            <p
              style={{
                fontFamily:    "'JetBrains Mono', monospace",
                fontSize:      '0.48rem',
                letterSpacing: '0.12em',
                color:         '#1e2230',
                textTransform: 'uppercase',
                lineHeight:    1.9,
              }}
            >
              Whitelist required<br />
              Invite only · Since 2024
            </p>
          </div>
        </div>

        {/* Bottom rule */}
        <div
          style={{
            marginTop:      'clamp(2rem, 4vw, 3rem)',
            paddingTop:     '1.25rem',
            borderTop:      '1px solid #131722',
            display:        'flex',
            justifyContent: 'space-between',
            alignItems:     'center',
            flexWrap:       'wrap',
            gap:            '0.5rem',
          }}
        >
          <p
            style={{
              fontFamily:    "'JetBrains Mono', monospace",
              fontSize:      '0.42rem',
              letterSpacing: '0.2em',
              color:         '#131722',
              textTransform: 'uppercase',
            }}
          >
            JOD · Private Survival · 2024
          </p>
          <p
            style={{
              fontFamily:    "'JetBrains Mono', monospace",
              fontSize:      '0.42rem',
              letterSpacing: '0.16em',
              color:         '#131722',
              textTransform: 'uppercase',
            }}
          >
            Not affiliated with Mojang Studios
          </p>
        </div>
      </footer>

      <style>{`
        .footer-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 2rem;
        }
        @media (min-width: 640px) {
          .footer-grid {
            grid-template-columns: repeat(3, 1fr);
            gap: clamp(2rem, 4vw, 4rem);
          }
        }
        .footer-link {
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.52rem;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #505770;
          text-decoration: none;
          transition: color 0.2s;
          width: fit-content;
        }
        .footer-link:hover {
          color: #00ff41;
        }
      `}</style>
    </main>
  );
}

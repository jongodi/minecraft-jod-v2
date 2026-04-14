import HeroSection from '@/components/HeroSection';
import TickerStrip from '@/components/TickerStrip';
import ServerStatus from '@/components/ServerStatus';
import GallerySection from '@/components/GallerySection';
import MapSection from '@/components/MapSection';
import DatapacksSection from '@/components/DatapacksSection';
import StatsSection from '@/components/StatsSection';
import AchievementsSection from '@/components/AchievementsSection';
import JoinSection from '@/components/JoinSection';
import Link from 'next/link';

export default function Home() {
  return (
    <main className="bg-bg min-h-screen">
      <HeroSection />
      <TickerStrip />
      <ServerStatus />
      <GallerySection />
      <MapSection />
      <DatapacksSection />
      <StatsSection />
      <AchievementsSection />
      <JoinSection />

      <footer style={{ borderTop: '1px solid #1a1a1a', background: '#080808' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '2rem',
          padding: 'clamp(2rem, 5vw, 3.5rem) clamp(1.5rem, 6vw, 5rem)',
          borderBottom: '1px solid #111',
        }}>
          {/* Col 1 — Server info */}
          <div>
            <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '1.1rem', fontWeight: 900, color: '#00ff41', letterSpacing: '-0.02em', marginBottom: '0.75rem' }}>
              JOD
            </p>
            <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.55rem', color: '#333', letterSpacing: '0.12em', lineHeight: 2, textTransform: 'uppercase' }}>
              play.jodcraft.world<br />
              Java Edition<br />
              Private survival<br />
              Est. 2024
            </p>
          </div>

          {/* Col 2 — Quick links */}
          <div>
            <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.5rem', letterSpacing: '0.3em', color: '#2a2a2a', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
              NAVIGATE
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {[
                { label: 'Server',    href: '/#hero'      },
                { label: 'Gallery',   href: '/#gallery'   },
                { label: 'Map',       href: '/#map'       },
                { label: 'Datapacks', href: '/#datapacks' },
                { label: 'Stats',     href: '/#stats'     },
                { label: 'Crew',      href: '/crew'       },
                { label: 'RP Editor', href: '/rp-editor'  },
              ].map(({ label, href }) => (
                <Link
                  key={href}
                  href={href}
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '0.55rem',
                    letterSpacing: '0.12em',
                    color: '#444',
                    textDecoration: 'none',
                    textTransform: 'uppercase',
                    transition: 'color 0.15s',
                  }}
                  onMouseEnter={e => ((e.target as HTMLElement).style.color = '#00ff41')}
                  onMouseLeave={e => ((e.target as HTMLElement).style.color = '#444')}
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>

          {/* Col 3 — About */}
          <div>
            <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.5rem', letterSpacing: '0.3em', color: '#2a2a2a', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
              ABOUT
            </p>
            <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.55rem', color: '#333', letterSpacing: '0.08em', lineHeight: 1.9, textTransform: 'uppercase' }}>
              8 crew members<br />
              Custom datapacks<br />
              Custom resource pack<br />
              Vanilla+ survival
            </p>
          </div>
        </div>

        {/* Bottom bar */}
        <p style={{ fontFamily: "'JetBrains Mono', monospace", color: '#1e1e1e', fontSize: '0.5rem', textAlign: 'center', letterSpacing: '0.25em', textTransform: 'uppercase', padding: '1rem' }}>
          JOD · private survival · 2024
        </p>
      </footer>
    </main>
  );
}


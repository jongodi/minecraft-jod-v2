import HeroSection from '@/components/HeroSection';
import TickerStrip from '@/components/TickerStrip';
import ServerStatus from '@/components/ServerStatus';
import GallerySection from '@/components/GallerySection';
import MapSection from '@/components/MapSection';
import DatapacksSection from '@/components/DatapacksSection';
import StatsSection from '@/components/StatsSection';
import JoinSection from '@/components/JoinSection';

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
      <JoinSection />
      <footer className="border-t border-border py-6 px-8">
        <p className="font-mono text-muted text-xs text-center tracking-widest uppercase">
          JOD · private survival · 2024
        </p>
      </footer>
    </main>
  );
}

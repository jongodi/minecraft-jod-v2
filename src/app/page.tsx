import HeroSection from '@/components/HeroSection';
import TickerStrip from '@/components/TickerStrip';
import ServerStatus from '@/components/ServerStatus';
import DatapacksSection from '@/components/DatapacksSection';
import GallerySection from '@/components/GallerySection';
import MapSection from '@/components/MapSection';
import JoinSection from '@/components/JoinSection';

export default function Home() {
  return (
    <main className="bg-bg min-h-screen">
      <HeroSection />
      <TickerStrip />
      <ServerStatus />
      <DatapacksSection />
      <GallerySection />
      <MapSection />
      <JoinSection />
      <footer className="border-t border-border py-6 px-8">
        <p className="font-mono text-muted text-xs text-center tracking-widest uppercase">
          JOD · private survival · 2024
        </p>
      </footer>
    </main>
  );
}

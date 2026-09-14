import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'JOÐ — private Minecraft survival',
  description:
    'A private Minecraft survival world for eight friends, running since 2024. Live server status, the world map, screenshots and player stats. play.jodcraft.world',
  keywords: ['minecraft', 'survival', 'private server', 'JOD', 'JOÐ', 'datapacks'],
  icons: { icon: '/icon.svg', shortcut: '/icon.svg' },
  openGraph: {
    title: 'JOÐ — private Minecraft survival',
    description: 'Eight friends, one survival world, since 2024. play.jodcraft.world',
    type: 'website',
    images: ['/screenshots/night-sky.webp'],
  },
};

export const viewport: Viewport = {
  themeColor: '#14101b',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

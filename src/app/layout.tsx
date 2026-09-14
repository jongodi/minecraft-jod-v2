import type { Metadata, Viewport } from 'next';
import '@fontsource/rye/400.css';
import '@fontsource/caveat/400.css';
import '@fontsource/caveat/600.css';
import '@fontsource/lora/400.css';
import '@fontsource/lora/400-italic.css';
import '@fontsource/lora/600.css';
import '@fontsource/lora/700.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/600.css';
import './globals.css';

export const metadata: Metadata = {
  title: 'JOÐ, private Minecraft survival',
  description:
    'A private Minecraft survival world for eight friends, running since 2024. Live server status, the world map, screenshots and player stats. play.jodcraft.world',
  keywords: ['minecraft', 'survival', 'private server', 'JOD', 'JOÐ', 'datapacks'],
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/icon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    shortcut: '/icon.svg',
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    title: 'JOÐ, private Minecraft survival',
    description: 'Eight friends, one survival world, since 2024. play.jodcraft.world',
    type: 'website',
    images: ['/screenshots/the-castle.webp'],
  },
};

export const viewport: Viewport = {
  themeColor: '#efe3c6',
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

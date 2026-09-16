import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/600.css';
import './globals.css';
import { SERVER_IP } from '@/components/badlands/data';

/* Three families, self-hosted. Each is verified to carry þ ð æ ö á é í ó ú ý;
   the Latin-1 block lives in the "latin" subset files. */
const display = localFont({
  src: '../../node_modules/@fontsource/alfa-slab-one/files/alfa-slab-one-latin-400-normal.woff2',
  weight: '400',
  variable: '--font-display-loaded',
  display: 'swap',
});
const text = localFont({
  /* the weight-only cut: half the size of the optical-size cut, and the site sets no italics */
  src: '../../node_modules/@fontsource-variable/literata/files/literata-latin-wght-normal.woff2',
  weight: '200 900',
  variable: '--font-text-loaded',
  display: 'swap',
});
const data = localFont({
  src: '../../node_modules/@fontsource/silkscreen/files/silkscreen-latin-400-normal.woff2',
  weight: '400',
  variable: '--font-data-loaded',
  display: 'swap',
  adjustFontFallback: false,
});

const TITLE = 'JOÐ, Minecraft-heimurinn okkar';
const DESCRIPTION = `Minecraft-heimur átta vina frá sumrinu 2024. Staða þjónsins, hver er inni, landakort, myndir úr leiknum og tölfræði leikmanna. ${SERVER_IP}`;

export const metadata: Metadata = {
  metadataBase: new URL('https://play.jodcraft.world'),
  title: TITLE,
  description: DESCRIPTION,
  keywords: ['Minecraft', 'lífsbarátta', 'einkaþjónn', 'JOÐ', 'gagnapakkar'],
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
    title: TITLE,
    description: `Átta vinir, einn Minecraft-heimur, frá 2024. ${SERVER_IP}`,
    type: 'website',
    locale: 'is_IS',
  },
};

export const viewport: Viewport = {
  themeColor: '#15100D',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="is" className={`${display.variable} ${text.variable} ${data.variable}`}>
      <body>{children}</body>
    </html>
  );
}

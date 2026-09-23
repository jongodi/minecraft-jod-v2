import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import { SERVER_IP } from '@/components/badlands/data';

/* Three families, self-hosted, all three drawn on a pixel grid. Each is
   verified to carry þ ð æ ö á é í ó ú ý; the Latin-1 block lives in the
   "latin" subset files, not in "latin-ext". */
const display = localFont({
  src: '../../node_modules/@fontsource/alfa-slab-one/files/alfa-slab-one-latin-400-normal.woff2',
  weight: '400',
  variable: '--font-display-loaded',
  display: 'swap',
});
/* Running prose. A pixel face with text proportions, so a paragraph still
   reads at length where Silkscreen would not. */
const text = localFont({
  src: [
    { path: '../../node_modules/@fontsource/pixelify-sans/files/pixelify-sans-latin-400-normal.woff2', weight: '400', style: 'normal' },
    { path: '../../node_modules/@fontsource/pixelify-sans/files/pixelify-sans-latin-600-normal.woff2', weight: '600', style: 'normal' },
  ],
  variable: '--font-text-loaded',
  display: 'swap',
  adjustFontFallback: false,
});
/* Labels, navigation, data: everything that is a short string. Both cuts are
   real, so nothing on the page is ever synthetically bolded — faux bold
   smears a bitmap face. */
const data = localFont({
  src: [
    { path: '../../node_modules/@fontsource/silkscreen/files/silkscreen-latin-400-normal.woff2', weight: '400', style: 'normal' },
    { path: '../../node_modules/@fontsource/silkscreen/files/silkscreen-latin-700-normal.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--font-data-loaded',
  display: 'swap',
  adjustFontFallback: false,
});

const TITLE = 'JOÐ, Minecraft-heimurinn okkar';
const DESCRIPTION = `Minecraft-heimur átta vina frá sumrinu 2024. Staða þjónsins, hver er inni, landakort, myndir úr leiknum og tölfræði leikmanna. ${SERVER_IP}`;

export const metadata: Metadata = {
  metadataBase: new URL('https://jodcraft.world'),
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
      <head>
        {/* Player portraits come from these two; opening the connections while
            the page is still parsing saves a DNS + TLS round trip each. */}
        <link rel="preconnect" href="https://minotar.net" />
        <link rel="preconnect" href="https://mc-heads.net" />
      </head>
      {/* extensions like Grammarly write their own attributes onto <body> before React loads */}
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}

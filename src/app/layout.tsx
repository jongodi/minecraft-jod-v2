import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import { SERVER_IP, SITE_NAME, TITLE_TEMPLATE } from '@/components/badlands/data';

/* Three families, self-hosted, four files, all preloaded: each is on the
   first screen. Each is verified to carry þ ð æ ö á é í ó ú ý; the Latin-1
   block lives in the "latin" subset files, not in "latin-ext". Every face
   gets a size-adjusted fallback, so the line a word takes before its font
   arrives is the line it keeps, and the swap moves nothing. */
const display = localFont({
  src: '../../node_modules/@fontsource/alfa-slab-one/files/alfa-slab-one-latin-400-normal.woff2',
  weight: '400',
  variable: '--font-display-loaded',
  display: 'swap',
});
/* Every word the site says, long or short. A pixel face with text
   proportions, crisp at any size; the bold cut carries names and kickers. */
const text = localFont({
  src: [
    { path: '../../node_modules/@fontsource/pixelify-sans/files/pixelify-sans-latin-400-normal.woff2', weight: '400', style: 'normal' },
    { path: '../../node_modules/@fontsource/pixelify-sans/files/pixelify-sans-latin-600-normal.woff2', weight: '600', style: 'normal' },
  ],
  variable: '--font-text-loaded',
  display: 'swap',
});
/* What can be pressed and what the server counts: the doors, the buttons,
   the address, the numbers. One cut; nothing on the site asks it for bold,
   and a faux bold would smear a bitmap face. */
const data = localFont({
  src: '../../node_modules/@fontsource/silkscreen/files/silkscreen-latin-400-normal.woff2',
  weight: '400',
  variable: '--font-data-loaded',
  display: 'swap',
});

const TITLE = `${SITE_NAME} · Minecraft-heimurinn okkar`;
const DESCRIPTION = `Minecraft-heimur átta vina frá sumrinu 2024. Staða þjónsins, hver er inni, landakort, myndir úr leiknum og tölfræði leikmanna. ${SERVER_IP}`;

export const metadata: Metadata = {
  metadataBase: new URL('https://jodcraft.world'),
  title: { default: TITLE, template: TITLE_TEMPLATE },
  description: DESCRIPTION,
  keywords: ['Minecraft', 'lífsbarátta', 'einkaþjónn', 'JOÐ', 'JOÐcraft', 'gagnapakkar'],
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
    siteName: SITE_NAME,
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
      <body suppressHydrationWarning>
        {/* the first stop for a keyboard: past the bar, straight to the page's main landmark */}
        <a href="#efni" className="b-skip">Beint í efnið</a>
        {children}
      </body>
    </html>
  );
}

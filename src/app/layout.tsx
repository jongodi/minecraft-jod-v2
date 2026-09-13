import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';

// Both faces are the Google Fonts latin split, which covers Icelandic
// (ð þ æ ö and the acute vowels sit in Latin-1). Committed to the repo so a
// build never depends on a font CDN.
const display = localFont({
  src: '../fonts/YoungSerif-latin.woff2',
  variable: '--font-display',
  weight: '400',
  display: 'swap',
  preload: true,
  fallback: ['Georgia', 'serif'],
  adjustFontFallback: 'Times New Roman',
});

const body = localFont({
  src: '../fonts/InstrumentSans-latin.woff2',
  variable: '--font-body',
  weight: '400 700',
  display: 'swap',
  preload: true,
  fallback: ['system-ui', 'sans-serif'],
  adjustFontFallback: 'Arial',
});

export const metadata: Metadata = {
  title: 'JOÐcraft',
  description: 'Lokaður survival-þjónn fyrir vini. play.jodcraft.world',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="is" className={`${display.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}

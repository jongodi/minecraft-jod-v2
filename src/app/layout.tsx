import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';

// Static instances cut from the Google Fonts latin splits, which cover
// Icelandic (ð þ æ ö and the acute vowels are in Latin-1). Committed to the
// repo so a build never depends on a font CDN.
const display = localFont({
  src: '../fonts/ArchivoCondensed-Black.woff2',
  variable: '--font-display',
  weight: '800',
  display: 'swap',
  preload: true,
  fallback: ['Impact', 'Arial Narrow', 'sans-serif'],
  adjustFontFallback: 'Arial',
});

const label = localFont({
  src: '../fonts/ArchivoExpanded-SemiBold.woff2',
  variable: '--font-label',
  weight: '600',
  display: 'swap',
  preload: false,
  fallback: ['Arial', 'sans-serif'],
  adjustFontFallback: 'Arial',
});

const body = localFont({
  src: [
    { path: '../fonts/Literata-Regular.woff2', weight: '400', style: 'normal' },
    { path: '../fonts/Literata-Italic.woff2', weight: '400', style: 'italic' },
  ],
  variable: '--font-body',
  display: 'swap',
  preload: true,
  fallback: ['Georgia', 'serif'],
  adjustFontFallback: 'Times New Roman',
});

export const metadata: Metadata = {
  title: 'JOÐcraft',
  description: 'Lokaður survival-þjónn fyrir vini. play.jodcraft.world',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="is" className={`${display.variable} ${label.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}

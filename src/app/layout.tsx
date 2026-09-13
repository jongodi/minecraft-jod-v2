import type { Metadata } from 'next';
import './globals.css';
import './atlas.css';

export const metadata: Metadata = {
  title: 'JOÐ — Our Minecraft World',
  description:
    'Private Minecraft survival server. Custom datapacks, tight-knit community. IP: play.jodcraft.world',
  keywords: ['minecraft', 'survival', 'private server', 'JOD', 'datapacks'],
  icons: {
    icon: '/icon.svg',
    shortcut: '/icon.svg',
  },
  openGraph: {
    title: 'JOÐ — Our Minecraft World',
    description: 'Private survival. Custom datapacks. play.jodcraft.world',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="atlas">
      <body>
        {children}
      </body>
    </html>
  );
}

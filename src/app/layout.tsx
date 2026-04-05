import type { Metadata } from 'next';
import './globals.css';
import CustomCursor from '@/components/CustomCursor';
import ScrollProgress from '@/components/ScrollProgress';
import RpEditorButton from '@/components/RpEditorButton';
import NavHeader from '@/components/NavHeader';

export const metadata: Metadata = {
  title: 'JOD — Private Minecraft Survival',
  description:
    'Private Minecraft survival server. Custom datapacks, tight-knit community. IP: play.jodcraft.world',
  keywords: ['minecraft', 'survival', 'private server', 'JOD', 'datapacks'],
  icons: {
    icon: '/icon.svg',
    shortcut: '/icon.svg',
  },
  openGraph: {
    title: 'JOD — Private Minecraft Survival',
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
    <html lang="en">
      <body>
        <CustomCursor />
        <ScrollProgress />
        <NavHeader />
        <RpEditorButton />
        {children}
      </body>
    </html>
  );
}

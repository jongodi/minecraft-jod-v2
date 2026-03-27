import type { Metadata } from 'next';
import './globals.css';
import CustomCursor from '@/components/CustomCursor';
import ScrollProgress from '@/components/ScrollProgress';

export const metadata: Metadata = {
  title: 'JOD — Private Minecraft Survival',
  description:
    'Private Minecraft survival server. Custom datapacks, tight-knit community. IP: play.jod.cool',
  keywords: ['minecraft', 'survival', 'private server', 'JOD', 'datapacks'],
  openGraph: {
    title: 'JOD — Private Minecraft Survival',
    description: 'Private survival. Custom datapacks. play.jod.cool',
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
        {children}
      </body>
    </html>
  );
}

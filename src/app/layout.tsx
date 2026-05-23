import type { Metadata } from 'next';
import './globals.css';
import CustomCursor from '@/components/CustomCursor';
import ScrollProgress from '@/components/ScrollProgress';
import RpEditorButton from '@/components/RpEditorButton';
import NavHeader from '@/components/NavHeader';
import { ThemeProvider } from '@/lib/theme';

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
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Prevent flash of wrong theme by applying saved theme before paint */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const t = localStorage.getItem('jod-theme');
                if (t === 'western') document.documentElement.setAttribute('data-theme', 'western');
              } catch(e) {}
            `,
          }}
        />
      </head>
      <body>
        <ThemeProvider>
          <CustomCursor />
          <ScrollProgress />
          <NavHeader />
          <RpEditorButton />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}

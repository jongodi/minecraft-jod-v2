import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'JOÐcraft',
    short_name: 'JOÐcraft',
    description: 'Lokaður survival-þjónn fyrir vini. play.jodcraft.world',
    lang: 'is',
    start_url: '/',
    display: 'standalone',
    background_color: '#0F0E0C',
    theme_color: '#0F0E0C',
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}

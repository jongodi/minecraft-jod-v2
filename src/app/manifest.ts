import type { MetadataRoute } from 'next';

/* So a phone can keep the site on its home screen under the strata mark:
   the world with three doors under a thumb, without the browser's frame. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'JOÐ, Minecraft-heimurinn okkar',
    short_name: 'JOÐ',
    description: 'Minecraft-heimur átta vina frá sumrinu 2024. play.jodcraft.world',
    start_url: '/',
    display: 'standalone',
    orientation: 'any',
    background_color: '#15100D',
    theme_color: '#15100D',
    lang: 'is',
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png', purpose: 'any' },
    ],
  };
}

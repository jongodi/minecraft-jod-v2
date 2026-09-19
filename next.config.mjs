import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  /* A stray package-lock.json higher up (in the home folder) made Next guess that
     folder as the project root, which also skews what the file tracer matches. */
  outputFileTracingRoot: path.dirname(fileURLToPath(import.meta.url)),

  /* blob-store.ts builds paths into public/ at runtime (local screenshots), so the
     file tracer copies what it can reach under public/ into every function that
     imports it. The BlueMap copy is hundreds of MB of static files the functions
     never read: the CDN serves it, and the /bluemap route only redirects to it. */
  outputFileTracingExcludes: {
    '*': ['**/public/bluemap/**', '**/public/bluemap-data/**'],
  },

  images: {
    /* Screenshots are 1920px and admin uploads up to 2560px, while the wall
       hangs them at ~200px and the map index at ~52px. These widths are what
       next/image is allowed to generate; the components ask for a slot with
       `sizes` and the browser picks. */
    deviceSizes: [360, 480, 640, 828, 1080, 1440, 1920],
    imageSizes: [64, 96, 128, 192, 256],
    formats: ['image/avif', 'image/webp'],
    /* 75 for the wall and the map, 82 for the lightbox's full-size view */
    qualities: [75, 82],
    /* Photos are immutable once uploaded: the admin panel writes a new name. */
    minimumCacheTTL: 31536000,
    remotePatterns: [
      { protocol: 'https', hostname: 'blob.vercel-storage.com' },
      { protocol: 'https', hostname: '*.blob.vercel-storage.com' },
    ],
  },

  /* /heimskort used to frame the viewer on a page of its own; the world is on the
     home page now, and the button there opens the viewer itself. */
  async redirects() {
    return [{ source: '/heimskort', destination: '/bluemap/index.html', permanent: false }];
  },

  async headers() {
    const isDev = process.env.NODE_ENV !== 'production';
    const csp = [
      "default-src 'self'",
      // 'unsafe-eval' is required by webpack/react-refresh in dev mode only
      `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' blob: data: https:",
      // The admin panel uploads photos straight to Vercel Blob from the browser
      "connect-src 'self' https://vercel.com https://blob.vercel-storage.com https://*.blob.vercel-storage.com",
      "font-src 'self' https://fonts.gstatic.com",
      "frame-ancestors 'none'",
    ].join('; ');

    // The BlueMap viewer under /bluemap is framed by the home page, so it may be framed
    // by the site itself. It loads block textures as data: URLs and may start workers,
    // and its translations (vue-i18n) compile each message with new Function(), so it
    // needs 'unsafe-eval' in production too. This applies to BlueMap's own files only;
    // the site's pages keep the stricter policy above.
    const bluemapCsp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "worker-src 'self' blob:",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' blob: data:",
      "connect-src 'self' blob: data:",
      "font-src 'self' data:",
      "frame-ancestors 'self'",
    ].join('; ');

    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options',           value: 'DENY' },
          { key: 'X-Content-Type-Options',     value: 'nosniff' },
          { key: 'Referrer-Policy',            value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy',         value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Strict-Transport-Security',  value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'Content-Security-Policy',    value: csp },
        ],
      },
      {
        // listed after the catch-all so these two headers replace its values here
        source: '/bluemap/:path*',
        headers: [
          { key: 'X-Frame-Options',         value: 'SAMEORIGIN' },
          { key: 'Content-Security-Policy', value: bluemapCsp },
        ],
      },
    ];
  },
};

export default nextConfig;

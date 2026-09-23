import path from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/* Where the map copy is: written by `npm run map:sync`. */
const snapshot = JSON.parse(readFileSync(new URL('./src/lib/bluemap-snapshot.json', import.meta.url), 'utf8'));
const BLOB_DIR = 'bluemap-data';
/* The viewer reads the map from /bluemap-data/<version>/maps (map:brand writes
   the version into public/bluemap/settings.json). The store and the local copy
   keep one copy under unversioned paths, so the version is dropped on the way. */
const VERSIONED = `/${BLOB_DIR}/:v(v[0-9a-z]{1,16})/maps/:path*`;
const LOCAL_COPY = existsSync(new URL('./public/bluemap-data/maps', import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  /* A stray package-lock.json higher up (in the home folder) made Next guess that
     folder as the project root, which also skews what the file tracer matches. */
  outputFileTracingRoot: path.dirname(fileURLToPath(import.meta.url)),

  /* blob-store.ts builds paths into public/ at runtime (local screenshots), so the
     file tracer copies what it can reach under public/ into every function that
     imports it. The BlueMap viewer is static files the functions never read, and
     a local map copy under public/bluemap-data (development only, ignored by git)
     is hundreds of MB. */
  outputFileTracingExcludes: {
    '*': ['**/public/bluemap/**', '**/public/bluemap-data/**'],
  },

  /* The map data lives in Vercel Blob, not in the deployment, in a few large
     packs the /bluemap-data route reads each file out of. A copy from before
     packs, in a public store, is served through these rewrites instead. A
     local copy under public/bluemap-data (development) is served as static
     files first. Player heads are never in the copy: they go to /api/map-head. */
  async rewrites() {
    const heads = [
      { source: `/${BLOB_DIR}/:v(v[0-9a-z]{1,16})/maps/:map/assets/playerheads/:file`, destination: '/api/map-head/:file' },
      { source: `/${BLOB_DIR}/maps/:map/assets/playerheads/:file`, destination: '/api/map-head/:file' },
    ];
    const local = LOCAL_COPY ? [{ source: VERSIONED, destination: `/${BLOB_DIR}/maps/:path*` }] : [];
    const blob = snapshot.blob;
    const store = blob?.base && blob.access === 'public' && !snapshot.packs
      ? [
          { source: VERSIONED, destination: `${blob.base}/${BLOB_DIR}/maps/:path*` },
          { source: `/${BLOB_DIR}/:path*`, destination: `${blob.base}/${BLOB_DIR}/:path*` },
        ]
      : [];
    return { beforeFiles: [...heads, ...local], afterFiles: store, fallback: [] };
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

    /* A versioned map address never changes, so a public store's answers may be
       kept by the CDN for good; a private store's route says so itself. */
    const store = snapshot.blob?.base && snapshot.blob.access === 'public'
      ? [{ source: VERSIONED, headers: [{ key: 'CDN-Cache-Control', value: 'public, max-age=31536000, immutable' }] }]
      : [];

    return [
      ...store,
      {
        // the viewer's own files carry a content hash in their names
        source: '/bluemap/assets/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
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

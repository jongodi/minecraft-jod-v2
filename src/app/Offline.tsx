'use client';

import { useEffect } from 'react';

/** Registers the service worker that keeps the lost-connection screen
    (public/sw.js, /offline): a phone that opens the site with no network
    sees the game's own disconnected screen in the site's clothes rather
    than the browser's. Nothing else is cached. */
export default function Offline() {
  useEffect(() => {
    if (!('serviceWorker' in navigator) || process.env.NODE_ENV !== 'production') return;
    navigator.serviceWorker.register('/sw.js').catch(() => { /* without it the browser's own page stands */ });
  }, []);
  return null;
}

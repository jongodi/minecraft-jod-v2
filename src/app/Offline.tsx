'use client';

import { useEffect } from 'react';

/** Registers the service worker that keeps the lost-connection screen
    (public/sw.js, /offline): a phone or a computer that opens the site with
    no network sees the game's own disconnected screen in the site's clothes
    rather than the browser's. Nothing else is cached.
    `version` names the deploy (layout.tsx). The worker is registered at an
    address that carries it, so a new deploy is a new worker to the browser,
    which installs it and keeps that deploy's copy of the screen; the worker's
    own file never changes, and at one fixed address the browser would have
    kept the first copy it ever made. Without a version (a build on this
    machine) it stays at the one address. */
export default function Offline({ version }: { version?: string }) {
  useEffect(() => {
    if (!('serviceWorker' in navigator) || process.env.NODE_ENV !== 'production') return;
    const url = version ? `/sw.js?v=${encodeURIComponent(version)}` : '/sw.js';
    navigator.serviceWorker.register(url).catch(() => { /* without it the browser's own page stands */ });
  }, [version]);
  return null;
}

/* JOÐcraft's service worker: it keeps one page, the lost-connection screen
   (/offline), and hands it out when a page cannot be fetched. Nothing else
   is cached here; the site is read live, as it always was. */
const CACHE = 'jod-offline-v1';
const OFFLINE = '/offline';

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.add(new Request(OFFLINE, { cache: 'reload' }))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    /* A page's request leaves while the worker is still waking, not after it
       (fetch below): the worker only steps in when the network is gone, and
       a visit should not wait on it to start before asking for the page. */
    if (self.registration.navigationPreload) await self.registration.navigationPreload.enable();
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  if (e.request.mode !== 'navigate') return;
  e.respondWith((async () => {
    try {
      return (await e.preloadResponse) || (await fetch(e.request));
    } catch {
      return (await caches.match(OFFLINE)) || Response.error();
    }
  })());
});

/* JOÐcraft's service worker: it keeps one page, the lost-connection screen
   (/offline), with the stylesheets and the faces it is drawn in, and hands
   it out when a page cannot be fetched. Nothing else is kept here; the site
   is read live, as it always was. */

/* Each deploy registers the worker at an address of its own (Offline.tsx,
   ?v= and the deploy), so each deploy installs it afresh and keeps its own
   copy of the screen, drawn in that deploy's files, and the copy before it
   goes when this one takes over. A worker that kept the page alone kept
   addresses of stylesheets a later deploy no longer had, and once the
   browser had let go of its own copies the screen came up unstyled. */
const VERSION = new URL(self.location.href).searchParams.get('v') || 'local';
const CACHE = `jod-offline-${VERSION}`;
const OFFLINE = '/offline';
/* the screen's own files as its page names them: stylesheets and faces, hashed by the build */
const ASSETS = /\/_next\/static\/[\w./-]+?\.(?:css|woff2)(?:\?dpl=[\w-]+)?/g;
const ASSET_PATH = /^\/_next\/static\/[\w./-]+?\.(?:css|woff2)$/;

/* The paths of those files, so a request can be told at once whether it is
   one of them; read back from the cache whenever the worker wakes. Until
   then a stylesheet or a face is taken to be one, which costs a request a
   look in the cache only when the network has already failed it. */
let kept = null;
const pathOf = (u) => new URL(u, self.location.origin).pathname;
caches.open(CACHE).then((c) => c.keys()).then((keys) => {
  kept = new Set(keys.map((r) => pathOf(r.url)).filter((p) => p !== OFFLINE));
}).catch(() => { /* the pattern stands in */ });

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const res = await fetch(new Request(OFFLINE, { cache: 'reload' }));
    if (!res.ok) throw new Error(`${OFFLINE} answered ${res.status}`);
    const html = await res.clone().text();
    const assets = [...new Set(html.match(ASSETS) ?? [])];
    const cache = await caches.open(CACHE);
    /* all or nothing: a screen without its stylesheet is the thing this is here to prevent, so a failed file fails the install and the worker before it stays */
    await cache.addAll(assets);
    await cache.put(OFFLINE, res);
    kept = new Set(assets.map(pathOf));
    await self.skipWaiting();
  })());
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

const fromCache = (req) => caches.open(CACHE).then((c) => c.match(req, { ignoreSearch: true }));

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      try {
        return (await e.preloadResponse) || (await fetch(req));
      } catch {
        return (await fromCache(OFFLINE)) || Response.error();
      }
    })());
    return;
  }
  /* the screen's stylesheets and faces, from the cache only when the network fails them; every other request is left alone */
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (!(kept ? kept.has(url.pathname) : ASSET_PATH.test(url.pathname))) return;
  e.respondWith(fetch(req).catch(() => fromCache(req).then((r) => r || Response.error())));
});

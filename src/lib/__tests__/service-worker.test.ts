import { readFileSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { describe, expect, it } from 'vitest';

/* The lost-connection screen's worker (public/sw.js), run in a sandbox with
   a cache store, a network and a registration of its own. It keeps the
   screen with its stylesheets and faces under the deploy's name, drops the
   copy before it, answers a page with the screen only when the network has
   failed it, and steps in for no request but the screen's own files. */
const SOURCE = readFileSync(path.resolve(__dirname, '../../../public/sw.js'), 'utf8');
const ORIGIN = 'https://jod.test';
const CSS = ['/_next/static/chunks/03i89ugntyy83.css', '/_next/static/chunks/39ojyaf-q0-yi.css'];
const FONT = '/_next/static/media/silkscreen_latin_400_normal-s.p.1wairkmd91ip2.woff2';
/* as the page names them: link tags, a preload, and the flight data's escaped copies */
const PAGE = `<html><head><link rel="stylesheet" href="${CSS[0]}"/><link rel="stylesheet" href="${CSS[1]}?dpl=dpl_abc"/>
  <link rel="preload" as="font" href="${FONT}"/><script src="/_next/static/chunks/0hd9zomiu73oj.js"></script></head>
  <body><h1>Tengingin rofnaði</h1><script>self.__next_f.push([1,"HL[\\"${CSS[0]}\\",\\"style\\"]"])</script></body></html>`;

type Handler = (e: unknown) => void;

function worker(version: string, start: Map<string, Map<string, Response>> = new Map()) {
  const store = start;
  const abs = (u: string | Request) => new URL(typeof u === 'string' ? u : u.url, ORIGIN).href;
  const strip = (u: string) => { const x = new URL(u); return x.origin + x.pathname; };
  const open = async (name: string) => {
    if (!store.has(name)) store.set(name, new Map());
    const m = store.get(name)!;
    return {
      put: async (u: string | Request, r: Response) => { m.set(abs(u), r); },
      addAll: async (us: string[]) => {
        for (const u of us) {
          const r = await net(new Request(abs(u)));
          if (!r.ok) throw new TypeError('addAll failed');
          m.set(abs(u), r);
        }
      },
      match: async (u: string | Request, o?: { ignoreSearch?: boolean }) => {
        const want = abs(u);
        for (const [k, r] of m) if (k === want || (o?.ignoreSearch && strip(k) === strip(want))) return r.clone();
        return undefined;
      },
      keys: async () => [...m.keys()].map(k => new Request(k)),
    };
  };
  let online = true;
  const failing = new Set<string>();
  const asked: string[] = [];
  const net = async (req: Request) => {
    const p = new URL(req.url).pathname;
    asked.push(p);
    if (!online || failing.has(p)) throw new TypeError('Failed to fetch');
    if (p === '/offline') return new Response(PAGE, { headers: { 'content-type': 'text/html' } });
    return new Response(`body of ${p}`);
  };
  const handlers: Record<string, Handler> = {};
  const state = { preload: false, claimed: false, skipped: false };
  const self = {
    location: { href: `${ORIGIN}/sw.js${version ? `?v=${version}` : ''}`, origin: ORIGIN },
    addEventListener: (t: string, f: Handler) => { handlers[t] = f; },
    skipWaiting: async () => { state.skipped = true; },
    clients: { claim: async () => { state.claimed = true; } },
    registration: { navigationPreload: { enable: async () => { state.preload = true; } } },
  };
  class Req extends Request { constructor(u: string | Request, i?: RequestInit) { super(typeof u === 'string' ? abs(u) : u, i); } }
  const caches = { open, keys: async () => [...store.keys()], delete: async (n: string) => store.delete(n) };
  vm.runInNewContext(SOURCE, { self, caches, fetch: (r: Request) => net(r), Request: Req, Response, URL, Set, Promise, Error, TypeError });

  const until = async (type: string, extra: object = {}) => {
    let done: Promise<unknown> = Promise.resolve();
    handlers[type]({ waitUntil: (p: Promise<unknown>) => { done = p; }, ...extra });
    await done;
  };
  /* what the worker answers with, or null when it leaves the request to the browser */
  const ask = async (url: string, init: { mode?: string; method?: string; preload?: Promise<Response | undefined> } = {}): Promise<Response | null> => {
    /* set from inside the handler, which TypeScript cannot see */
    let answer = null as Promise<Response> | null;
    const request = { url: abs(url), mode: init.mode ?? 'no-cors', method: init.method ?? 'GET' };
    handlers.fetch({ request, preloadResponse: init.preload ?? Promise.resolve(undefined), respondWith: (p: Promise<Response>) => { answer = p; } });
    return answer ? await answer : null;
  };
  return { store, state, asked, until, ask, goOffline: () => { online = false; }, fail: (p: string) => { failing.add(p); } };
}

const settle = () => new Promise(r => setTimeout(r, 0));

describe('the lost-connection worker', () => {
  it('keeps the screen with its stylesheets and faces, under the deploy\'s name', async () => {
    const w = worker('abc123');
    await w.until('install');
    const kept = [...w.store.get('jod-offline-abc123')!.keys()].map(k => new URL(k).pathname + new URL(k).search).sort();
    expect(kept).toEqual([CSS[0], `${CSS[1]}?dpl=dpl_abc`, FONT, '/offline'].sort());
    expect(w.state.skipped).toBe(true);
  });

  it('drops the copy before it, turns navigation preload on and takes over', async () => {
    const old = new Map([['jod-offline-v1', new Map<string, Response>()], ['jod-offline-old', new Map<string, Response>()]]);
    const w = worker('abc123', old);
    await w.until('install');
    await w.until('activate');
    expect([...w.store.keys()]).toEqual(['jod-offline-abc123']);
    expect(w.state).toMatchObject({ preload: true, claimed: true });
  });

  it('answers a page from the network, the preload first, and with the screen only when that fails', async () => {
    const w = worker('abc123');
    await w.until('install');
    const preloaded = new Response('the page, early');
    expect(await (await w.ask('/crew', { mode: 'navigate', preload: Promise.resolve(preloaded) }))!.text()).toBe('the page, early');
    expect(await (await w.ask('/crew', { mode: 'navigate' }))!.text()).toBe('body of /crew');
    w.goOffline();
    const lost = await w.ask('/crew', { mode: 'navigate', preload: Promise.reject(new TypeError('Failed to fetch')) });
    expect(await lost!.text()).toContain('Tengingin rofnaði');
  });

  it('hands out the screen\'s files only when the network fails them, and leaves every other request alone', async () => {
    const w = worker('abc123');
    await w.until('install');
    await settle();
    expect(await (await w.ask(CSS[0]))!.text()).toBe(`body of ${CSS[0]}`);
    expect(await w.ask('/_next/static/chunks/0hd9zomiu73oj.js')).toBeNull();
    expect(await w.ask('/_next/static/chunks/another-page.css')).toBeNull();
    expect(await w.ask('/api/server-status')).toBeNull();
    expect(await w.ask('/offline?_rsc=1')).toBeNull();
    expect(await w.ask('https://minotar.net/helm/stebbias/24')).toBeNull();
    w.goOffline();
    /* a newer deploy may name the same file with another ?dpl= */
    expect(await (await w.ask(`${CSS[1]}?dpl=dpl_new`))!.text()).toBe(`body of ${CSS[1]}`);
    expect(await (await w.ask(FONT))!.text()).toBe(`body of ${FONT}`);
  });

  it('knows its files again after waking, from the cache', async () => {
    const first = worker('abc123');
    await first.until('install');
    const woken = worker('abc123', first.store);
    await settle();
    expect(await woken.ask('/_next/static/chunks/another-page.css')).toBeNull();
    woken.goOffline();
    expect(await (await woken.ask(CSS[0]))!.text()).toBe(`body of ${CSS[0]}`);
  });

  it('keeps the worker before it when the screen\'s files cannot all be fetched', async () => {
    const w = worker('abc123');
    w.fail(FONT);
    await expect(w.until('install')).rejects.toThrow();
    expect(w.state.skipped).toBe(false);
    expect(await (await w.store.get('jod-offline-abc123')?.get(`${ORIGIN}/offline`))?.text()).toBeUndefined();
  });

  it('runs under one name on a build with no deploy named', async () => {
    const w = worker('');
    await w.until('install');
    expect([...w.store.keys()]).toEqual(['jod-offline-local']);
  });
});

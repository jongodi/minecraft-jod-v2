# Journal Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Push the existing trail-journal site further: a paper sheet on a leather desk with light and atmosphere, a cinematic hero, spring-driven gestures on the map, album and nav, and the same treatment on the crew pages.

**Architecture:** The public site is plain CSS (`src/app/frontier.css`, `j-` classes) plus client components in `src/components/frontier/`. Each task upgrades one section's look and its interaction together. Shared spring presets and gesture maths live in one new `motion.ts`; atmosphere (lantern, dust) is one new component. Nothing in the API layer, admin panel, editor, data files or Icelandic copy changes.

**Tech Stack:** Next.js 15 (App Router), React 18, TypeScript strict, `framer-motion` 11.18 (already installed), plain CSS with custom properties. No test framework exists in the repo; verification is `npm run lint`, `npm run build`, and headless-Chromium screenshots.

**Spec:** `docs/superpowers/specs/2026-09-15-journal-redesign-design.md`

## Global Constraints

- Icelandic UI copy stays as written; new copy is Icelandic, sentence case, no dashes in prose (the repo uses commas; see commit #41 "no dashes").
- Springs by default critically damped (`bounce: 0`); `bounce` only after a gesture with momentum.
- `prefers-reduced-motion: reduce`: cross-fades only, no parallax, no lantern, no motes. `prefers-reduced-transparency: reduce`: solid nav bar.
- Every section verified at 1440 px and 400 px.
- Raw `<img>` for Minecraft heads and screenshots is intentional (see `PlayerHead.tsx`); keep the `eslint-disable-next-line @next/next/no-img-element` comments.
- Only animate `transform` and `opacity` on anything that moves continuously.
- Keep existing `id`s (`top`, `camp`, `territory`, `postcards`, `showdown`, `tallies`, `provisions`, `ride`) so nav links work.
- Commit after every task; commit messages end with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.

## Verification tooling (used by every task)

The Playwright MCP server is unavailable in this environment, but a Playwright-managed Chromium exists at `C:\Users\jongo\AppData\Local\ms-playwright\chromium-1223\chrome-win64\chrome.exe`. Task 0 creates a small script that drives it with `playwright-core` for screenshots and overflow checks. Dev server: `npm run dev` on port 3000 (run in background; check `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000`).

---

### Task 0: Tooling and shared motion helpers

**Files:**
- Create: `scripts/shots.mjs`
- Create: `src/components/frontier/motion.ts`
- Modify: `package.json` (add `"shots"` script and `playwright-core` devDependency)

**Interfaces:**
- Produces: `SPRING`, `SPRING_SNAPPY`, `SPRING_THROW` (framer-motion `Transition` objects), `project(velocity, decel?)`, `rubberband(overshoot, dimension, constant?)`, `clamp(n, lo, hi)`. Later tasks import these by name from `./motion`.

- [ ] **Step 1: Install playwright-core as a dev dependency**

Run: `npm install --save-dev playwright-core@1.56.1 --no-audit --no-fund`
Expected: `package.json` gains `"playwright-core": "^1.56.1"` under devDependencies.

- [ ] **Step 2: Write the screenshot script**

`scripts/shots.mjs`:

```js
// Screenshots + overflow check against the running dev server.
// Usage: node scripts/shots.mjs <outDir> [path ...]
// Example: node scripts/shots.mjs shots / /crew /crew/stebbias
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const EXE = process.env.CHROME ?? 'C:/Users/jongo/AppData/Local/ms-playwright/chromium-1223/chrome-win64/chrome.exe';
const BASE = process.env.BASE ?? 'http://localhost:3000';
const [outDir = 'shots', ...paths] = process.argv.slice(2);
const pages = paths.length ? paths : ['/'];
const SIZES = [[1440, 900], [400, 800]];

mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch({ executablePath: EXE });
for (const [w, h] of SIZES) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  for (const p of pages) {
    await page.goto(BASE + p, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);
    const name = (p === '/' ? 'home' : p.replace(/^\//, '').replace(/\//g, '_')) + `-${w}.png`;
    await page.screenshot({ path: join(outDir, name), fullPage: true });
    const over = await page.evaluate(() => {
      const vw = document.documentElement.clientWidth;
      const wide = [];
      for (const el of document.querySelectorAll('body *')) {
        const r = el.getBoundingClientRect();
        if (r.right > vw + 1 && r.width > 0) wide.push(`${el.tagName.toLowerCase()}.${[...el.classList].join('.')} right=${Math.round(r.right)}`);
      }
      return { scrollWidth: document.documentElement.scrollWidth, vw, wide: wide.slice(0, 12) };
    });
    console.log(`${name}: scrollWidth=${over.scrollWidth} vw=${over.vw}${over.wide.length ? '\n  overflow: ' + over.wide.join('\n  overflow: ') : ''}`);
  }
  await ctx.close();
}
await browser.close();
```

Add to `package.json` scripts: `"shots": "node scripts/shots.mjs"`.

- [ ] **Step 3: Run it against the current site to record the baseline**

Run: `npm run dev` (background), then `node scripts/shots.mjs shots-before / /crew /crew/stebbias`
Expected: six PNGs in `shots-before/` and, for `home-400.png`, an `overflow:` list naming the elements that stick out past the viewport (this is the mobile bug from the spec; note the names, Task 1 fixes it).

- [ ] **Step 4: Add `shots-before/` and `shots/` to `.gitignore`**

Append to `.gitignore`:

```
shots/
shots-before/
```

- [ ] **Step 5: Write `motion.ts`**

```ts
import type { Transition } from 'framer-motion';

/* One house style for motion. Critically damped unless a gesture with
   momentum came first; then a little overshoot reads as physical. */
export const SPRING:        Transition = { type: 'spring', bounce: 0,   duration: 0.4 };
export const SPRING_SNAPPY: Transition = { type: 'spring', bounce: 0,   duration: 0.3 };
export const SPRING_THROW:  Transition = { type: 'spring', bounce: 0.2, duration: 0.4 };

/** Where a flick at `velocity` px/s would come to rest (exponential decay, like scroll). */
export function project(velocity: number, decelerationRate = 0.998): number {
  return ((velocity / 1000) * decelerationRate) / (1 - decelerationRate);
}

/** Resistance past a boundary: the further past, the less it follows. */
export function rubberband(overshoot: number, dimension: number, constant = 0.55): number {
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
}

export const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
```

- [ ] **Step 6: Lint and commit**

Run: `npm run lint`
Expected: no errors.

```bash
git add scripts/shots.mjs src/components/frontier/motion.ts package.json package-lock.json .gitignore
git commit -m "Tooling: screenshot script and shared spring presets

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 1: The sheet on the desk, atmosphere, mobile overflow, type tracking

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/app/frontier.css` (top section, `.j`, `.j-grain`, `.j-wrap`, `.j-hero__mark`, `.j-sc`)
- Create: `src/components/frontier/Atmosphere.tsx`
- Modify: `src/components/frontier/FrontierHome.tsx`, `src/app/crew/page.tsx`, `src/app/crew/[username]/page.tsx` (wrap in `.j-desk`, mount `Atmosphere`)

**Interfaces:**
- Produces: `<Atmosphere />` (no props). `.j-desk` wrapper class. CSS tokens `--desk`, `--sheet-shadow`.

- [ ] **Step 1: Body becomes the leather desk**

In `globals.css`, replace the `html` and `body` background lines:

```css
:root {
  /* …existing tokens… */
  --desk: #1d130b;
}
html { background: var(--desk); color: var(--ink); -webkit-text-size-adjust: 100%; }
body {
  background:
    radial-gradient(90% 60% at 50% 0%, rgba(120, 78, 40, 0.28), transparent 70%),
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0.75 0 0 0 0 0.55 0 0 0 0 0.35 0 0 0 0.10 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E"),
    var(--desk);
  background-size: auto, 200px 200px, auto;
  color: var(--ink);
  font-family: var(--font-text);
  font-size: 1.0625rem;
  line-height: 1.6;
  overflow-x: clip;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

Keep the rest of `globals.css` unchanged. The `/admin` and `/rp-editor` pages set their own root backgrounds, so this only shows behind the public sheet.

- [ ] **Step 2: The sheet, with deckled edges, on the desk**

In `frontier.css`, replace the `.j` rule and add `.j-desk`:

```css
/* ─── the desk and the sheet ─────────────────────────────────── */
.j-desk { position: relative; padding: clamp(0rem, 2vw, 1.75rem) clamp(0rem, 2.5vw, 2.25rem); }
.j-desk::before {
  /* the sheet's shadow lives on the desk, because a mask clips box-shadow */
  content: '';
  position: absolute;
  inset: clamp(0.4rem, 2.4vw, 2.1rem) clamp(0.2rem, 2.7vw, 2.4rem) clamp(-0.2rem, 1.6vw, 1.4rem);
  background: rgba(0, 0, 0, 0.001);
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.6), 0 4px 10px rgba(0, 0, 0, 0.5);
  pointer-events: none;
}
.j {
  position: relative;
  overflow: clip;
  color: var(--ink);
  background:
    radial-gradient(28rem 28rem at 88% 8%, rgba(120, 80, 30, 0.10), transparent 60%),
    radial-gradient(22rem 22rem at 6% 42%, rgba(120, 80, 30, 0.08), transparent 60%),
    radial-gradient(34rem 34rem at 70% 78%, rgba(120, 80, 30, 0.08), transparent 60%),
    linear-gradient(90deg, rgba(43, 29, 18, 0.10), transparent 3%, transparent 97%, rgba(43, 29, 18, 0.08)),
    var(--paper);
}
@media (min-width: 720px) {
  .j {
    /* deckled left and right edges: two repeating edge strips plus a solid middle, unioned */
    -webkit-mask:
      url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 240' preserveAspectRatio='none'%3E%3Cpath d='M24 0 L24 240 L6 240 C2 226 10 214 5 200 C1 188 9 176 4 164 C0 150 8 138 3 124 C0 110 9 98 5 84 C1 70 8 58 4 44 C0 30 9 18 5 0 Z' fill='%23000'/%3E%3C/svg%3E") left top / 24px 240px repeat-y,
      url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 240' preserveAspectRatio='none'%3E%3Cpath d='M0 0 L0 240 L18 240 C22 228 14 216 19 202 C23 190 15 178 20 166 C24 152 16 140 21 126 C24 112 15 100 19 86 C23 72 16 60 20 46 C24 32 15 20 19 0 Z' fill='%23000'/%3E%3C/svg%3E") right top / 24px 240px repeat-y,
      linear-gradient(#000, #000) 24px 0 / calc(100% - 48px) 100% no-repeat;
    mask:
      url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 240' preserveAspectRatio='none'%3E%3Cpath d='M24 0 L24 240 L6 240 C2 226 10 214 5 200 C1 188 9 176 4 164 C0 150 8 138 3 124 C0 110 9 98 5 84 C1 70 8 58 4 44 C0 30 9 18 5 0 Z' fill='%23000'/%3E%3C/svg%3E") left top / 24px 240px repeat-y,
      url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 240' preserveAspectRatio='none'%3E%3Cpath d='M0 0 L0 240 L18 240 C22 228 14 216 19 202 C23 190 15 178 20 166 C24 152 16 140 21 126 C24 112 15 100 19 86 C23 72 16 60 20 46 C24 32 15 20 19 0 Z' fill='%23000'/%3E%3C/svg%3E") right top / 24px 240px repeat-y,
      linear-gradient(#000, #000) 24px 0 / calc(100% - 48px) 100% no-repeat;
  }
}
/* fold line down the middle of the sheet */
.j::after {
  content: '';
  position: absolute;
  top: 0; bottom: 0;
  left: 50%;
  width: 6px;
  margin-left: -3px;
  background: linear-gradient(90deg, transparent, rgba(43, 29, 18, 0.05) 45%, rgba(255, 250, 235, 0.35) 52%, transparent);
  pointer-events: none;
  z-index: 0;
}
```

`.j-grain` stays as is (it is `position: fixed`, so it also grains the desk, which is wanted).

- [ ] **Step 3: Wrap the three pages in the desk**

`FrontierHome.tsx`: change the outer `<div className="j">` to

```tsx
<div className="j-desk">
  <div className="j">
    <div className="j-grain" aria-hidden="true" />
    <Atmosphere />
    {/* …everything else unchanged… */}
  </div>
</div>
```

Add `import Atmosphere from './Atmosphere';`. Do the same wrap (and `Atmosphere` import from `@/components/frontier/Atmosphere`) in `src/app/crew/page.tsx` and `src/app/crew/[username]/page.tsx`.

- [ ] **Step 4: Write `Atmosphere.tsx` (lantern + dust)**

```tsx
'use client';

import { useEffect, useRef } from 'react';
import { useReducedMotion } from 'framer-motion';

/* Two quiet layers: a warm lantern glow that drifts after the pointer,
   and a few dust motes. Both stay off for reduced motion and on touch. */
export default function Atmosphere() {
  const reduce = useReducedMotion();
  const glow   = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (reduce || !window.matchMedia('(pointer: fine)').matches) return;
    const el = glow.current;
    if (!el) return;
    let tx = window.innerWidth * 0.6, ty = window.innerHeight * 0.3, x = tx, y = ty, raf = 0;
    const onMove = (e: PointerEvent) => { tx = e.clientX; ty = e.clientY; };
    const tick = () => {
      x += (tx - x) * 0.04; y += (ty - y) * 0.04;
      el.style.transform = `translate3d(${x - 600}px, ${y - 600}px, 0)`;
      raf = requestAnimationFrame(tick);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    raf = requestAnimationFrame(tick);
    return () => { window.removeEventListener('pointermove', onMove); cancelAnimationFrame(raf); };
  }, [reduce]);

  useEffect(() => {
    if (reduce) return;
    const c = canvas.current;
    const ctx = c?.getContext('2d');
    if (!c || !ctx) return;
    const N = 40;
    let w = 0, h = 0, raf = 0, running = true;
    const motes = Array.from({ length: N }, () => ({ x: Math.random(), y: Math.random(), r: 0.6 + Math.random() * 1.6, vx: (Math.random() - 0.5) * 0.06, vy: -0.02 - Math.random() * 0.05, a: 0.15 + Math.random() * 0.25 }));
    const size = () => { w = c.width = window.innerWidth; h = c.height = window.innerHeight; };
    const draw = () => {
      if (!running) return;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = '#f6e6b8';
      for (const m of motes) {
        m.x += m.vx / 100; m.y += m.vy / 100;
        if (m.y < -0.02) { m.y = 1.02; m.x = Math.random(); }
        if (m.x < -0.02 || m.x > 1.02) m.vx *= -1;
        ctx.globalAlpha = m.a;
        ctx.beginPath(); ctx.arc(m.x * w, m.y * h, m.r, 0, Math.PI * 2); ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };
    const onVis = () => { running = !document.hidden; if (running) raf = requestAnimationFrame(draw); else cancelAnimationFrame(raf); };
    size();
    window.addEventListener('resize', size);
    document.addEventListener('visibilitychange', onVis);
    raf = requestAnimationFrame(draw);
    return () => { running = false; cancelAnimationFrame(raf); window.removeEventListener('resize', size); document.removeEventListener('visibilitychange', onVis); };
  }, [reduce]);

  if (reduce) return null;
  return (
    <>
      <div ref={glow} className="j-lantern" aria-hidden="true" />
      <canvas ref={canvas} className="j-motes" aria-hidden="true" />
    </>
  );
}
```

CSS, next to `.j-grain`:

```css
.j-lantern {
  position: fixed;
  top: 0; left: 0;
  width: 1200px; height: 1200px;
  z-index: 89;
  pointer-events: none;
  background: radial-gradient(circle, rgba(255, 196, 110, 0.16), rgba(255, 170, 80, 0.06) 35%, transparent 62%);
  mix-blend-mode: soft-light;
  will-change: transform;
}
.j-motes { position: fixed; inset: 0; z-index: 88; pointer-events: none; opacity: 0.9; }
@media (pointer: coarse) { .j-lantern { display: none; } }
```

- [ ] **Step 5: Type tracking by size**

In `frontier.css`:

```css
.j-wood { font-family: var(--font-wood); font-weight: 400; letter-spacing: 0.01em; }
.j-sc   { font-variant: small-caps; letter-spacing: 0.14em; font-weight: 600; }
.j-hero__mark { /* replace the existing letter-spacing line */ letter-spacing: -0.02em; }
.j-page__title { letter-spacing: -0.015em; }
.j-board__sign { letter-spacing: 0.03em; }
```

Body text (`Lora`) keeps `letter-spacing` unset. Small caps everywhere already carry `0.12em`–`0.18em`, which is the "slight positive" the spec asks for.

- [ ] **Step 6: Fix the phone-width overflow**

Run: `node scripts/shots.mjs shots / ` and read the `overflow:` list for `home-400.png`. The elements listed there are the cause. The known suspects and their fixes:

- `.j-stamp` (nowrap `PLAY.JODCRAFT.WORLD`): add `max-width: 100%; overflow: hidden; text-overflow: ellipsis;` and at `max-width: 480px` reduce to `font-size: 0.9rem; padding: 0.3rem 0.6rem;`.
- `.j-slip` (`min-width: 15rem`): change to `min-width: min(15rem, 100%)`.
- `.j-hero__grid` children: add `.j-hero__grid > * { min-width: 0; }`.
- `.j-rope__line` (`left: -2rem; width: calc(100% + 4rem)`): wrap the rope in `overflow: clip` by adding `.j-rope { overflow: clip; padding-inline: 0.5rem; }` at `max-width: 899px`.

Apply the fixes the list points at (all four are harmless if applied together). Re-run the script until `home-400.png` prints no `overflow:` lines and `scrollWidth` equals `vw`.

- [ ] **Step 7: Verify, screenshot, commit**

Run: `npm run lint && node scripts/shots.mjs shots / /crew /crew/stebbias`
Expected: lint clean; `shots/home-1440.png` shows a paper sheet with wavy left/right edges on a dark leather ground with a shadow; `home-400.png` reports no overflow.

```bash
git add -A src/app/globals.css src/app/frontier.css src/components/frontier src/app/crew
git commit -m "The sheet on the desk: leather ground, deckled edges, lantern and dust

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 2: Hero as the first page

**Files:**
- Modify: `src/components/frontier/Hero.tsx`
- Modify: `src/components/frontier/FrontierHome.tsx` (render the fixed signpost)
- Modify: `src/components/frontier/TrailNav.tsx` (`Signpost` gains a `fixed` prop)
- Modify: `src/app/frontier.css` (hero block)

**Interfaces:**
- Consumes: `SPRING` from `./motion`; `useAgo`, `useCopy`, `ServerState` from `./hooks`.
- Produces: `Signpost({ links, activeId, fixed?: boolean })`.

- [ ] **Step 1: Rewrite `Hero.tsx`**

```tsx
'use client';

import { useRef } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { Arrow, Pin, Stamp, Under } from './Bits';
import { SERVER_IP } from './data';
import { useAgo, useCopy, type ServerState } from './hooks';

export default function Hero({ server }: { server: ServerState }) {
  const [copied, copy] = useCopy(SERVER_IP);
  const { online, players, checkedAt } = server;
  const ago = useAgo(checkedAt);
  const reduce = useReducedMotion();
  const pan = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 600], [0, reduce ? 0 : 120]);

  return (
    <section id="top" className="j-sec j-hero">
      <div ref={pan} className="j-pan" aria-hidden="true">
        <motion.div className="j-pan__img" style={{ y }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/screenshots/the-castle.webp" alt="" fetchPriority="high" />
        </motion.div>
        <span className="j-pan__cap j-hand">Kastali Goða, séður frá vatninu. Allar myndirnar hér eru úr heiminum okkar.</span>
      </div>

      <div className="j-wrap j-hero__grid">
        <div className="j-hero__copy">
          <h1 className="j-hero__mark"><span>JOÐ</span></h1>
          <p className="j-note j-note--big j-hero__sub">Kubbaveröld, frá sumrinu 2024</p>
          <Under />
          <p className="j-hero__body">
            Átta vinir, einn heimur og ekkert verið að byrja upp á nýtt. Við erum með sérsmíðaða JOÐ gagnapakka og útlitspakka, og þú þarft boð til að komast inn. Hér höldum við utan um það sem er að gerast.
          </p>
          <div className="j-hero__meta">
            <Stamp r={-6} onClick={copy} copied={copied}>{copied ? 'Afritað' : SERVER_IP}</Stamp>
            <span className="j-note"><Arrow flip /> smelltu á stimpilinn til að afrita vistfangið</span>
          </div>
          <a href="#camp" className="j-hero__scroll j-note j-note--faint">leiðin byrjar hér <Arrow /></a>
        </div>

        <div className="j-hero__side">
          <div className="j-slip" style={{ '--r': '2deg' } as React.CSSProperties}>
            <Pin red style={{ top: -6, left: '50%', marginLeft: -7 }} />
            <div className="j-slip__head"><span>Símskeyti</span><span>{checkedAt ? (ago || 'rétt í þessu') : '…'}</span></div>
            <div className={`j-slip__word${online === null ? '' : online ? ' is-on' : ' is-off'}`}>
              {online === null ? 'Athuga stöðuna' : online ? 'Kveikt á þjóninum' : 'Slökkt á þjóninum'}
            </div>
            <div className="j-slip__row">
              {online === null ? 'bíð eftir svari…' : online ? (players === 0 ? 'enginn inni enn, en það er opið' : `inni núna: ${players}`) : 'ekki hægt að tengjast í augnablikinu'}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
```

`Hero` no longer takes `activeId`; the signpost moves to `FrontierHome`. Update the call there: `<Hero server={server} />`.

- [ ] **Step 2: Hero CSS**

Replace the whole `/* ─── hero … */` block up to (not including) `.j-print` with:

```css
/* ─── hero: a panorama print across the top of the first page ── */
.j-hero { padding-top: 0; padding-bottom: clamp(2rem, 5vw, 4rem); }
.j-pan {
  position: relative;
  height: clamp(16rem, 46vh, 30rem);
  overflow: clip;
  background: var(--leather);
  -webkit-mask: linear-gradient(#000, #000) top / 100% calc(100% - 18px) no-repeat,
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 240 18' preserveAspectRatio='none'%3E%3Cpath d='M0 0 L240 0 L240 6 C222 14 206 2 190 9 C174 16 160 4 142 11 C126 17 108 3 92 10 C76 16 60 5 44 12 C28 17 12 6 0 9 Z' fill='%23000'/%3E%3C/svg%3E") bottom / 240px 18px repeat-x;
  mask: linear-gradient(#000, #000) top / 100% calc(100% - 18px) no-repeat,
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 240 18' preserveAspectRatio='none'%3E%3Cpath d='M0 0 L240 0 L240 6 C222 14 206 2 190 9 C174 16 160 4 142 11 C126 17 108 3 92 10 C76 16 60 5 44 12 C28 17 12 6 0 9 Z' fill='%23000'/%3E%3C/svg%3E") bottom / 240px 18px repeat-x;
}
.j-pan__img { position: absolute; inset: -20% 0 0 0; will-change: transform; }
.j-pan__img img { width: 100%; height: 100%; object-fit: cover; filter: sepia(0.25) contrast(1.05) saturate(0.9); }
.j-pan::after {
  content: '';
  position: absolute; inset: 0;
  background: linear-gradient(180deg, rgba(23, 17, 12, 0.35), transparent 30%, transparent 55%, rgba(239, 227, 198, 0.55) 92%, var(--paper));
  pointer-events: none;
}
.j-pan__cap { position: absolute; right: clamp(1.25rem, 5vw, 3rem); bottom: 1.6rem; font-size: 1.15rem; color: var(--cream); text-shadow: 0 1px 3px rgba(0, 0, 0, 0.7); max-width: 40ch; text-align: right; }

.j-hero__grid { display: grid; grid-template-columns: minmax(0, 1fr); gap: 2rem; align-items: start; margin-top: -4.5rem; }
.j-hero__grid > * { min-width: 0; }
@media (min-width: 900px) { .j-hero__grid { grid-template-columns: minmax(0, 7fr) minmax(0, 5fr); gap: 2rem; margin-top: -7rem; } }
.j-hero__mark {
  font-family: var(--font-wood);
  font-size: clamp(5.2rem, 20vw, 15rem);
  line-height: 0.9;
  letter-spacing: -0.02em;
  color: var(--ink);
}
.j-hero__mark span {
  display: inline-block;
  background: linear-gradient(180deg, #5a3d28 0%, #2b1d12 38%, #2b1d12 62%, #1a1008 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  filter: drop-shadow(2px 2px 0 var(--paper-2)) drop-shadow(5px 6px 0 rgba(43, 29, 18, 0.22));
}
.j-hero__sub { margin-top: 0.4rem; }
.j-hero__body { margin-top: 1.4rem; max-width: 42ch; font-size: 1.1rem; line-height: 1.6; }
.j-hero__meta { margin-top: 1.5rem; display: flex; flex-wrap: wrap; align-items: center; gap: 1rem 1.5rem; }
.j-hero__scroll { margin-top: 2.5rem; display: inline-flex; align-items: center; gap: 0.5rem; text-decoration: none; }
.j-hero__side { display: flex; justify-content: flex-end; padding-top: 6rem; }
@media (max-width: 899px) { .j-hero__side { justify-content: flex-start; padding-top: 0; } }
.j-slip { /* keep existing rule, change one line: */ min-width: min(15rem, 100%); }
```

The `.j-sign` rules are replaced in Step 3.

- [ ] **Step 3: The signpost sticks**

In `TrailNav.tsx`, change `Signpost`:

```tsx
export function Signpost({ links, activeId, fixed = false }: { links: NavLink[]; activeId?: string | null; fixed?: boolean }) {
  return (
    <nav className={`j-sign${fixed ? ' j-sign--fixed' : ''}`} aria-label="Efnisyfirlit">
      <span className="j-sign__pole" aria-hidden="true" />
      {links.map((l, i) => (
        <Link key={l.href} href={l.href} className={`j-sign__plank${activeId && l.id === activeId ? ' is-active' : ''}`} style={{ '--r': `${TILT[i % TILT.length]}deg` } as CSSProperties}>
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
```

In `FrontierHome.tsx`, after `<TrailNav … />` add `<Signpost links={HOME_LINKS} activeId={active} fixed />` and import `{ Signpost }` from `./TrailNav`.

CSS (replace the old `.j-sign` block):

```css
.j-sign { display: none; }
@media (min-width: 1180px) {
  .j-sign--fixed { display: block; position: fixed; right: clamp(1rem, 3vw, 2.5rem); top: 50%; transform: translateY(-50%); z-index: 38; width: 13rem; padding-left: 1.4rem; }
  .j-sign__pole { position: absolute; left: 0.55rem; top: -1rem; bottom: -1rem; width: 0.9rem; background: linear-gradient(90deg, #4a321f, #7a5636 45%, #4a321f); border-radius: 3px; box-shadow: 2px 0 3px rgba(0, 0, 0, 0.5); }
  .j-sign__plank {
    position: relative; display: block; margin: 0.45rem 0; padding: 0.45rem 1.4rem 0.45rem 0.9rem;
    font-family: var(--font-wood); font-size: 0.9rem; letter-spacing: 0.04em; text-transform: uppercase;
    color: var(--cream); text-decoration: none;
    background: linear-gradient(180deg, #7d5a38, #5d4026);
    box-shadow: 0 3px 6px rgba(0, 0, 0, 0.45);
    clip-path: polygon(0 0, calc(100% - 1rem) 0, 100% 50%, calc(100% - 1rem) 100%, 0 100%);
    transform: rotate(var(--r, 0deg)); transform-origin: left center;
    transition: transform 0.15s ease, background 0.15s ease;
  }
  .j-sign__plank:hover { transform: rotate(var(--r, 0deg)) translateX(4px); background: linear-gradient(180deg, #8f6a44, #6b4a2d); }
  .j-sign__plank:active { transform: rotate(var(--r, 0deg)) translateX(2px) scale(0.98); }
  .j-sign__plank.is-active { background: linear-gradient(180deg, #a5442e, #7a2e1f); }
}
```

- [ ] **Step 4: Remove the now-unused hero print rules**

Delete `.j-hero__print` rules from `frontier.css` (`.j-print` itself stays; the map uses it).

- [ ] **Step 5: Verify and commit**

Run: `npm run lint && node scripts/shots.mjs shots /`
Expected: panorama across the top with a torn paper bottom edge, the `JOÐ` mark overlapping it, telegram on the right; signpost fixed on the right at 1440 px; nothing overflows at 400 px.

```bash
git add src/components/frontier/Hero.tsx src/components/frontier/FrontierHome.tsx src/components/frontier/TrailNav.tsx src/app/frontier.css
git commit -m "Hero: panorama print, wood-type mark, fixed signpost

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 3: Nav bar and draggable drawer

**Files:**
- Modify: `src/components/frontier/TrailNav.tsx`
- Modify: `src/app/frontier.css` (`.j-bar`, `.j-menu`)

**Interfaces:**
- Consumes: `SPRING`, `project` from `./motion`.

- [ ] **Step 1: The bar becomes a translucent material**

Replace the `.j-bar` and `.j-menu` CSS:

```css
.j-bar {
  position: fixed; inset-inline: 0; top: 0; z-index: 40;
  color: var(--paper);
  background: rgba(42, 27, 16, 0.72);
  -webkit-backdrop-filter: blur(14px) saturate(140%);
  backdrop-filter: blur(14px) saturate(140%);
  box-shadow: inset 0 1px 0 rgba(255, 224, 176, 0.12);
  transform: translateY(-100%);
  transition: transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
}
.j-bar::after {
  /* scroll edge: content fades as it passes under the bar */
  content: ''; position: absolute; left: 0; right: 0; top: 100%; height: 14px;
  background: linear-gradient(180deg, rgba(23, 17, 12, 0.25), transparent);
  pointer-events: none;
}
.j-bar.is-shown { transform: none; }
@media (prefers-reduced-transparency: reduce) { .j-bar { background: var(--leather-2); backdrop-filter: none; -webkit-backdrop-filter: none; } }
@media (prefers-contrast: more) { .j-bar { background: var(--leather-2); border-bottom: 1px solid var(--brass); } }

.j-menu {
  position: fixed; inset: 0; z-index: 39; display: none;
  background: var(--paper);
  padding: 4.75rem clamp(1.25rem, 5vw, 3rem) 2rem;
  flex-direction: column;
  box-shadow: -10px 0 30px rgba(0, 0, 0, 0.5);
  touch-action: pan-y;
}
.j-menu.is-open { display: flex; }
.j-scrim { position: fixed; inset: 0; z-index: 38; background: rgba(23, 17, 12, 0.55); }
```

Keep the `.j-bar__*`, `.j-burger`, `.j-menu__link`, `.j-menu__foot` rules and the two `@media (min-width: 900px)` rules as they are.

- [ ] **Step 2: The drawer is a spring you can drag shut**

Replace `TrailNav`'s default export:

```tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { CSSProperties } from 'react';
import { AnimatePresence, motion, useReducedMotion, type PanInfo } from 'framer-motion';
import { SERVER_IP, type NavLink } from './data';
import { useCopy } from './hooks';
import { SPRING, project } from './motion';

interface Props { links: NavLink[]; activeId?: string | null; always?: boolean }

/** The sticky bar. On the home page it stays hidden until the reader
    scrolls past the first page of the journal; elsewhere it's always up.
    The phone menu is a drawer from the right that follows the finger. */
export default function TrailNav({ links, activeId, always = false }: Props) {
  const [shown, setShown] = useState(always);
  const [open, setOpen]   = useState(false);
  const [copied, copy]    = useCopy(SERVER_IP);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (always) return;
    const onScroll = () => setShown(window.scrollY > window.innerHeight * 0.7);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [always]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const onDragEnd = (_: unknown, info: PanInfo) => {
    /* where the flick would land decides, not where the finger let go */
    const landing = info.offset.x + project(info.velocity.x);
    if (landing > window.innerWidth * 0.35) setOpen(false);
  };

  return (
    <>
      <header className={`j-bar${shown || open ? ' is-shown' : ''}`}>
        <div className="j-wrap j-bar__inner">
          <Link href="/" className="j-bar__mark" onClick={() => setOpen(false)}>JOÐ</Link>
          <nav className="j-bar__links" aria-label="Efnisyfirlit">
            {links.map(l => (
              <Link key={l.href} href={l.href} className={`j-bar__link${activeId && l.id === activeId ? ' is-active' : ''}`}>{l.label}</Link>
            ))}
          </nav>
          <div className="j-bar__right">
            <span className="j-bar__addr">{SERVER_IP}<button onClick={copy}>{copied ? 'afritað' : 'afrita'}</button></span>
            <button className={`j-burger${open ? ' is-open' : ''}`} onClick={() => setOpen(o => !o)} aria-expanded={open} aria-controls="j-menu" aria-label={open ? 'Loka valmynd' : 'Opna valmynd'}>
              <span /><span /><span />
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {open && (
          <>
            <motion.div key="scrim" className="j-scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} onClick={() => setOpen(false)} />
            <motion.div
              key="menu"
              id="j-menu"
              className="j-menu is-open"
              initial={reduce ? { opacity: 0 } : { x: '100%' }}
              animate={reduce ? { opacity: 1 } : { x: 0 }}
              exit={reduce ? { opacity: 0 } : { x: '100%' }}
              transition={reduce ? { duration: 0.2 } : SPRING}
              drag={reduce ? false : 'x'}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={{ left: 0.05, right: 1 }}
              onDragEnd={onDragEnd}
            >
              {links.map((l, i) => (
                <Link key={l.href} href={l.href} className="j-menu__link" onClick={() => setOpen(false)}>
                  <small>{i + 1}.</small>{l.label}
                </Link>
              ))}
              <div className="j-menu__foot">
                <button className={`j-btn${copied ? ' is-copied' : ''}`} onClick={copy}>{copied ? 'Vistfang afritað' : `Afrita ${SERVER_IP}`}</button>
                <p className="j-note j-note--faint">Java-útgáfa · aðgangur með boði</p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
```

Keep the `TILT` constant and `Signpost` below as changed in Task 2. Note `aria-hidden` on the menu is gone because the menu is now unmounted when closed.

- [ ] **Step 3: Verify and commit**

Run: `npm run lint && npm run build`
Expected: both pass. Then in a browser at 400 px: open the burger, drag the drawer right and let go slowly (it springs back), flick right (it closes). Scroll on desktop: the bar is translucent with the page visible through it.

```bash
git add src/components/frontier/TrailNav.tsx src/app/frontier.css
git commit -m "Nav: translucent bar with scroll edge, draggable drawer

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 4: Camp: pegs that really swing

**Files:**
- Modify: `src/components/frontier/Camp.tsx`
- Modify: `src/app/frontier.css` (`.j-peg*`)

**Interfaces:**
- Consumes: `CREW`, `PlayerHead`, `Rope`, `Stamp`, `Arrow`, `ServerState`.

- [ ] **Step 1: Replace the keyframe swing with a velocity-driven spring**

`Camp.tsx`:

```tsx
'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { motion, useMotionValue, useSpring, useReducedMotion } from 'framer-motion';
import PlayerHead from './PlayerHead';
import { Arrow, Rope, Stamp } from './Bits';
import { CREW } from './data';
import type { ServerState } from './hooks';

const TILT = [-3, 2, -1.5, 3, -2.5, 1.5, -2, 2.5];

/* One portrait on a peg. Pointer speed across it kicks the rotation;
   an under-damped spring brings it back to its resting tilt. */
function Peg({ name, tilt, on }: { name: string; tilt: number; on: boolean }) {
  const reduce = useReducedMotion();
  const rot = useMotionValue(tilt);
  const spring = useSpring(rot, { stiffness: 140, damping: 9, mass: 0.9 });
  const last = useRef<{ x: number; t: number } | null>(null);

  const onMove = (e: React.PointerEvent) => {
    if (reduce) return;
    const now = performance.now();
    if (last.current) {
      const vx = (e.clientX - last.current.x) / Math.max(1, now - last.current.t); // px per ms
      rot.set(tilt + Math.max(-14, Math.min(14, vx * 40)));
    }
    last.current = { x: e.clientX, t: now };
  };
  const onLeave = () => { last.current = null; rot.set(tilt); };

  return (
    <Link href={`/crew/${name}`} className={`j-peg${on ? ' is-in' : ''}`} title={name} onPointerMove={onMove} onPointerLeave={onLeave}>
      <motion.span className="j-peg__swing" style={{ rotate: reduce ? tilt : spring }}>
        <span className="j-peg__clip" aria-hidden="true" />
        {on && <span className="j-peg__glow" aria-hidden="true" />}
        <span className="j-peg__frame"><PlayerHead name={name} size={128} /></span>
        {on && <span className="j-peg__in"><Stamp small r={12}>Inni</Stamp></span>}
        <span className="j-peg__name">{name}</span>
        {!on && <span className="j-peg__away">í pásu</span>}
      </motion.span>
    </Link>
  );
}

export default function Camp({ server }: { server: ServerState }) {
  const { online, players, list } = server;
  const lower = list.map(n => n.toLowerCase());
  const riding = CREW.filter(n => lower.includes(n.toLowerCase())).length;

  return (
    <section id="camp" className="j-sec">
      <div className="j-wrap">
        <div className="j-camp__head">
          <div className="j-camp__title">
            <p className="j-note j-note--big">Hver er inni í kvöld?</p>
            <p className="j-note">
              {online === null ? 'athuga stöðuna…' :
               online ? (riding === 0 ? 'þjónninn er opinn en enginn kominn inn enn' : `${riding} úr hópnum inni${players > riding ? `, gestir: ${players - riding}` : ''}`) :
               'slökkt á þjóninum, allir í pásu'}
            </p>
          </div>
          <p className="j-note j-note--faint">þau sem eru í lit eru inni núna <Arrow /></p>
        </div>

        <div className="j-rope">
          <Rope />
          <div className="j-rope__row">
            {CREW.map((name, i) => <Peg key={name} name={name} tilt={TILT[i % TILT.length]} on={!!online && lower.includes(name.toLowerCase())} />)}
          </div>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Peg CSS**

Replace `.j-peg` … `.j-peg__away` rules:

```css
.j-peg { position: relative; flex: 0 0 8.2rem; scroll-snap-align: center; text-decoration: none; color: var(--ink); text-align: center; }
@media (min-width: 900px) { .j-peg { flex: 0 1 8.4rem; } }
.j-peg__swing { position: relative; display: block; transform-origin: 50% -1rem; will-change: transform; }
.j-peg__clip { position: absolute; top: -1.15rem; left: 50%; width: 0.7rem; height: 1.7rem; margin-left: -0.35rem; background: linear-gradient(90deg, #b0865a, #d8b07a 50%, #a67d50); border-radius: 2px; box-shadow: 0 1px 2px rgba(43, 29, 18, 0.4); z-index: 2; }
.j-peg__clip::after { content: ''; position: absolute; left: 0.22rem; top: 0.25rem; width: 0.25rem; height: 0.5rem; background: #6d4b2a; border-radius: 1px; }
.j-peg__glow { position: absolute; inset: -1.2rem -1.2rem 1rem; border-radius: 50%; background: radial-gradient(circle, rgba(255, 190, 90, 0.55), rgba(255, 170, 60, 0.18) 45%, transparent 70%); filter: blur(6px); mix-blend-mode: multiply; animation: j-lantern 3.4s ease-in-out infinite; pointer-events: none; }
@keyframes j-lantern { 0%, 100% { opacity: 0.75; } 50% { opacity: 1; } }
.j-peg__frame { position: relative; display: block; padding: 5px; background: linear-gradient(160deg, #3a2718, #1c130d); box-shadow: 0 6px 14px rgba(43, 29, 18, 0.32), inset 0 1px 0 rgba(255, 224, 176, 0.12); }
.j-peg__frame img { width: 100%; aspect-ratio: 1; object-fit: cover; image-rendering: pixelated; filter: sepia(0.85) contrast(0.9) brightness(0.72); transition: filter 0.35s ease; }
.j-peg.is-in img, .j-peg:hover img { filter: none; }
.j-peg__name { display: block; margin-top: 0.5rem; font-family: var(--font-hand); font-size: 1.3rem; line-height: 1.1; color: var(--ink); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.j-peg__in { position: absolute; right: -0.4rem; top: 0.6rem; z-index: 2; }
.j-peg__away { display: block; font-family: var(--font-hand); font-size: 1rem; color: var(--ink-faint); }
```

Delete the old `.j-peg.is-swing` rule and `@keyframes j-swing`.

- [ ] **Step 3: Verify and commit**

Run: `npm run lint && node scripts/shots.mjs shots /`
Expected: lint clean. In a browser, sweeping the pointer across the rope makes the portraits swing and settle; players who are online have a warm glow behind the frame.

```bash
git add src/components/frontier/Camp.tsx src/app/frontier.css
git commit -m "Camp: pegs swing on a spring, lantern glow for who is in

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 5: Map you can pan, zoom and snap

**Files:**
- Modify: `src/components/frontier/TerritoryMap.tsx`
- Modify: `src/app/frontier.css` (`.j-map*`, `.j-pin-map*`)

**Interfaces:**
- Consumes: `clamp`, `rubberband`, `SPRING` from `./motion`; `MapLocation`, `MapZone`, `MapPath`, defaults from `@/lib/map-types`; `Plate`.

- [ ] **Step 1: Add a viewport layer between the sheet and the SVG**

In `TerritoryMap.tsx`, add imports:

```tsx
import { motion, useMotionValue, useReducedMotion, animate } from 'framer-motion';
import { clamp, rubberband, SPRING } from './motion';
```

Add these constants after `LAND_PATH`:

```tsx
const VB_W = 1000, VB_H = 650;
const MIN_Z = 1, MAX_Z = 3.2;
```

Inside the component, after `sheet`:

```tsx
  const reduce = useReducedMotion();
  const x = useMotionValue(0), y = useMotionValue(0), z = useMotionValue(1);
  const drag = useRef<{ id: number; sx: number; sy: number; ox: number; oy: number; moved: boolean } | null>(null);

  /* pan limits for the current zoom, in CSS px of the sheet */
  const limits = () => {
    const el = sheet.current!;
    const w = el.clientWidth, h = el.clientHeight, s = z.get();
    return { minX: w - w * s, minY: h - h * s, w, h };
  };
  const settle = () => {
    const { minX, minY } = limits();
    const tx = clamp(x.get(), minX, 0), ty = clamp(y.get(), minY, 0);
    animate(x, tx, SPRING); animate(y, ty, SPRING);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (reduce) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { id: e.pointerId, sx: e.clientX, sy: e.clientY, ox: x.get(), oy: y.get(), moved: false };
    x.stop(); y.stop();
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.sx, dy = e.clientY - d.sy;
    if (Math.abs(dx) + Math.abs(dy) > 6) d.moved = true;
    const { minX, minY, w, h } = limits();
    let nx = d.ox + dx, ny = d.oy + dy;
    if (nx > 0)    nx = rubberband(nx, w);
    if (nx < minX) nx = minX + rubberband(nx - minX, w);
    if (ny > 0)    ny = rubberband(ny, h);
    if (ny < minY) ny = minY + rubberband(ny - minY, h);
    x.set(nx); y.set(ny);
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (drag.current?.id !== e.pointerId) return;
    drag.current = null;
    settle();
  };
  const onWheel = (e: React.WheelEvent) => {
    if (reduce || !e.ctrlKey && Math.abs(e.deltaY) < 1) return;
    e.preventDefault();
    const el = sheet.current!;
    const r = el.getBoundingClientRect();
    const px = e.clientX - r.left, py = e.clientY - r.top;
    const s0 = z.get();
    const s1 = clamp(s0 * (e.deltaY < 0 ? 1.12 : 1 / 1.12), MIN_Z, MAX_Z);
    /* keep the point under the cursor fixed */
    x.set(px - (px - x.get()) * (s1 / s0));
    y.set(py - (py - y.get()) * (s1 / s0));
    z.set(s1);
    settle();
  };
  /** Spring the view so `loc` sits at the centre at zoom 2. */
  const flyTo = (loc: MapLocation) => {
    setSelected(loc.id);
    if (reduce) return;
    const el = sheet.current!;
    const w = el.clientWidth, h = el.clientHeight;
    const s = 2;
    const cx = (loc.x / VB_W) * w * s, cy = (loc.y / VB_H) * h * s;
    animate(z, s, SPRING);
    animate(x, clamp(w / 2 - cx, w - w * s, 0), SPRING);
    animate(y, clamp(h / 2 - cy, h - h * s, 0), SPRING);
  };
  const resetView = () => { animate(z, 1, SPRING); animate(x, 0, SPRING); animate(y, 0, SPRING); };
```

Add a non-passive wheel listener (React's `onWheel` is passive, so `preventDefault` would warn):

```tsx
  useEffect(() => {
    const el = sheet.current;
    if (!el) return;
    const h = (e: WheelEvent) => onWheel(e as unknown as React.WheelEvent);
    el.addEventListener('wheel', h, { passive: false });
    return () => el.removeEventListener('wheel', h);
  // onWheel reads motion values only; recreating it is harmless
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduce]);
```

- [ ] **Step 2: Wire the JSX**

Change the sheet div and wrap the SVG:

```tsx
<div ref={sheet} className={`j-map__sheet${surveyed ? ' is-surveyed' : ''}`}
  onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
  onDoubleClick={resetView}>
  <motion.div className="j-map__view" style={{ x, y, scale: z, transformOrigin: '0 0' }}>
    <svg …unchanged attributes…>
      …unchanged content…
    </svg>
  </motion.div>
  {!reduce && <button type="button" className="j-map__reset j-stamp j-stamp--small" style={{ '--r': '3deg' } as CSSProperties} onClick={resetView}>Allt kortið</button>}
</div>
```

Change every pin `onClick={() => setSelected(loc.id)}` to `onClick={() => { if (!drag.current?.moved) setSelected(loc.id); }}` (a drag that ends on a pin must not select it), and the index buttons' `onClick={() => setSelected(loc.id)}` to `onClick={() => flyTo(loc)}`.

- [ ] **Step 3: The print flies from the pin**

Replace the `{selected && (<figure …>)}` block:

```tsx
{selected && (
  <motion.figure
    key={selected.id}
    className="j-print j-map__print"
    style={{ '--r': '4deg' } as CSSProperties}
    initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.6, x: -120, y: -80, rotate: -6 }}
    animate={reduce ? { opacity: 1 } : { opacity: 1, scale: 1, x: 0, y: 0, rotate: 0 }}
    transition={reduce ? { duration: 0.2 } : SPRING}
    aria-live="polite"
  >
    <Tape at="top" />
    {plate ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={plate.src} alt={plate.title} loading="lazy" />
    ) : (
      <div className="j-print__empty" aria-hidden="true"><span>engin mynd enn</span></div>
    )}
    <figcaption className="j-print__cap">
      {selected.id}. {titleCase(selected.label)}{selected.sublabel && <>, {handCase(selected.sublabel).replace(/\s*·\s*/g, ', ')}</>}
    </figcaption>
  </motion.figure>
)}
```

- [ ] **Step 4: Map CSS**

Replace the `.j-map__sheet`, `.j-map__sheet svg`, `.j-pin-map*` rules and add the new ones:

```css
.j-map__sheet { position: relative; overflow: clip; transform: rotate(-1.2deg); filter: drop-shadow(0 12px 22px rgba(43, 29, 18, 0.35)); cursor: grab; touch-action: none; border-radius: 2px; }
.j-map__sheet:active { cursor: grabbing; }
.j-map__view { will-change: transform; }
.j-map__view svg { width: 100%; height: auto; display: block; }
.j-map__reset { position: absolute; right: 0.8rem; bottom: 0.8rem; z-index: 4; cursor: pointer; }
.j-pin-map { cursor: pointer; }
.j-pin-map__hit { fill: transparent; }
.j-pin-map__body { transition: transform 0.15s cubic-bezier(0.2, 0.8, 0.2, 1); transform-box: fill-box; transform-origin: center bottom; }
.j-pin-map:hover .j-pin-map__body { transform: translateY(-2px) scale(1.15); }
.j-pin-map:active .j-pin-map__body { transform: scale(1.05); }
```

Also in the SVG defs add a highlight so pins read as metal, and use it on the pin body: after the `jTack` gradient add

```tsx
<radialGradient id="jShine" cx="0.3" cy="0.25" r="0.5"><stop offset="0" stopColor="#fff" stopOpacity="0.7" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></radialGradient>
```

and inside `.j-pin-map__body`, after the main `<circle … fill={active ? 'url(#jWax)' : 'url(#jTack)'} />`, add `<circle cx={loc.x} cy={loc.y} r="13" fill="url(#jShine)" pointerEvents="none" />`.

- [ ] **Step 5: Verify and commit**

Run: `npm run lint && npm run build && node scripts/shots.mjs shots /`
Expected: build passes. In a browser: drag the map (it follows 1:1 and resists past the edge, then springs back), wheel to zoom around the cursor, click an index entry (the map springs to the pin at 2×; the print pops in from the upper left), double-click or "Allt kortið" resets. A drag that ends on a pin does not change the selection. Keyboard Enter on a pin still selects.

```bash
git add src/components/frontier/TerritoryMap.tsx src/app/frontier.css
git commit -m "Map: pan, zoom, rubber-band edges, spring to a pin

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 6: Album and a lightbox you can throw

**Files:**
- Modify: `src/components/frontier/Lightbox.tsx`
- Modify: `src/components/frontier/Postcards.tsx`
- Modify: `src/app/frontier.css` (`.j-lb*`, `.j-polaroid`)

**Interfaces:**
- Produces: `Lightbox({ photos, index, onClose, onPrev, onNext, origin?: DOMRect | null })`. Callers pass the clicked element's `getBoundingClientRect()` as `origin` so the photo opens from there.
- Consumes: `SPRING`, `SPRING_THROW`, `project` from `./motion`.

- [ ] **Step 1: Rewrite `Lightbox.tsx`**

```tsx
'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion, type PanInfo } from 'framer-motion';
import { SPRING, SPRING_THROW, project } from './motion';

export interface LightboxPhoto { src: string; title?: string; sub?: string }

interface Props {
  photos: LightboxPhoto[]; index: number;
  onClose: () => void; onPrev: () => void; onNext: () => void;
  /** Where the photo was on the page, so it opens from there and returns there. */
  origin?: DOMRect | null;
}

/* A photograph held in the hand: it opens from the print you clicked,
   follows the finger 1:1, and a flick throws it to the next one or
   drops it back onto the page. */
export default function Lightbox({ photos, index, onClose, onPrev, onNext, origin }: Props) {
  const reduce = useReducedMotion();
  const [dir, setDir] = useState(0);
  const photo = photos[index];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape')     onClose();
      if (e.key === 'ArrowLeft')  { setDir(-1); onPrev(); }
      if (e.key === 'ArrowRight') { setDir(1);  onNext(); }
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [onClose, onPrev, onNext]);

  if (!photo) return null;

  const from = origin && !reduce
    ? { x: origin.left + origin.width / 2 - window.innerWidth / 2, y: origin.top + origin.height / 2 - window.innerHeight / 2, scale: Math.max(0.15, origin.width / Math.min(window.innerWidth * 0.9, 1100)), opacity: 1 }
    : { opacity: 0 };

  const onDragEnd = (_: unknown, info: PanInfo) => {
    const lx = info.offset.x + project(info.velocity.x);
    const ly = info.offset.y + project(info.velocity.y);
    if (Math.abs(ly) > window.innerHeight * 0.35 && Math.abs(ly) > Math.abs(lx)) { onClose(); return; }
    if (photos.length > 1 && Math.abs(lx) > window.innerWidth * 0.3) { setDir(lx < 0 ? 1 : -1); (lx < 0 ? onNext : onPrev)(); }
  };

  return (
    <motion.div className="j-lb" role="dialog" aria-modal="true" aria-label={photo.title ?? 'Mynd'} onClick={onClose}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
      <button className="j-lb__close" onClick={onClose} aria-label="Loka">✕</button>
      <div className="j-lb__img">
        <AnimatePresence initial={false} custom={dir} mode="popLayout">
          <motion.div
            key={photo.src}
            className="j-lb__card"
            custom={dir}
            initial={reduce ? { opacity: 0 } : dir === 0 ? from : { x: dir * window.innerWidth * 0.6, rotate: dir * 6, opacity: 0 }}
            animate={{ x: 0, y: 0, scale: 1, rotate: 0, opacity: 1 }}
            exit={reduce ? { opacity: 0 } : dir === 0 ? from : { x: -dir * window.innerWidth * 0.6, rotate: -dir * 6, opacity: 0 }}
            transition={reduce ? { duration: 0.2 } : dir === 0 ? SPRING : SPRING_THROW}
            drag={!reduce}
            dragElastic={0.9}
            dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
            dragTransition={{ bounceStiffness: 400, bounceDamping: 30 }}
            onDragEnd={onDragEnd}
            onClick={e => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo.src} alt={photo.title ?? ''} draggable={false} />
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="j-lb__bar" onClick={e => e.stopPropagation()}>
        <div className="j-lb__cap">{photo.title}{photo.sub && <small>{photo.sub}</small>}</div>
        {photos.length > 1 && (
          <div className="j-inline">
            <span className="j-lb__count">{index + 1} / {photos.length}</span>
            <button className="j-arrowbtn" onClick={() => { setDir(-1); onPrev(); }} aria-label="Fyrri mynd">←</button>
            <button className="j-arrowbtn" onClick={() => { setDir(1); onNext(); }} aria-label="Næsta mynd">→</button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
```

- [ ] **Step 2: Postcards passes the origin and animates the exit**

In `Postcards.tsx`:

```tsx
import { AnimatePresence } from 'framer-motion';
// …
const [open, setOpen] = useState<number | null>(null);
const [origin, setOrigin] = useState<DOMRect | null>(null);
// button onClick:
onClick={e => { setOrigin(e.currentTarget.getBoundingClientRect()); setOpen(i); }}
// render:
<AnimatePresence>
  {open !== null && (
    <Lightbox key="lb" photos={plates.map(p => ({ src: p.src, title: p.title, sub: p.sub }))} index={open} origin={origin} onClose={close} onPrev={prev} onNext={next} />
  )}
</AnimatePresence>
```

Polaroid press feedback in CSS: add `.j-polaroid:active { transform: rotate(var(--r, 0deg)) scale(0.985); transition-duration: 0.08s; }` before the hover rule so hover still wins after release.

- [ ] **Step 3: Lightbox CSS**

Replace the `.j-lb` … `.j-lb__close` block:

```css
.j-lb { position: fixed; inset: 0; z-index: 60; background: rgba(23, 17, 12, 0.94); color: var(--paper); display: grid; grid-template-rows: 1fr auto; padding: 3.5rem 1rem 1.25rem; }
.j-lb__img { min-height: 0; display: grid; place-items: center; overflow: hidden; }
.j-lb__card { max-width: min(90vw, 1100px); max-height: 100%; cursor: grab; touch-action: none; will-change: transform; }
.j-lb__card:active { cursor: grabbing; }
.j-lb__card img { max-width: 100%; max-height: calc(100vh - 9rem); object-fit: contain; border: 8px solid var(--cream); border-bottom-width: 2.2rem; box-shadow: 0 30px 60px rgba(0, 0, 0, 0.6); user-select: none; -webkit-user-drag: none; }
.j-lb__bar { display: flex; justify-content: space-between; align-items: flex-end; gap: 1rem; margin-top: 1rem; }
.j-lb__cap { font-family: var(--font-hand); font-size: 1.5rem; }
.j-lb__cap small { display: block; font-family: var(--font-text); font-style: italic; font-size: 0.9rem; color: var(--paper-2); }
.j-lb__count { font-size: 0.9rem; color: var(--paper-2); font-variant-numeric: tabular-nums; }
.j-arrowbtn { width: 2.5rem; height: 2.5rem; border: 1px solid currentColor; border-radius: 3px; display: inline-flex; align-items: center; justify-content: center; opacity: 0.8; }
.j-arrowbtn:hover { opacity: 1; }
.j-arrowbtn:active { transform: scale(0.94); }
.j-lb__close { position: absolute; top: 0.75rem; right: 1rem; width: 2.5rem; height: 2.5rem; border: 1px solid var(--paper-2); border-radius: 3px; color: var(--paper); }
```

- [ ] **Step 4: Verify and commit**

Run: `npm run lint && npm run build`
Expected: passes. In a browser: click a polaroid, the photo grows out of it; drag it around (1:1); flick left, the next photo comes in from the right and the old one leaves left; flick down, it drops back and the dimmer fades; Escape, arrows and the buttons still work.

```bash
git add src/components/frontier/Lightbox.tsx src/components/frontier/Postcards.tsx src/app/frontier.css
git commit -m "Album: the lightbox opens from the print and can be thrown

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 7: Duel polish

**Files:**
- Modify: `src/components/frontier/QuickDraw.tsx`
- Modify: `src/app/frontier.css` (`.j-arena*`)

- [ ] **Step 1: Heat shimmer, cartridge ticks, spring kick**

In `QuickDraw.tsx` add imports `import { motion, useAnimation, useReducedMotion } from 'framer-motion';`. Inside the component:

```tsx
const reduce = useReducedMotion();
const kick = useAnimation();
useEffect(() => {
  if (lastIsHit && !reduce) kick.start({ x: [0, -6, 5, -3, 0], y: [0, 3, -2, 1, 0], transition: { type: 'spring', bounce: 0.35, duration: 0.45 } });
// fire once per hit
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [lastIsHit, shots.length]);
```

Change the arena `<div className={arenaCls} …>` to `<motion.div className={arenaCls} animate={kick} …>` (same handlers). Remove `is-hit` from the `j-shake` CSS animation (delete `.j-arena.is-result.is-hit { animation: j-shake … }` and `@keyframes j-shake`).

Inside the SVG, after the three ground paths, add the shimmer:

```tsx
<g className="j-arena__heat" aria-hidden="true">
  <ellipse cx="400" cy="335" rx="420" ry="12" fill="#e6c979" fillOpacity="0.08" />
  <ellipse cx="400" cy="338" rx="380" ry="8" fill="#ffffff" fillOpacity="0.05" />
</g>
```

Cartridges: replace the `j-stubs` block content so each finished round shows a brass case:

```tsx
<div key={i} className={`j-stub${live ? ' is-live' : ''}${s === null ? ' is-foul' : ''}`} style={{ '--r': `${TILT[i]}deg` } as CSSProperties}>
  <div className="j-stub__k">Umferð {NUMERAL[i]}</div>
  <div className="j-stub__v">{typeof s === 'number' ? `${s} ms` : s === null ? 'Fallið' : live ? '…' : '·'}</div>
  {typeof s === 'number' && <span className="j-case" aria-hidden="true" />}
</div>
```

- [ ] **Step 2: CSS**

```css
.j-arena__heat { animation: j-heat 2.6s ease-in-out infinite alternate; transform-box: fill-box; transform-origin: center; }
@keyframes j-heat { from { transform: scaleX(0.98) translateY(0); opacity: 0.8; } to { transform: scaleX(1.02) translateY(-2px); opacity: 1; } }
.j-case { position: absolute; right: 0.35rem; bottom: 0.35rem; width: 7px; height: 16px; border-radius: 2px 2px 1px 1px; background: linear-gradient(90deg, #8a6a28, #e2c06a 45%, #9a7a30); box-shadow: 0 1px 1px rgba(0, 0, 0, 0.4); transform: rotate(22deg); animation: j-eject 0.5s cubic-bezier(0.2, 0.8, 0.2, 1); }
@keyframes j-eject { 0% { transform: translate(-18px, -26px) rotate(-80deg); opacity: 0; } 100% { transform: rotate(22deg); opacity: 1; } }
.j-stub { overflow: visible; }
```

- [ ] **Step 3: Verify and commit**

Run: `npm run lint && npm run build`
Expected: passes; a hit kicks the arena with a spring; a brass case appears on the round stub; the horizon shimmers.

```bash
git add src/components/frontier/QuickDraw.tsx src/app/frontier.css
git commit -m "Duel: heat shimmer, spent cases, spring kick

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 8: Tallies: torn posters and a board that re-sorts

**Files:**
- Modify: `src/components/frontier/Tallies.tsx`
- Modify: `src/app/frontier.css` (`.j-poster*`, `.j-ledger__row`)

- [ ] **Step 1: Layout animation on rank changes**

In `Tallies.tsx`: `import { LayoutGroup, motion } from 'framer-motion';` and `import { SPRING } from './motion';`. Wrap the posters and ledger in `<LayoutGroup>`. Each poster becomes

```tsx
<motion.div key={r.name} layout layoutId={`rank-${r.name}`} transition={SPRING} className="j-poster__slot">
  <Link href={`/crew/${r.name}`} className="j-poster" style={{ '--r': `${TILT[i]}deg` } as CSSProperties}>
    <span className="j-nail" aria-hidden="true" />
    <div className="j-poster__wanted">Eftirlýst</div>
    <div className="j-poster__place">{PLACE[i]} · {meta.label}</div>
    <div className="j-poster__img"><PlayerHead name={r.name} size={128} /></div>
    <div className="j-poster__name">{r.name}</div>
    <div className="j-poster__reward">Verðlaun</div>
    <div className="j-poster__val">{meta.unit(r.val)}</div>
  </Link>
</motion.div>
```

and each ledger row `<motion.div key={r.name} layout layoutId={`rank-${r.name}`} transition={SPRING}><Link className="j-ledger__row" …>…</Link></motion.div>`. Remove the `<Pin />` from the poster (the nail replaces it).

- [ ] **Step 2: CSS**

```css
.j-poster__slot { min-width: 0; }
.j-poster {
  position: relative; display: block; text-decoration: none; color: var(--ink); text-align: center;
  padding: 2rem 1rem 1.6rem;
  background: var(--paper);
  background-image: radial-gradient(120% 90% at 50% 50%, transparent 55%, rgba(110, 70, 25, 0.16) 100%);
  filter: drop-shadow(0 10px 14px rgba(0, 0, 0, 0.4));
  clip-path: polygon(0 0, 100% 0, 100% calc(100% - 9px), 96% 100%, 91% calc(100% - 7px), 85% 100%, 79% calc(100% - 5px), 72% 100%, 66% calc(100% - 8px), 59% 100%, 52% calc(100% - 4px), 45% 100%, 38% calc(100% - 7px), 31% 100%, 24% calc(100% - 5px), 17% 100%, 10% calc(100% - 8px), 4% 100%, 0 calc(100% - 6px));
  transform: rotate(var(--r, 0deg));
  transition: transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1);
}
.j-poster:hover { transform: rotate(0deg) translateY(-4px); }
.j-poster:active { transform: rotate(0deg) translateY(-1px) scale(0.99); }
.j-nail { position: absolute; top: 0.6rem; left: 50%; width: 10px; height: 10px; margin-left: -5px; border-radius: 50%; background: radial-gradient(circle at 35% 30%, #d9d3c4, #6a6258 60%, #2b2620); box-shadow: 0 1px 2px rgba(0, 0, 0, 0.6); }
.j-nail::after { content: ''; position: absolute; left: 4px; top: 9px; width: 2px; height: 10px; background: linear-gradient(180deg, rgba(0, 0, 0, 0.35), transparent); }
```

Delete the old `.j-poster .j-pin` rule and change `.j-poster` `box-shadow` (now `filter: drop-shadow`, because `clip-path` clips `box-shadow`).

- [ ] **Step 3: Verify and commit**

Run: `npm run lint && npm run build && node scripts/shots.mjs shots /`
Expected: posters have torn bottoms and a nail; switching tabs makes names slide between posters and ledger lines.

```bash
git add src/components/frontier/Tallies.tsx src/app/frontier.css
git commit -m "Tallies: torn posters, nails, the board re-sorts

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 9: Provisions receipt and mounting Ride in

**Files:**
- Modify: `src/components/frontier/FrontierHome.tsx`
- Modify: `src/components/frontier/RideIn.tsx`
- Modify: `src/app/frontier.css` (`.j-receipt`, `.j-plate`)

- [ ] **Step 1: Mount `RideIn`**

In `FrontierHome.tsx`: `import RideIn from './RideIn';` and render `<RideIn />` after `<Provisions />`. Add `{ label: 'Komdu inn', href: '#ride', id: 'ride' }` to neither nav list (the footer already links the sections; the plate is the last stop, not a destination).

- [ ] **Step 2: Plate responds on press-down**

In `RideIn.tsx` the button gets `onPointerDown={copy}` instead of `onClick={copy}`, plus `onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); copy(); } }}`. CSS `.j-plate:active { transform: translateY(2px); box-shadow: inset 0 1px 0 rgba(255, 240, 200, 0.75), inset 0 -1px 0 rgba(90, 60, 15, 0.6), 0 1px 2px rgba(0, 0, 0, 0.55); }`.

- [ ] **Step 3: Receipt curl and string**

```css
.j-receipt { transform: rotate(1.2deg) perspective(900px) rotateX(2deg); transform-origin: top center; }
.j-receipt__hole { position: absolute; top: 0.6rem; left: 50%; width: 9px; height: 9px; margin-left: -4.5px; border-radius: 50%; background: var(--paper); box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.35); }
.j-receipt__string { position: absolute; left: 50%; top: -2.2rem; width: 2px; height: 2.6rem; margin-left: -1px; background: linear-gradient(180deg, transparent, #8a6d45 30%, #8a6d45); transform: rotate(3deg); transform-origin: bottom; }
```

In `Provisions.tsx` add `<span className="j-receipt__string" aria-hidden="true" /><span className="j-receipt__hole" aria-hidden="true" />` as the first children of `.j-receipt`.

- [ ] **Step 4: Verify and commit**

Run: `npm run lint && node scripts/shots.mjs shots /`
Expected: the saddle-leather brand section appears after the receipt at both widths.

```bash
git add src/components/frontier/FrontierHome.tsx src/components/frontier/RideIn.tsx src/components/frontier/Provisions.tsx src/app/frontier.css
git commit -m "Provisions: receipt on a string; mount the ride-in patch

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 10: Crew roll call as a wall of posters, feed as a tape

**Files:**
- Modify: `src/app/crew/page.tsx`
- Modify: `src/app/frontier.css` (`.j-rollcall`, new `.j-tape-feed`)

- [ ] **Step 1: Posters**

Replace the members grid in `crew/page.tsx`:

```tsx
<div className="j-rollcall">
  {crew.map((m, i) => (
    <Link key={m.username} href={`/crew/${m.username}`} className="j-poster j-poster--crew" style={{ '--r': `${TILT[i % TILT.length]}deg` } as CSSProperties}>
      <span className="j-nail" aria-hidden="true" />
      <div className="j-poster__wanted">Eftirlýst</div>
      <div className="j-poster__img"><PlayerHead name={m.username} size={128} /></div>
      <div className="j-poster__name">{m.username}</div>
      <div className="j-poster__reward">Síðast séð</div>
      <div className="j-poster__note">{m.bio || (m.lastPost ? `skrifaði ${formatAge(m.lastPost)}` : 'ekkert heyrst enn')}</div>
      <div className="j-poster__meta">Færslur: {m.postCount} · Myndir: {m.photoCount}</div>
    </Link>
  ))}
</div>
```

CSS:

```css
.j-rollcall { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 2.25rem 1rem; }
@media (min-width: 640px) { .j-rollcall { grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 2.5rem 1.5rem; } }
.j-poster--crew { padding-top: 1.6rem; }
.j-poster--crew .j-poster__img { width: min(100%, 8rem); }
.j-poster__meta { margin-top: 0.6rem; font-variant: small-caps; letter-spacing: 0.14em; font-weight: 600; font-size: 0.72rem; color: var(--ink-faint); }
.j-poster__note { overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
```

- [ ] **Step 2: The feed is a telegraph tape**

Replace the feed list:

```tsx
<ul className="j-tapefeed">
  {feed.map(post => (
    <li key={post.id} className="j-tapefeed__strip">
      <span className="j-ledger__head" style={{ width: '2.2rem', height: '2.2rem' }}><PlayerHead name={post.username} size={64} /></span>
      <div className="j-tapefeed__body">
        <div className="j-tapefeed__meta"><Link href={`/crew/${post.username}`} className="j-post__who">{post.username}</Link><span>{formatAge(post.createdAt)}</span></div>
        <p className="j-tapefeed__text">{post.text}</p>
      </div>
    </li>
  ))}
</ul>
```

CSS:

```css
.j-tapefeed { list-style: none; max-width: 44rem; margin-inline: auto; display: flex; flex-direction: column; gap: 0.9rem; }
.j-tapefeed__strip { position: relative; display: grid; grid-template-columns: 2.2rem minmax(0, 1fr); gap: 0.9rem; padding: 0.8rem 1rem 0.8rem 0.8rem; background: #f6efdc; box-shadow: 0 4px 10px rgba(43, 29, 18, 0.22); transform: rotate(var(--r, -0.4deg)); }
.j-tapefeed__strip:nth-child(even) { --r: 0.5deg; }
.j-tapefeed__strip::before, .j-tapefeed__strip::after { content: ''; position: absolute; top: 0; bottom: 0; width: 10px; background: linear-gradient(-45deg, transparent 75%, #f6efdc 0) 0 0 / 10px 10px, linear-gradient(45deg, transparent 75%, #f6efdc 0) 0 0 / 10px 10px; }
.j-tapefeed__strip::before { left: -10px; } .j-tapefeed__strip::after { right: -10px; transform: scaleX(-1); }
.j-tapefeed__meta { display: flex; flex-wrap: wrap; align-items: baseline; gap: 0.6rem; font-family: var(--font-hand); font-size: 1.1rem; color: var(--ink-faint); }
.j-tapefeed__text { margin-top: 0.25rem; font-family: var(--font-mono); font-size: 0.86rem; line-height: 1.55; text-transform: uppercase; letter-spacing: 0.04em; white-space: pre-wrap; overflow-wrap: anywhere; }
```

- [ ] **Step 3: Verify and commit**

Run: `npm run lint && node scripts/shots.mjs shots /crew`
Expected: eight wanted posters in a 4-column wall at 1440 and 2 columns at 400; no overflow.

```bash
git add src/app/crew/page.tsx src/app/frontier.css
git commit -m "Crew: wall of wanted posters, telegraph tape feed

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 11: Crew profile as the poster proper

**Files:**
- Modify: `src/app/crew/[username]/page.tsx`
- Modify: `src/app/frontier.css` (`.j-profile*`, `.j-post`)

- [ ] **Step 1: The profile card**

In `crew/[username]/page.tsx` replace `<section className="j-profile">` … up to the stats block opening with:

```tsx
<section className="j-profile">
  <span className="j-nail" aria-hidden="true" />
  <div className="j-profile__head"><PlayerHead name={profile.username} size={128} /></div>
  <div>
    <div className="j-profile__top">
      <div>
        <div className="j-profile__wanted">Eftirlýst · JOÐ-félagi</div>
        <h1 className="j-profile__name">{profile.username}</h1>
        {playerStats && <div className="j-profile__bounty"><span className="j-poster__reward">Verðlaun</span> <span className="j-poster__val">{STAT_TABS[0].unit(playerStats.playTimeHours)}</span></div>}
      </div>
      {isOwner ? (
        <button className="j-btn j-btn--ghost j-btn--small" onClick={logout}>Skrá út</button>
      ) : (
        <button className="j-btn j-btn--ghost j-btn--small" onClick={() => setShowLogin(true)}>Þetta er ég</button>
      )}
    </div>
    {/* …bio row unchanged… */}
```

Remove the `<Pin />` import use here if no longer referenced (keep the import only if used elsewhere in the file; `Pin` is no longer used, so drop it from the import line).

Posts become ledger lines: change `<ul className="j-feed" style={{ maxWidth: 'none' }}>` to `<ul className="j-ledgerfeed">` and each `<li className="j-post j-post--plain">` to `<li className="j-ledgerfeed__row">` (the inner markup stays).

Photos: pass `origin` to the lightbox like Postcards. Add `const [origin, setOrigin] = useState<DOMRect | null>(null);`, on each polaroid `onClick={e => { setOrigin(e.currentTarget.getBoundingClientRect()); setLightboxIdx(idx); }}`, and wrap the `<Lightbox …/>` in `<AnimatePresence>` (import from `framer-motion`), passing `origin={origin}`.

- [ ] **Step 2: CSS**

```css
.j-profile {
  position: relative; display: grid; grid-template-columns: minmax(0, 1fr); gap: 1.5rem; max-width: 52rem; margin: 2rem auto 0;
  padding: clamp(1.75rem, 4vw, 2.75rem) clamp(1.5rem, 4vw, 2.5rem) clamp(1.75rem, 4vw, 2.5rem);
  background: var(--paper);
  background-image: radial-gradient(120% 90% at 50% 50%, transparent 55%, rgba(110, 70, 25, 0.16) 100%);
  filter: drop-shadow(0 14px 22px rgba(0, 0, 0, 0.4));
  clip-path: polygon(0 0, 100% 0, 100% calc(100% - 10px), 95% 100%, 89% calc(100% - 7px), 82% 100%, 75% calc(100% - 5px), 68% 100%, 61% calc(100% - 9px), 54% 100%, 47% calc(100% - 4px), 40% 100%, 33% calc(100% - 8px), 26% 100%, 19% calc(100% - 5px), 12% 100%, 6% calc(100% - 9px), 0 100%);
  transform: rotate(-0.6deg);
}
@media (min-width: 720px) { .j-profile { grid-template-columns: 8.5rem minmax(0, 1fr); gap: 2.5rem; } }
.j-profile .j-nail { top: 0.7rem; }
.j-profile__bounty { margin-top: 0.5rem; display: flex; align-items: baseline; gap: 0.6rem; }
.j-ledgerfeed { list-style: none; max-width: 44rem; margin-inline: auto; padding: 0.5rem 1.25rem 0.5rem 2.6rem; background: linear-gradient(90deg, transparent 1.9rem, rgba(155, 59, 42, 0.45) 1.9rem, rgba(155, 59, 42, 0.45) calc(1.9rem + 1px), transparent calc(1.9rem + 1px)), var(--cream); box-shadow: 0 8px 18px rgba(43, 29, 18, 0.25); transform: rotate(0.4deg); }
.j-ledgerfeed__row { padding: 0.9rem 0; border-bottom: 1px solid rgba(90, 110, 140, 0.35); }
.j-ledgerfeed__row:last-child { border-bottom: 0; }
```

Delete the old `.j-profile .j-pin` rule.

- [ ] **Step 3: Verify and commit**

Run: `npm run lint && npm run build && node scripts/shots.mjs shots /crew/stebbias`
Expected: the profile is a torn-edge poster with a nail and a "Verðlaun" line; posts (if any) sit on ledger paper; no overflow at 400.

```bash
git add "src/app/crew/[username]/page.tsx" src/app/frontier.css
git commit -m "Crew profile: the poster proper, ledger posts, shared lightbox

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 12: Reduced motion audit, full verification, PR

**Files:**
- Modify: `src/app/globals.css` (reduced-motion block)
- Modify: `README.md` (one paragraph under "Vefurinn")

- [ ] **Step 1: Reduced motion means cross-fades, not frozen springs**

Replace the `@media (prefers-reduced-motion: reduce)` block in `globals.css`:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; }
  .j-lantern, .j-motes, .j-peg__glow, .j-arena__heat { display: none !important; }
  .j-pan__img { transform: none !important; }
  .j-print, .j-polaroid, .j-poster, .j-tag, .j-peg__swing { transition: opacity 0.2s ease !important; }
}
```

- [ ] **Step 2: Emulate reduced motion and check**

Add to `scripts/shots.mjs`, before the `SIZES` loop, an optional flag: if `process.env.REDUCE === '1'`, call `await page.emulateMedia({ reducedMotion: 'reduce' })` right after `newPage()`. Run `REDUCE=1 node scripts/shots.mjs shots-reduce / /crew` and confirm the pages render fully (no blank areas from unmounted `Atmosphere`, hero visible, posters visible).

- [ ] **Step 3: Full check**

Run: `npm run lint && npm run build && node scripts/shots.mjs shots / /crew /crew/stebbias`
Expected: all green, no `overflow:` lines at 400 px on any page. Open `shots/*.png` and compare against `shots-before/*.png` section by section.

- [ ] **Step 4: README**

Under "Vefurinn", after the first paragraph, add:

> Blaðið liggur á dökku leðri með rifnum brúnum. Ljós frá lukt fylgir bendlinum hægt og ryk svífur í loftinu; hvort tveggja slokknar ef stýrikerfið biður um minni hreyfingu. Kortið má draga, stækka og láta fljúga að pinna. Í myndaalbúminu opnast myndin út úr rammanum sem smellt var á og henni má fleygja til hliðar eða sleppa niður til að loka.

- [ ] **Step 5: Commit and open the PR**

```bash
git add src/app/globals.css scripts/shots.mjs README.md
git commit -m "Reduced motion: cross-fades; README on the new journal

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push -u origin feat/journal-redesign
gh pr create --title "Push the trail journal further" --body "$(cat <<'EOF'
The sheet now lies on a leather desk with deckled edges, lantern light and dust. The hero is a panorama print with a wood-type mark and a fixed signpost. The nav bar is translucent; the phone menu is a drawer you can drag shut. Pegs swing on springs, the map pans, zooms and springs to a pin, the lightbox opens from the print you clicked and can be thrown. Posters are torn and nailed and the board re-sorts. The ride-in patch is finally mounted. Crew pages get the poster treatment. Reduced motion falls back to cross-fades.

Spec: docs/superpowers/specs/2026-09-15-journal-redesign-design.md
Plan: docs/superpowers/plans/2026-09-15-journal-redesign.md

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Self-review

- **Spec coverage:** §1 → Task 1; §2 → Task 2; §3 → Task 3; §4 → Task 4; §5 → Task 5; §6 → Task 6; §7 → Task 7; §8 → Task 8; §9 → Task 9; §10 → Tasks 10–11; §11 (tracking, overflow, reduced motion, focus) → Tasks 1 and 12. Files list in the spec matches: `motion.ts` and `Atmosphere.tsx` are created in Tasks 0 and 1.
- **Placeholders:** none; every code step is complete.
- **Type consistency:** `Signpost` gains `fixed?: boolean` (Task 2) and is rendered with it in `FrontierHome` (Task 2). `Lightbox` gains `origin?: DOMRect | null` (Task 6) and both callers (Tasks 6, 11) pass it. `Hero` drops `activeId` (Task 2) and `FrontierHome` is updated in the same task. `project` and `rubberband` signatures in Task 0 match their uses in Tasks 3, 5 and 6. `.j-nail` is defined in Task 8 and reused in Tasks 10 and 11, which run after it.

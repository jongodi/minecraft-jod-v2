// Scroll-performance probe against a running server.
// Usage: node scripts/perf.mjs [label] [path]
// Env: BASE (default http://localhost:3000), CHROME (executable), CPU (throttle rate, default 4)
//
// Reports, per viewport: bytes and count of images fetched, the worst and the
// mean frame interval during a scripted scroll from top to bottom, how many
// frames ran long, and the time spent in style, layout and paint.
import { chromium } from 'playwright-core';

const BASE  = process.env.BASE ?? 'http://localhost:3000';
const CPU   = Number(process.env.CPU ?? 4);
const [label = 'run', path = '/'] = process.argv.slice(2);

const SIZES = [
  { name: 'desktop', width: 1440, height: 900, touch: false, cpu: 1 },
  { name: 'mobile',  width:  390, height: 844, touch: true,  cpu: CPU },
];

/* One scripted scroll to the bottom, sampling the gap between animation frames. */
const scrollProbe = () => new Promise(resolve => {
  const gaps = [];
  const step = Math.max(8, Math.round(window.innerHeight / 22));
  let last = performance.now();
  const tick = () => {
    const now = performance.now();
    gaps.push(now - last);
    last = now;
    if (window.scrollY + window.innerHeight >= document.body.scrollHeight - 2) {
      gaps.shift();                                   // the first gap includes the scheduling delay
      const sorted = [...gaps].sort((a, b) => a - b);
      resolve({
        frames: gaps.length,
        mean:   gaps.reduce((a, b) => a + b, 0) / gaps.length,
        p95:    sorted[Math.floor(sorted.length * 0.95)] ?? 0,
        worst:  sorted[sorted.length - 1] ?? 0,
        long:   gaps.filter(g => g > 32).length,       // over two frames at 60Hz
      });
      return;
    }
    window.scrollBy(0, step);
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
});

/* Sweep a pointer across the page and sample frame gaps the same way. */
const pointerProbe = () => new Promise(resolve => {
  const gaps = [];
  let last = performance.now(), i = 0;
  const tick = () => {
    const now = performance.now();
    gaps.push(now - last);
    last = now;
    if (i++ > 90) {
      gaps.shift();
      const sorted = [...gaps].sort((a, b) => a - b);
      resolve({ mean: gaps.reduce((a, b) => a + b, 0) / gaps.length, p95: sorted[Math.floor(sorted.length * 0.95)] ?? 0, worst: sorted[sorted.length - 1] ?? 0 });
      return;
    }
    window.dispatchEvent(new PointerEvent('pointermove', {
      pointerType: 'mouse', clientX: (i * 17) % window.innerWidth, clientY: (i * 11) % window.innerHeight, bubbles: true,
    }));
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
});

const ms = n => `${n.toFixed(1)}ms`;
const kb = n => `${(n / 1024).toFixed(0)}KB`;

const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
console.log(`\n=== ${label} — ${BASE}${path} ===`);

for (const size of SIZES) {
  const ctx = await browser.newContext({ viewport: { width: size.width, height: size.height }, deviceScaleFactor: 2, hasTouch: size.touch });
  const page = await ctx.newPage();

  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: size.cpu });

  await page.goto(BASE + path, { waitUntil: 'load' });
  await page.waitForTimeout(2500);                 // effects mount, lazy images settle

  const decoded = await page.evaluate(() => {
    /* naturalWidth is density-corrected once an image comes from a srcset, so
       it reports the CSS size, not the bitmap. The real decoded width is the
       candidate that was chosen: read it back off currentSrc where it is a
       width the optimiser was asked for. */
    const chosenWidth = img => {
      const m = (img.currentSrc || '').match(/[?&]w=(\d+)/);
      return m ? Number(m[1]) : img.naturalWidth;
    };
    let px = 0, over = 0;
    for (const img of document.images) {
      if (!img.naturalWidth) continue;
      const w = chosenWidth(img);
      const h = Math.round(w * (img.naturalHeight / img.naturalWidth));
      px += w * h;
      const shown = Math.max(img.clientWidth, 1) * window.devicePixelRatio;
      if (w > shown * 1.6) over++;
    }
    /* transferSize is what actually crossed the wire, including headers */
    const bytes = { image: 0, script: 0, css: 0, font: 0 };
    let fetched = 0;
    const extOf = url => (url.split('?')[0].split('#')[0].match(/\.([a-z0-9]+)$/i) || [, ''])[1].toLowerCase();
    const IMG = ['png', 'jpg', 'jpeg', 'webp', 'avif', 'gif', 'svg'];
    const FONT = ['woff', 'woff2', 'ttf', 'otf'];
    for (const r of performance.getEntriesByType('resource')) {
      const ext = extOf(r.name);
      const kind = IMG.includes(ext) || r.initiatorType === 'img' ? 'image'
                 : FONT.includes(ext) ? 'font'
                 : ext === 'css' ? 'css'
                 : ext === 'js' || r.initiatorType === 'script' ? 'script' : null;
      if (!kind) continue;
      bytes[kind] += r.transferSize || r.encodedBodySize || 0;
      if (kind === 'image') fetched++;
    }
    return { megapixels: px / 1e6, oversized: over, images: document.images.length, bytes, fetched };
  });

  await cdp.send('Performance.enable');
  const before = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(m => [m.name, m.value]));
  const scroll = await page.evaluate(scrollProbe);
  const after  = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(m => [m.name, m.value]));

  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
  const pointer = size.touch ? null : await page.evaluate(pointerProbe);

  const cost = k => ((after[k] ?? 0) - (before[k] ?? 0)) * 1000;
  console.log(
    `\n[${size.name}] ${size.width}x${size.height} dpr2 cpu/${size.cpu}\n` +
    `  images     ${decoded.images} on page, ${decoded.fetched} fetched, ${kb(decoded.bytes.image)}, ${decoded.megapixels.toFixed(1)}MP decoded, ${decoded.oversized} oversized\n` +
    `  js/css     ${kb(decoded.bytes.script)} js, ${kb(decoded.bytes.css)} css, ${kb(decoded.bytes.font)} fonts\n` +
    `  scroll     mean ${ms(scroll.mean)}  p95 ${ms(scroll.p95)}  worst ${ms(scroll.worst)}  long ${scroll.long}/${scroll.frames}\n` +
    `  recalc     style ${ms(cost('RecalcStyleDuration'))}  layout ${ms(cost('LayoutDuration'))}  script ${ms(cost('ScriptDuration'))}` +
    (pointer ? `\n  pointer    mean ${ms(pointer.mean)}  p95 ${ms(pointer.p95)}  worst ${ms(pointer.worst)}` : '')
  );

  await ctx.close();
}
await browser.close();

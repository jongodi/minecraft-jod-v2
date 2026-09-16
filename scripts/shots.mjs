// Screenshots, an overflow check and console errors against the running dev server.
// Usage: node scripts/shots.mjs <outDir> [path ...]
// Example: node scripts/shots.mjs shots / /crew /crew/stebbias
// Env: BASE (default http://localhost:3000), CHROME (executable), REDUCE=1 (reduced motion),
//      SECTIONS=1 (one shot per section), WIDTHS=360,768 (viewport widths; default 1440,390)
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const BASE = process.env.BASE ?? 'http://localhost:3000';
const [outDir = 'shots', ...paths] = process.argv.slice(2);
const pages = paths.length ? paths : ['/'];
const SIZES = (process.env.WIDTHS ?? '1440,390').split(',').map(w => [Number(w), Number(w) < 800 ? 844 : 900]);
const SECTION_IDS = ['top', 'camp', 'territory', 'postcards', 'showdown', 'tallies', 'provisions', 'ride', 'campfire'];

mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
for (const [w, h] of SIZES) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: w < 800 });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`${m.type()}: ${m.text()}`); });
  page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
  if (process.env.REDUCE === '1') await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const p of pages) {
    await page.goto(BASE + p, { waitUntil: 'load' });
    await page.waitForTimeout(2000);
    const base = (p === '/' ? 'home' : p.replace(/^\//, '').replace(/\//g, '_')) + `-${w}`;
    await page.screenshot({ path: join(outDir, `${base}.png`), fullPage: true });
    if (process.env.SECTIONS === '1' && p === '/') {
      for (const id of SECTION_IDS) {
        const ok = await page.evaluate(id => { const el = document.getElementById(id); if (!el) return false; el.scrollIntoView({ block: 'start', behavior: 'instant' }); return true; }, id);
        if (!ok) continue;
        await page.waitForTimeout(700);
        await page.screenshot({ path: join(outDir, `${base}-${id}.png`) });
      }
    }
    const over = await page.evaluate(() => {
      const vw = document.documentElement.clientWidth;
      const wide = [];
      for (const el of document.querySelectorAll('body *')) {
        const r = el.getBoundingClientRect();
        if (r.right > vw + 1 && r.width > 0) wide.push(`${el.tagName.toLowerCase()}.${[...el.classList].join('.')} right=${Math.round(r.right)}`);
      }
      return { scrollWidth: document.documentElement.scrollWidth, vw, wide: wide.slice(0, 12) };
    });
    console.log(`${base}: scrollWidth=${over.scrollWidth} vw=${over.vw}${over.wide.length ? '\n  overflow: ' + over.wide.join('\n  overflow: ') : ''}`);
  }
  if (errors.length) console.log(`  console (${w}px):\n  ` + errors.slice(0, 10).join('\n  '));
  await ctx.close();
}
await browser.close();

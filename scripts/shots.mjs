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
  if (process.env.REDUCE === '1') {
    await page.emulateMedia({ reducedMotion: 'reduce' });
  }
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

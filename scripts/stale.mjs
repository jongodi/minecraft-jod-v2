// A kept page read later: the page is drawn by the server now and read by a
// browser whose clock says it is two days on, which is what a page kept by
// the CDN looks like to the first visitor after a quiet stretch.
// Fails if React throws the page away on hydration (error #418), and prints
// the lines that are told from the clock, to be read by eye: they should be
// the browser's ("í kvöld", not the weekday the server wrote).
// Usage: node scripts/stale.mjs [path ...]      (default: / /crew /taflan)
// Env: BASE (default http://localhost:3000), CHROME (executable), AHEAD_H (hours ahead, default 48)
import { chromium } from 'playwright-core';

const BASE = process.env.BASE ?? 'http://localhost:3000';
const ahead = Number(process.env.AHEAD_H ?? 48) * 3600_000;
const paths = process.argv.slice(2).length ? process.argv.slice(2) : ['/', '/crew', '/taflan'];
const LINES = ['.b-nightline', '.b-status__row', '.b-poster__note', '.b-poster__seen', '.t-notice__sub'];

async function launch() {
  if (process.env.CHROME) return chromium.launch({ executablePath: process.env.CHROME });
  for (const channel of ['chrome', 'msedge', 'chromium']) {
    try { return await chromium.launch({ channel }); } catch { /* not installed, try the next */ }
  }
  return chromium.launch();
}

const browser = await launch();
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const thrown = [];
page.on('pageerror', e => thrown.push(e.message));
page.on('console', m => { if (m.type() === 'error' && /#418|#423|#425|hydrat/i.test(m.text())) thrown.push(m.text()); });
await page.clock.install({ time: new Date(Date.now() + ahead) });
let failed = false;
for (const path of paths) {
  thrown.length = 0;
  await page.goto(BASE + path, { waitUntil: 'load' });
  await page.clock.runFor(3000);
  await page.waitForTimeout(1500);
  console.log(path);
  for (const sel of LINES) {
    const text = await page.locator(sel).first().innerText({ timeout: 500 }).catch(() => null);
    if (text) console.log(`  ${sel}: ${text.replace(/\s+/g, ' ')}`);
  }
  if (thrown.length) { failed = true; console.log('  HYDRATION: ' + thrown.map(t => t.slice(0, 140)).join('\n  HYDRATION: ')); }
}
await browser.close();
if (failed) process.exit(1);

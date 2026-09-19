// The still the world opens as: one screenshot of the 3D map at its start view,
// taken against the running dev server and written to public/map-poster.webp.
// Usage: npm run map:poster   (with `npm run dev` running)
// Env: BASE (default http://localhost:3000), CHROME (executable path)
import { chromium } from 'playwright-core';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const sharp = require('sharp');

const BASE = process.env.BASE ?? 'http://localhost:3000';
const src = readFileSync('src/components/badlands/data.ts', 'utf8');
const view = src.match(/MAP_START_VIEW = '([^']+)'/)?.[1];
if (!view) { console.error('MAP_START_VIEW not found in data.ts'); process.exit(1); }

const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const page = await (await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 })).newPage();
await page.goto(`${BASE}/bluemap/index.html#${view}`, { waitUntil: 'load' });
/* the viewer's own controls are not part of the picture */
await page.addStyleTag({ content: '#zoom-buttons, .control-bar, .svg-button, .loading-screen { display: none !important; }' });
/* let the tiles arrive: the hires area around the start view, then the lowres ring */
await page.waitForTimeout(12000);
const png = await page.screenshot({ type: 'png' });
await browser.close();

await sharp(png).webp({ quality: 74 }).toFile('public/map-poster.webp');
console.log('public/map-poster.webp skrifað, 1920×1080');

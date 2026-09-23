// The still the world opens as: one screenshot of the 3D map at its start view,
// taken against the running dev server and written to public/map-poster.webp.
// Usage: npm run map:poster   (with `npm run dev` running)
// Env: BASE (default http://localhost:3000), CHROME (executable path),
//      POSTER_HIRES (detailed radius in blocks; default: out to the edges of
//      the rendered world), POSTER_SCALE (render scale before shrinking to
//      1920×1080, default 2)
//
// Visitors' viewers draw full detail only near where they look (the hires
// layer, 150 blocks) and the low-detail layer beyond it. The poster is made
// once, so it draws the whole world in full detail: the hires radius reaches
// the world's edges (window.JOD_MAP.bounds, written by map:brand) and the
// shot waits until every detailed tile has arrived. It is rendered at
// POSTER_SCALE times the size and shrunk, which smooths the edges of blocks.
import { chromium } from 'playwright-core';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const sharp = require('sharp');

const BASE = process.env.BASE ?? 'http://localhost:3000';
const HIRES = Number(process.env.POSTER_HIRES ?? 0);
const SCALE = Number(process.env.POSTER_SCALE ?? 2);
const WIDTH = 1920;
const HEIGHT = 1080;
const src = readFileSync('src/components/badlands/data.ts', 'utf8');
const view = src.match(/MAP_START_VIEW = '([^']+)'/)?.[1];
if (!view) { console.error('MAP_START_VIEW not found in data.ts'); process.exit(1); }

/* playwright-core ships no browser of its own: use the Chrome or Edge already on
   this machine, or the executable named in CHROME. */
async function launch() {
  if (process.env.CHROME) return chromium.launch({ executablePath: process.env.CHROME });
  for (const channel of ['chrome', 'msedge', 'chromium']) {
    try { return await chromium.launch({ channel }); } catch { /* not installed, try the next */ }
  }
  try { return await chromium.launch(); } catch {
    console.error('Fann engan vafra. Settu upp Chrome eða Edge, eða bentu á vafra með CHROME=<slóð>.');
    process.exit(1);
  }
}
try { await fetch(`${BASE}/bluemap/settings.json`); } catch {
  console.error(`Enginn vefþjónn á ${BASE}. Keyrðu \`npm run dev\` í öðrum glugga fyrst.`);
  process.exit(1);
}
const browser = await launch();
const page = await (await browser.newContext({ viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: SCALE })).newPage();
await page.goto(`${BASE}/bluemap/index.html#${view}`, { waitUntil: 'load' });
/* The picture is the terrain alone, at night like the live map opens: none of
   the viewer's controls, JOÐ's plank, the places' lanterns or the dusk at the
   edges (the page draws its own shade over the still). */
await page.addStyleTag({ content: '#zoom-buttons, .control-bar, .svg-button, .loading-screen, #jod-plank, .jod-place { display: none !important; } #map-container::after { display: none !important; }' });

console.log('Bíð eftir kortinu…');
await page.waitForFunction(() => window.bluemap?.mapViewer?.map && window.bluemap.mapViewer.data.mapState === 'loaded', null, { timeout: 120_000 });

/* Full detail out to the world's edges, the way the viewer's own slider sets
   it. BlueMap loads a square around the view's centre, so the radius is the
   farthest edge from it; BlueMap's tile map reaches 1,600 blocks. */
const hires = await page.evaluate((fixed) => {
  if (fixed > 0) return fixed;
  const b = window.JOD_MAP?.bounds;
  const c = window.bluemap.mapViewer.data.loadedCenter;
  if (!b || !c) return 500;
  const far = Math.max(Math.abs(b.minX - c.x), Math.abs(b.maxX - c.x), Math.abs(b.minZ - c.y), Math.abs(b.maxZ - c.y));
  return Math.min(1500, Math.ceil(far) + 32);
}, HIRES);

/* then wait until the hires layer is complete: nothing loading and the count
   of drawn tiles steady for two seconds (three minutes at most) */
console.log(`Teikna allan heiminn í fullri upplausn (${hires} blokkir frá miðju)…`);
const drawn = await page.evaluate(async (hires) => {
  const viewer = window.bluemap.mapViewer;
  viewer.data.loadedHiresViewDistance = hires;
  viewer.updateLoadedMapArea();
  const manager = () => viewer.map.hiresTileManager;
  const count = () => {
    let k = 0;
    manager().tiles.forEach((t) => { if (t.model && !t.unloaded) k++; });
    return k;
  };
  const started = Date.now();
  let last = -1;
  let steadySince = Date.now();
  while (Date.now() - started < 180_000) {
    await new Promise((r) => setTimeout(r, 500));
    const k = count();
    if (k !== last || manager().currentlyLoading > 0) { last = k; steadySince = Date.now(); }
    else if (Date.now() - steadySince > 2000) break;
  }
  /* a few frames, so what arrived last is on screen */
  viewer.redraw();
  for (let i = 0; i < 3; i++) await new Promise((r) => requestAnimationFrame(r));
  return count();
}, hires);
console.log(`${drawn} reitir í fullri upplausn.`);
await page.waitForTimeout(1000);

const png = await page.screenshot({ type: 'png' });
await browser.close();

await sharp(png).resize(WIDTH, HEIGHT, { kernel: 'lanczos3' }).webp({ quality: 74 }).toFile('public/map-poster.webp');
console.log(`public/map-poster.webp skrifað, ${WIDTH}×${HEIGHT}`);

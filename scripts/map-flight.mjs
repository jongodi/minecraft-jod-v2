// The flight down into the world: a run of stills of the 3D map, from high
// over the whole rendered world down to the start view the still and the live
// map open on. The home page plays it as the world scrolls into view and pins
// the places on whatever is showing, so each still keeps the camera it was
// taken with: the matrix that puts a block on the screen, where the camera
// stood, the point it looked at and how far off it was. The page zooms each
// still towards the next by those, so the camera moves between frames instead
// of one frame fading into another.
// Usage: npm run map:flight   (with `npm run dev` running; the map sync on
//        GitHub runs it after every copy that changed the map, and the Map
//        flight workflow whenever this script changes)
// Env: BASE (default http://localhost:3000), CHROME (executable path),
//      FLIGHT_FRAMES (stills per flight, default 40), FLIGHT_SCALE (render
//      scale before shrinking, default 1.5)
//
// Two flights are taken: a wide one for screens on their side and a tall one
// for phones, each framed to its own shape, so the overview a phone opens on
// is the whole world across its width and not a strip cut out of a wide one.
// The last frame of each is the start view itself, where the still takes over.
//
// BlueMap draws only its blurred low-detail layer from 1,000 blocks out, so
// the overview stays inside that: the tall flight would need to stand further
// back to fit the whole world across a phone, and keeps the detail instead.
//
// The evening goes on as the camera comes down: the land is lit as at dusk
// over the overview and darkens frame by frame to the night the still is
// taken in, where the town's lights come on. The sky is not the stills' own:
// it is painted #FF00FF and cut out (scripts/sky-key.mjs), so the world hangs
// in the page's night, its stars and tonight's moon (Flight.tsx).
import { chromium } from 'playwright-core';
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { keySky } from './sky-key.mjs';

const require = createRequire(import.meta.url);
const sharp = require('sharp');

const BASE = process.env.BASE ?? 'http://localhost:3000';
const FRAMES = Math.max(2, Number(process.env.FLIGHT_FRAMES ?? 40));
const SCALE = Number(process.env.FLIGHT_SCALE ?? 1.5);
const OUT = 'public/map-flight';
const SHAPES = [
  { name: 'wide', width: 1280, height: 720 },
  { name: 'tall', width: 720, height: 1280 },
];
/* The overview: looking down at this angle from the vertical (the start view
   is 1.08, nearer the horizon), turned this far from the start view's heading,
   so the descent swings round a little as it comes down. Steep enough that
   the land fills the first view rather than the sky over it. */
const OVERVIEW_ANGLE = 0.6;
const SWING = -0.35;
/* The still is shown at saturate(0.85) (badlands.css), and the flight lands
   on it: the frames carry the same colour, put in here with the matrix CSS
   uses, so the page draws them as they are and pays no filter on a layer
   that changes every frame. */
const SATURATE = ((k) => [
  [0.213 + 0.787 * k, 0.715 - 0.715 * k, 0.072 - 0.072 * k],
  [0.213 - 0.213 * k, 0.715 + 0.285 * k, 0.072 - 0.072 * k],
  [0.213 - 0.213 * k, 0.715 - 0.715 * k, 0.072 + 0.928 * k],
])(0.85);
/* BlueMap's sunlight over the overview, at dusk; the landing is the night jod.js sets */
const DUSK = 0.62;
/* the farthest the camera stands while BlueMap still draws full detail */
const FARTHEST = 990;

const src = readFileSync('src/components/badlands/data.ts', 'utf8');
const view = src.match(/MAP_START_VIEW = '([^']+)'/)?.[1];
if (!view) { console.error('MAP_START_VIEW not found in data.ts'); process.exit(1); }
/* where the flight lands, read off the view itself (map:x:y:z:distance:rotation:angle:…):
   the viewer only takes it up from the hash a while after its map has loaded */
const [, ex, ey, ez, ed, erot, eang] = view.split(':').map(Number);
const END = { x: ex, y: ey, z: ez, d: ed, rotation: erot, angle: eang };
if (!Object.values(END).every(Number.isFinite)) { console.error(`MAP_START_VIEW not read: ${view}`); process.exit(1); }

/* playwright-core ships no browser of its own: use the Chrome or Edge already on
   this machine, or the executable named in CHROME. A machine without a
   graphics card (GitHub) draws WebGL in software, which Chrome only allows
   when asked. */
const args = process.env.CI ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] : [];
async function launch() {
  if (process.env.CHROME) return chromium.launch({ executablePath: process.env.CHROME, args });
  for (const channel of ['chrome', 'msedge', 'chromium']) {
    try { return await chromium.launch({ channel, args }); } catch { /* not installed, try the next */ }
  }
  try { return await chromium.launch({ args }); } catch {
    console.error('Fann engan vafra. Settu upp Chrome eða Edge, eða bentu á vafra með CHROME=<slóð>.');
    process.exit(1);
  }
}
try { await fetch(`${BASE}/bluemap/settings.json`); } catch {
  console.error(`Enginn vefþjónn á ${BASE}. Keyrðu \`npm run dev\` í öðrum glugga fyrst.`);
  process.exit(1);
}

const browser = await launch();
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
const hash = createHash('sha256');
const flights = {};

for (const shape of SHAPES) {
  const page = await (await browser.newContext({ viewport: { width: shape.width, height: shape.height }, deviceScaleFactor: SCALE })).newPage();
  /* ?upptaka: the viewer never eases its detail off for a slow machine (jod.js) */
  await page.goto(`${BASE}/bluemap/index.html?upptaka#${view}`, { waitUntil: 'load' });
  /* the terrain alone, at night as the map opens: no controls, no plank, no
     markers (the page pins the places itself) and no dusk at the edges */
  await page.addStyleTag({ content: '#zoom-buttons, .control-bar, .svg-button, .loading-screen, #jod-plank, .jod-place, .bm-marker-html { display: none !important; } #map-container::after { display: none !important; }' });
  console.log(`${shape.name}: bíð eftir kortinu…`);
  await page.waitForFunction(() => window.bluemap?.mapViewer?.map && window.bluemap.mapViewer.data.mapState === 'loaded', null, { timeout: 120_000 });

  /* The path, worked out in the viewer with its own camera: from the start
     view back to an overview from as far out as puts the rendered world
     across the frame's width, its near edge running off the foot of the
     frame and the night beyond its far one (or the farthest out that still
     has full detail). The camera is taken off the visitor's controls, which would
     hold it nearer and steer its angle, and the viewer stops drawing by
     itself: in a browser drawing in software one frame of the whole world
     takes many seconds, so each still is drawn once, by hand, below. */
  const plan = await page.evaluate(async ({ end, angle, swing, farthest }) => {
    const viewer = window.bluemap.mapViewer;
    const cm = viewer.controlsManager;
    /* The viewer takes the start view up from the hash a while after its map
       has loaded, and would set it over the flight's first frame: it is
       waited for (ten seconds at most) before the camera is taken over. */
    const waited = Date.now();
    while (Date.now() - waited < 10_000 && !(Math.abs(cm.distance - end.d) < 0.5 && Math.abs(cm.position.x - end.x) < 1 && Math.abs(cm.position.z - end.z) < 1)) {
      await new Promise((r) => setTimeout(r, 100));
    }
    cm.controls = null;
    window.jod?.pause(true);
    /* the night the map opens in (jod.js), which the flight lands in */
    const night = viewer.data.uniforms.sunlightStrength.value;
    const b = window.JOD_MAP?.bounds ?? { minX: end.x - 400, maxX: end.x + 400, minZ: end.z - 400, maxZ: end.z + 400 };
    const start = { x: (b.minX + b.maxX) / 2, y: end.y, z: (b.minZ + b.maxZ) / 2, rotation: end.rotation + swing, angle };
    /* the camera's field of view is upright; across the frame it is wider or narrower with the frame's shape */
    const cam = viewer.camera;
    const across = Math.atan(Math.tan((cam.fov * Math.PI) / 360) * cam.aspect);
    const width = Math.max(b.maxX - b.minX, b.maxZ - b.minZ);
    start.d = Math.min(farthest, Math.max(end.d * 2, width / 2 / Math.tan(across)));
    /* full detail everywhere the flight looks: the square BlueMap loads round
       its centre reaches the farthest edge from either end of the path */
    const far = Math.max(...[start, end].flatMap(p => [Math.abs(b.minX - p.x), Math.abs(b.maxX - p.x), Math.abs(b.minZ - p.z), Math.abs(b.maxZ - p.z)]));
    viewer.data.loadedHiresViewDistance = Math.min(1500, Math.ceil(far) + 32);
    viewer.updateLoadedMapArea();
    return { start, end, night };
  }, { end: END, angle: OVERVIEW_ANGLE, swing: SWING, farthest: FARTHEST });
  console.log(`${shape.name}: frá ${Math.round(plan.start.d)} blokkum niður í ${Math.round(plan.end.d)}`);

  /* The camera on the path, and the means to place it, wait for its tiles
     and ask the ground how high it stands, kept in the page for the survey
     and the frames below. */
  await page.evaluate((plan) => {
    const viewer = window.bluemap.mapViewer;
    const cm = viewer.controlsManager;
    const { start, end } = plan;
    /* Evenly along the path, so neighbouring frames are as alike all the
       way down; the page eases the scroll onto it (the overview holds a
       moment, the landing settles). The distance falls evenly in
       proportion, which reads as an even speed of descent; the camera's
       target crosses to the start view as the distance closes, so the town
       it lands on stays in sight. `lift` turns the camera to look further
       down, which raises it and draws it in, where the ground would be in
       its way. */
    const camAt = (s, lift = 0) => {
      const d = Math.exp(Math.log(start.d) + (Math.log(end.d) - Math.log(start.d)) * s);
      const k = (start.d - d) / (start.d - end.d);
      return {
        look: [start.x + (end.x - start.x) * k, start.y + (end.y - start.y) * k, start.z + (end.z - start.z) * k],
        d,
        rotation: start.rotation + (end.rotation - start.rotation) * s,
        angle: start.angle + (end.angle - start.angle) * s - lift,
      };
    };
    /* where BlueMap puts the camera for a view (ControlsManager.updateCamera) */
    const eyeOf = (c) => {
      const h = Math.sin(c.angle), v = Math.cos(c.angle);
      return [c.look[0] - Math.sin(c.rotation) * h * c.d, c.look[1] + v * c.d, c.look[2] + Math.cos(c.rotation) * h * c.d];
    };
    const place = (c) => {
      cm.position.set(...c.look);
      cm.distance = c.d;
      cm.rotation = c.rotation;
      cm.angle = c.angle;
      cm.updateCamera();
    };
    /* Wait until every tile in view has arrived: nothing loading and the
       count of drawn tiles steady (two seconds when the whole world is
       loading, tile by tile out of the store; a moment after that). */
    const manager = () => viewer.map.hiresTileManager;
    const count = () => { let n = 0; manager().tiles.forEach((tile) => { if (tile.model && !tile.unloaded) n++; }); return n; };
    const settle = async (whole) => {
      const started = Date.now();
      let last = -1;
      let steadySince = Date.now();
      while (Date.now() - started < (whole ? 600_000 : 180_000)) {
        await new Promise((r) => setTimeout(r, whole ? 500 : 120));
        const n = count();
        if (n !== last || manager().currentlyLoading > 0) { last = n; steadySince = Date.now(); }
        else if (Date.now() - steadySince > (whole ? 2000 : 240)) break;
      }
      return count();
    };
    /* The top of whatever stands at a spot, trees and builds and all: BlueMap
       casts a ray down through the detailed tiles from y 300. */
    const ground = (x, z) => {
      const y = viewer.map.terrainHeightAt(x, z);
      return typeof y === 'number' && Number.isFinite(y) ? y : -Infinity;
    };
    /* The camera stands clear: ten blocks over what is under it, and nothing
       across the near third of its view, where a tree would fill the screen. */
    const clear = (c) => {
      const e = eyeOf(c);
      if (e[1] < ground(e[0], e[2]) + 10) return false;
      for (const t of [0.08, 0.16, 0.24, 0.32]) {
        const x = e[0] + (c.look[0] - e[0]) * t, y = e[1] + (c.look[1] - e[1]) * t, z = e[2] + (c.look[2] - e[2]) * t;
        if (y < ground(x, z) + 2) return false;
      }
      return true;
    };
    window.__flight = { camAt, place, settle, count, clear };
  }, plan);

  /* The whole world in full detail, from the overview, before anything is drawn or measured. */
  const tiles = await page.evaluate(async () => { const f = window.__flight; f.place(f.camAt(0)); return f.settle(true); });
  console.log(`${shape.name}: ${tiles} reitir í fullri upplausn`);

  /* The survey: how far each frame's camera must look down to stand clear of
     the ground and what grows on it, eased over the frames round it so the
     camera rises over a tree and settles back instead of jumping. The landing
     is the start view itself, as it is. */
  const needed = await page.evaluate((frames) => {
    const f = window.__flight;
    return Array.from({ length: frames }, (_, i) => {
      const s = i / (frames - 1);
      const c = f.camAt(s);
      for (let lift = 0; lift <= c.angle - 0.15; lift += 0.02) if (f.clear(f.camAt(s, lift))) return lift;
      return c.angle - 0.15;
    });
  }, FRAMES);
  const lift = needed.map((_, i) => {
    let sum = 0, weight = 0;
    for (let j = Math.max(0, i - 6); j <= Math.min(FRAMES - 1, i + 6); j++) {
      const near = Math.max(...needed.slice(Math.max(0, j - 2), j + 3));
      const g = Math.exp(-((i - j) ** 2) / 8);
      sum += near * g; weight += g;
    }
    return Math.max(needed[i], sum / weight);
  });
  for (let i = FRAMES - 4; i < FRAMES; i++) lift[i] *= (FRAMES - 1 - i) / 4;
  const lifted = lift.flatMap((v, i) => (v > 0.005 ? [i] : []));
  if (lifted.length) console.log(`${shape.name}: myndavélin lyft yfir landið í römmum ${lifted[0]}–${lifted.at(-1)} (mest ${Math.max(...lift).toFixed(2)} rad)`);
  if (needed.at(-1) > 0) console.warn(`${shape.name}: upphafssjónarhornið sjálft stendur nærri landinu`);

  const shots = [];
  for (let i = 0; i < FRAMES; i++) {
    const shot = await page.evaluate(async ({ s, lift, sun }) => {
      const viewer = window.bluemap.mapViewer;
      const cm = viewer.controlsManager;
      const f = window.__flight;
      const c = f.camAt(s, lift);
      f.place(c);
      await f.settle(false);
      /* The light of the hour this frame is at, and the sky painted #FF00FF
         to be cut out: BlueMap draws the sky and the void past the world's
         edge as their colour times the light (the larger of the sun squared
         and the ambient light), so the colour is given over the light and
         comes out exactly #FF00FF at any hour. */
      const u = viewer.data.uniforms;
      u.sunlightStrength.value = sun;
      const light = Math.max(sun * sun, u.ambientLight.value);
      u.skyColor.value.setRGB(1 / light, 0, 1 / light);
      u.voidColor.value.setRGB(1 / light, 0, 1 / light);
      /* One frame, drawn here and read off the canvas in the same breath,
         before the browser clears it: the paused viewer draws nothing else.
         The camera is set again just before, should anything have moved it. */
      const drawn = performance.now();
      const jod = window.jod;
      f.place(c);
      const cam = viewer.camera;
      const eye = [cam.position.x, cam.position.y, cam.position.z];
      const look = [cm.position.x, cm.position.y, cm.position.z];
      if (jod) jod.paused = false;
      viewer.render(0);
      const png = viewer.renderer.domElement.toDataURL('image/png');
      if (jod) jod.paused = true;
      /* the camera the frame was drawn with, as one matrix from the world to
         the screen (projection × view), which the page projects places by */
      cam.updateMatrixWorld(true);
      cam.updateProjectionMatrix();
      const m = cam.projectionMatrix.clone().multiply(cam.matrixWorldInverse);
      return { m: Array.from(m.elements), eye, look, d: c.d, png, ms: Math.round(performance.now() - drawn) };
    }, { s: i / (FRAMES - 1), lift: lift[i], sun: DUSK + (plan.night - DUSK) * (i / (FRAMES - 1)) });
    const png = Buffer.from(shot.png.slice(shot.png.indexOf(',') + 1), 'base64');
    /* the sky cut out at the size it was drawn, before the frame is shrunk,
       so the land's edge is as fine as the render; then the still's colour
       on what is left, and the cut kept as the frame's transparency */
    const full = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    keySky(full.data, full.info.width, full.info.height);
    const small = await sharp(full.data, { raw: { width: full.info.width, height: full.info.height, channels: 4 } })
      .resize(shape.width, shape.height, { kernel: 'lanczos3' }).raw().toBuffer();
    const raw = { raw: { width: shape.width, height: shape.height, channels: 4 } };
    const rgb = await sharp(small, raw).removeAlpha().recomb(SATURATE).raw().toBuffer();
    const alpha = await sharp(small, raw).extractChannel(3).raw().toBuffer();
    const webp = await sharp(rgb, { raw: { width: shape.width, height: shape.height, channels: 3 } })
      .joinChannel(alpha, { raw: { width: shape.width, height: shape.height, channels: 1 } })
      .webp({ quality: 62, alphaQuality: 70 }).toBuffer();
    writeFileSync(`${OUT}/${shape.name}-${i}.webp`, webp);
    hash.update(webp);
    /* six significant figures put a pin within a pixel; a tenth of a block is plenty for the rest */
    const tenth = (v) => Math.round(v * 10) / 10;
    shots.push({ m: shot.m.map(v => Number(v.toPrecision(6))), eye: shot.eye.map(tenth), look: shot.look.map(tenth), d: tenth(shot.d) });
    console.log(`${shape.name} ${i + 1}/${FRAMES}: teiknað á ${shot.ms} ms`);
  }
  await page.close();
  flights[shape.name] = { width: shape.width, height: shape.height, shots };
  const bytes = readdirSync(OUT).filter(f => f.startsWith(`${shape.name}-`)).reduce((sum, f) => sum + readFileSync(`${OUT}/${f}`).length, 0);
  console.log(`${shape.name}: ${FRAMES} rammar, ${(bytes / 1e6).toFixed(1)} MB`);
}
await browser.close();

/* the page asks for /map-flight/<shape>-<n>.webp?v=<this>, so a new flight
   is never answered from a year-long cache of the old one */
const version = hash.digest('hex').slice(0, 10);
writeFileSync('src/lib/map-flight.json', JSON.stringify({ version, frames: FRAMES, ...flights }) + '\n');
console.log(`${OUT} og src/lib/map-flight.json skrifuð (útgáfa ${version})`);

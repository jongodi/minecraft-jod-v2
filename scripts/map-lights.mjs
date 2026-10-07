// The town's lights, taken off the map's still: every lantern, torch and
// lamp the night still shows, as three layers of warm light the home page
// lays over the still and lights one after another as the world scrolls into
// view (badlands.css, .b-frame__lights). Derived from the still, not drawn by
// hand, so a new still brings its own lights: map:poster runs this after it
// writes one, and `npm run map:lights` runs it on its own.
//
// A light is a warm, bright pixel (BlueMap draws block light that way at
// night). They are pooled into a quarter-size grid, each light given to one
// of three layers by where it stands (so a whole lantern lights at once), and
// each layer spread into a soft pool of light round each source. A lantern's
// light is one of the four the site lets cast a soft pool.
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const sharp = require('sharp');

const SCALE = 4;           // the layers are a quarter of the still's size: light is soft anyway
const LAYERS = 3;
const BLOCK = 24;          // still pixels: a light and its neighbours land in one layer together
const SIGMA = 2.6;         // the pool's spread, in quarter-size pixels
const GAIN = 7;            // how bright a lone lantern's pool is
const MAX = 96;            // never more than about half the light's colour over the still: a pool, not an orb
const LIGHT = [255, 200, 118];   // lamplight, between the site's sun and its lantern

/** Is this a lamp, at night, in BlueMap's render? Warm and bright. */
const isLight = (r, g, b) => r > 190 && g > 120 && b < 150 && r - b > 80;

export async function writeLights(still = 'public/map-poster.webp', out = 'public') {
  const { data, info } = await sharp(still).raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H, channels: C } = info;
  const w = Math.ceil(W / SCALE);
  const h = Math.ceil(H / SCALE);
  const cores = Array.from({ length: LAYERS }, () => new Uint8Array(w * h));
  let found = 0;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * C;
      const r = data[i], g = data[i + 1], b = data[i + 2];
      if (!isLight(r, g, b)) continue;
      found++;
      const bx = Math.floor(x / BLOCK), by = Math.floor(y / BLOCK);
      const layer = ((bx * 73856093) ^ (by * 19349663)) >>> 0;
      const cell = Math.floor(y / SCALE) * w + Math.floor(x / SCALE);
      const v = Math.round(((r + g) / 510) * 255);
      const core = cores[layer % LAYERS];
      if (v > core[cell]) core[cell] = v;
    }
  }
  const files = [];
  /* the address the page asks for: the lights' own bytes, so lights taken
     again (another still, or other settings here) are never answered from
     a year-long cache of the old ones */
  const hash = createHash('sha256');
  for (let n = 0; n < LAYERS; n++) {
    /* one channel in, one channel out: sharp otherwise hands back the blur as three */
    const { data: blurred, info: b } = await sharp(Buffer.from(cores[n]), { raw: { width: w, height: h, channels: 1 } })
      .blur(SIGMA).extractChannel(0).raw().toBuffer({ resolveWithObject: true });
    if (b.channels !== 1 || b.width !== w) throw new Error(`map-lights: the blur came back as ${b.channels} channels, ${b.width} wide`);
    const rgba = Buffer.alloc(w * h * 4);
    for (let i = 0; i < w * h; i++) {
      /* the pool, and the lamp itself on top of it */
      const a = Math.min(MAX, blurred[i] * GAIN + cores[n][i] * 0.3);
      rgba[i * 4] = LIGHT[0]; rgba[i * 4 + 1] = LIGHT[1]; rgba[i * 4 + 2] = LIGHT[2]; rgba[i * 4 + 3] = a;
    }
    const webp = await sharp(rgba, { raw: { width: w, height: h, channels: 4 } }).webp({ quality: 70, alphaQuality: 80 }).toBuffer();
    const file = `map-lights-${n + 1}.webp`;
    writeFileSync(`${out}/${file}`, webp);
    hash.update(webp);
    files.push({ file, bytes: webp.length });
  }
  return { found, files, version: hash.digest('hex').slice(0, 10), size: [w, h] };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const r = await writeLights();
  const poster = JSON.parse(readFileSync('src/lib/map-poster.json', 'utf8'));
  writeFileSync('src/lib/map-poster.json', JSON.stringify({ ...poster, lights: r.version }, null, 2) + '\n');
  console.log(`${r.found} ljóspixlar · ${r.files.map(f => `${f.file} ${(f.bytes / 1024).toFixed(1)} kB`).join(' · ')} (${r.size.join('×')})`);
}

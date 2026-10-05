// Staged data for screenshots: the server on with three of the crew in, a
// week of stats, and drawn pixel heads in place of minotar and mc-heads.
// A sandbox that reaches none of those services otherwise shows only the
// fallbacks (a dark lantern, question-mark heads, empty posters).
// Used by shots.mjs with STAGE=1; nothing here ships with the site.
import sharp from 'sharp';

const CREW = ['stebbias', 'AmmaGaur', 'joenana', 'ingunnbirta', 'Gamla123', 'fafnir1994', 'IMlonely', 'eikibleiki'];
const IN = (process.env.STAGE_IN ?? 'stebbias,joenana,eikibleiki').split(',').filter(Boolean);

/* one skin tone, hair and shirt per name, so the heads tell apart */
const hash = s => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
const PALETTE = [[0x8f, 0x5a, 0x3c], [0x3b, 0x27, 0x19], [0xc9, 0x9a, 0x5a], [0x6b, 0x4a, 0x2e], [0x2a, 0x1a, 0x14], [0xba, 0x85, 0x23]];
const SHIRT = [[0x5f, 0x73, 0x78], [0x8f, 0x3d, 0x2e], [0x6e, 0x80, 0x55], [0x4d, 0x33, 0x23], [0xa1, 0x53, 0x25]];

function headPixels(name) {
  const h = hash(name);
  const skin = [0xd8 - (h % 40), 0xa6 - (h % 30), 0x84 - (h % 30)];
  const hair = PALETTE[h % PALETTE.length];
  const px = Buffer.alloc(8 * 8 * 4);
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
    let c = skin;
    if (y < 2 || (y < 3 && (x === 0 || x === 7))) c = hair;
    if (y === 4 && (x === 1 || x === 5)) c = [0xf4, 0xf0, 0xe8];
    if (y === 4 && (x === 2 || x === 6)) c = [0x3b, 0x5a, 0x8f];
    if (y === 6 && x >= 3 && x <= 4) c = [0x8f, 0x5a, 0x4c];
    const i = (y * 8 + x) * 4;
    px[i] = c[0]; px[i + 1] = c[1]; px[i + 2] = c[2]; px[i + 3] = 255;
  }
  return px;
}

function bodyPixels(name) {
  const head = headPixels(name);
  const shirt = SHIRT[hash(name) % SHIRT.length];
  const px = Buffer.alloc(16 * 32 * 4);
  const set = (x, y, c) => { const i = (y * 16 + x) * 4; px[i] = c[0]; px[i + 1] = c[1]; px[i + 2] = c[2]; px[i + 3] = 255; };
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { const i = (y * 8 + x) * 4; set(x + 4, y, [head[i], head[i + 1], head[i + 2]]); }
  for (let y = 8; y < 20; y++) for (let x = 0; x < 16; x++) set(x, y, x < 4 || x > 11 ? [0xd8, 0xa6, 0x84] : shirt);
  for (let y = 20; y < 32; y++) for (let x = 4; x < 12; x++) set(x, y, [0x35, 0x22, 0x1a]);
  return px;
}

async function png(name, full, size) {
  const [w, h] = full ? [16, 32] : [8, 8];
  const s = Math.max(1, Math.round(size / w));
  return sharp(full ? bodyPixels(name) : headPixels(name), { raw: { width: w, height: h, channels: 4 } })
    .resize(w * s, h * s, { kernel: 'nearest' }).png().toBuffer();
}

function stat(name, i) {
  const h = hash(name);
  return {
    username: name, deaths: 3 + (h % 40), mobKills: 200 + (h % 2400), playerKills: h % 5,
    playTimeTicks: (40 + (h % 160)) * 72000, playTimeHours: 40 + (h % 160), distanceWalked: (h % 900) * 100000,
    itemsCrafted: h % 5000, timeSinceRest: (h % 9) * 24000 + 4000, timeSinceDeath: (h % 30) * 72000,
    travelCm: (200 + (h % 900)) * 100000, damageRatio: 0.4 + (h % 30) / 10, raidWins: h % 6,
    recordsPlayed: h % 14, drawMs: i % 3 === 0 ? 240 + (h % 200) : 0, noShows: i === 5 ? 2 : 0,
  };
}

/** Routes the page's live data and the head services to the staged answers. */
export async function stage(page) {
  const now = Date.now();
  const status = {
    online: true, life: 'on', source: 'exaroton', version: '1.21.11',
    players: { online: IN.length, max: 20, list: IN.map(name => ({ name, uuid: name })) },
  };
  await page.route('**/api/server-status', r => r.fulfill({ json: status }));
  await page.route('**/api/stats', r => r.fulfill({ json: {
    players: CREW.map(stat), source: 'cached', cachedAt: new Date(now - 3600_000).toISOString(),
    week: { from: '2026-09-28', to: '2026-10-05', players: CREW.map((n, i) => ({ username: n, playTimeHours: 2 + i * 1.5, deaths: i % 4, mobKills: 20 + i * 13, travelCm: (5 + i) * 100000, raidWins: i % 2, recordsPlayed: i % 3, damageRatio: 1 + i / 4 })) },
  } }));
  await page.route(/^https:\/\/(minotar\.net|mc-heads\.net)\//, async r => {
    const url = new URL(r.request().url());
    const parts = url.pathname.split('/').filter(Boolean);
    const full = parts.includes('body');
    const size = Number.parseInt(parts.at(-1), 10) || 64;
    const name = full ? parts.at(-2) : parts[1];
    await r.fulfill({ contentType: 'image/png', body: await png(name, full, size) });
  });
}

/** The page was drawn on the server with the sandbox's failed status: ask it again now. */
export async function restatus(page) {
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await page.waitForTimeout(600);
}

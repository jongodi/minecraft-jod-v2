// Copies the BlueMap web folder off the Minecraft server into the site, so the
// map on /heimskort still works while the server is stopped.
//
//   npm run map:sync            fetch what changed since the last copy
//   npm run map:sync -- --full  fetch everything again
//
// The viewer goes to public/bluemap and the map data to public/bluemap-data.
// src/lib/bluemap-snapshot.json lists the map files, so the /bluemap route
// knows what it can send to the copy. Live player positions are left out on
// purpose: while the server runs they come straight from it.
//
// Reads EXAROTON_API_KEY (and EXAROTON_SERVER_ID, if set) from .env.local.
// Run it while the server is online: exaroton hands out files very slowly
// once a server has stopped. exaroton also limits how fast the API may be
// called, so requests are spaced out and slow down further whenever it asks.

import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const ROOT     = process.cwd();
const REMOTE   = 'bluemap/web';
const SHELL    = join(ROOT, 'public', 'bluemap');
const DATA     = join(ROOT, 'public', 'bluemap-data');
const MANIFEST = join(ROOT, 'src', 'lib', 'bluemap-snapshot.json');
const API      = 'https://api.exaroton.com/v1/servers';
const PARALLEL = 6;
const MIN_GAP  = 60;      // ms between request starts, at the fastest
const MAX_GAP  = 3000;    // ms between request starts, when exaroton keeps pushing back
const FULL     = process.argv.includes('--full');

/* Requests start at least `gap` ms apart across all lanes. Each success nudges
   the pace up a little; each 429 halves it and pauses every lane at once, for as
   long as exaroton's Retry-After says or an ever longer wait if it says nothing. */
let gap = 150;
let nextStart = 0;
let pausedUntil = 0;
let pushedBack = 0;

loadEnv(join(ROOT, '.env.local'));
const token = process.env.EXAROTON_API_KEY;
if (!token) fail('EXAROTON_API_KEY vantar í .env.local');

try {
  await main();
} catch (err) {
  fail(err instanceof Error ? err.message : String(err));
}

async function main() {
  const id = await serverId();
  const server = await call(`${id}/`);
  if (server?.status !== 1) {
    console.warn('Þjónninn er ekki í gangi. Exaroton afhendir skrár hægt á meðan, svo þetta getur tekið langan tíma.');
    console.warn('Mun fljótlegra er að afrita kortið meðan þjónninn er í gangi.\n');
  }

  console.log(`Les möppur í ${REMOTE} á þjóninum…`);
  const found = await walk(id);
  if (!found.some((f) => f.rel === 'index.html') || !found.some((f) => f.rel.startsWith('maps/'))) {
    fail(`Fann hvorki index.html né kortagögn í ${REMOTE}. Er BlueMap uppsett og búið að teikna kortið?`);
  }

  const total = found.length;
  const bytes = found.reduce((sum, f) => sum + (f.size ?? 0), 0);
  console.log(`Sæki ${total} skrár (${mb(bytes)} MB)${FULL ? ', allar upp á nýtt' : ''}…`);

  let fetched = 0, unchanged = 0, done = 0;
  await pool(found, async ({ rel, size }) => {
    const file = target(rel);
    const current = !FULL && typeof size === 'number' && existsSync(file) && statSync(file).size === size;
    if (current) {
      unchanged++;
    } else {
      const body = await call(`${id}/files/data/${encode(`${REMOTE}/${rel}`)}`, true);
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(`${file}.part`, body);
      renameSync(`${file}.part`, file);
      fetched++;
    }
    done++;
    if (done % 25 === 0 || done === total) process.stdout.write(`\r  ${done} / ${total}`);
  });
  process.stdout.write('\n');

  /* only now that every file is in place: drop whatever the server no longer has */
  const keep = new Set(found.map((f) => target(f.rel)));
  const removed = prune(SHELL, keep) + prune(DATA, keep);

  const files = found.map((f) => f.rel).filter((rel) => rel.startsWith('maps/')).sort();
  writeFileSync(MANIFEST, JSON.stringify({ syncedAt: new Date().toISOString(), files }, null, 2) + '\n');

  console.log(`\nKortið afritað. Sóttar skrár: ${fetched}, óbreyttar: ${unchanged}, fjarlægðar: ${removed}.`);
  if (pushedBack) {
    const times = pushedBack === 1 ? 'einu sinni' : `${pushedBack} sinnum`;
    console.log(`Exaroton bað ${times} um hlé og afritunin hægði á sér á meðan.`);
  }
  console.log('Til að birta það: git add public/bluemap public/bluemap-data src/lib/bluemap-snapshot.json, commit og push.');
}

/* Everything under bluemap/web, one folder level at a time, a few folders at once. */
async function walk(id) {
  const found = [];
  let level = [''];
  let read = 0;
  while (level.length) {
    const next = [];
    await pool(level, async (dir) => {
      const info = await call(`${id}/files/info/${encode(dir ? `${REMOTE}/${dir}` : REMOTE)}`);
      for (const kid of info?.children ?? []) {
        const rel = dir ? `${dir}/${kid.name}` : kid.name;
        if (skip(rel)) continue;
        if (kid.isDirectory) next.push(rel);
        else found.push({ rel, size: kid.size });
      }
      read++;
      if (read % 25 === 0) process.stdout.write(`\r  ${read} möppur lesnar, ${found.length} skrár fundnar`);
    });
    level = next;
  }
  process.stdout.write(`\r  ${read} möppur lesnar, ${found.length} skrár fundnar\n`);
  return found;
}

function skip(rel) {
  const name = rel.slice(rel.lastIndexOf('/') + 1);
  return name.startsWith('.')
    || name.endsWith('.php')                               // BlueMap's sql.php holds database settings
    || /^maps\/[^/]+\/live\/players\.json$/.test(rel);     // live, served from the server while it runs
}

/* the viewer lives at /bluemap, the map data at /bluemap-data/maps */
function target(rel) {
  return join(rel.startsWith('maps/') ? DATA : SHELL, ...rel.split('/'));
}

function prune(dir, keep) {
  if (!existsSync(dir)) return 0;
  let removed = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      removed += prune(path, keep);
      if (readdirSync(path).length === 0) rmSync(path, { recursive: true });
    } else if (!keep.has(path)) {
      rmSync(path);
      if (!entry.name.endsWith('.part')) removed++;
    }
  }
  return removed;
}

async function serverId() {
  if (process.env.EXAROTON_SERVER_ID) return process.env.EXAROTON_SERVER_ID;
  const host = process.env.EXAROTON_SERVER_HOST ?? 'stebbias.exaroton.me';
  const servers = await call('');
  const match = servers?.find((s) => s.address === host);
  if (!match) throw new Error('Þjónninn fannst ekki á Exaroton-reikningnum');
  return match.id;
}

async function turn() {
  for (;;) {
    const now = Date.now();
    const at = Math.max(nextStart, pausedUntil);
    if (now >= at) {
      nextStart = now + gap;
      return;
    }
    await sleep(at - now);
  }
}

/* One exaroton API call, retried on rate limits and hiccups. */
async function call(path, raw = false) {
  for (let attempt = 1; ; attempt++) {
    await turn();
    let res;
    try {
      res = await fetch(`${API}/${path}`, { headers: { Authorization: `Bearer ${token}` } });
    } catch (err) {
      if (attempt >= 6) throw err;
      await sleep(2000 * attempt);
      continue;
    }
    if (res.ok) {
      gap = Math.max(MIN_GAP, gap * 0.97);
      return raw ? Buffer.from(await res.arrayBuffer()) : (await res.json()).data;
    }
    await res.body?.cancel().catch(() => undefined);
    const retryable = res.status === 429 || res.status >= 500;
    if (!retryable || attempt >= 10) {
      throw new Error(`exaroton svaraði ${res.status} fyrir ${decodeURIComponent(path)}`);
    }
    if (res.status === 429) {
      pushedBack++;
      gap = Math.min(MAX_GAP, gap * 2);
    }
    const retryAfter = Number(res.headers.get('retry-after'));
    const wait = retryAfter > 0 ? retryAfter * 1000 : Math.min(60_000, 2000 * 2 ** (attempt - 1));
    pausedUntil = Math.max(pausedUntil, Date.now() + wait);
  }
}

async function pool(items, worker) {
  let next = 0;
  const lanes = Array.from({ length: Math.min(PARALLEL, items.length) }, async () => {
    while (next < items.length) await worker(items[next++]);
  });
  await Promise.all(lanes);
}

function encode(path) {
  return path.split('/').map(encodeURIComponent).join('/');
}

function loadEnv(file) {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!m || process.env[m[1]] !== undefined) continue;
    process.env[m[1]] = m[2].trim().replace(/^(['"])(.*)\1$/, '$2');
  }
}

function mb(bytes) {
  return (bytes / 1024 / 1024).toLocaleString('is-IS', { maximumFractionDigits: 1 });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function fail(message) {
  console.error(`\nVilla: ${message}`);
  process.exit(1);
}

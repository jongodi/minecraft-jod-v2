// Copies the BlueMap web folder off the Minecraft server, so the map on the
// site still works while the server is stopped.
//
//   npm run map:sync            fetch what changed since the last copy, upload it
//   npm run map:sync -- --full  fetch everything again, upload everything
//   npm run map:sync -- --push  upload the local copy as it is, without exaroton
//
// The viewer (a few MB) goes to public/bluemap and travels with the site. The
// map data (hundreds of MB) goes to public/bluemap-data as a local copy for
// development, ignored by git, and from there to Vercel Blob under
// bluemap-data/, which is what the site serves it from: every deployment used
// to carry the whole copy as static files. src/lib/bluemap-snapshot.json lists
// the map files and names the store, so the /bluemap route knows what the copy
// holds and next.config knows where to send /bluemap-data. Live player
// positions are left out on purpose: while the server runs they come straight
// from it.
//
// Only what the viewer reads is copied: BlueMap's render bookkeeping
// (maps/*/rstate), maps the viewer doesn't list, player heads (they come from
// /api/map-head) and source maps stay on the server. The last step brands the
// viewer as JOÐ's map (scripts/bluemap-brand.mjs; npm run map:brand on its own).
//
// Reads EXAROTON_API_KEY (and EXAROTON_SERVER_ID, if set) and
// BLOB_READ_WRITE_TOKEN from .env.local. Run it while the server is online:
// exaroton hands out files very slowly once a server has stopped. exaroton also
// limits how fast the API may be called, so requests are spaced out and slow
// down further whenever it asks.

import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { del, list, put } from '@vercel/blob';
import { brand, OWN_FILES, versionOf } from './bluemap-brand.mjs';

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
const PUSH     = process.argv.includes('--push');
const BLOB_DIR = 'bluemap-data';   // the folder in the store; the site maps /bluemap-data onto it
const BLOB_MAX_AGE = 3600;         // how long the store's CDN may keep a tile after it is overwritten
const UPLOADS  = 8;

/* Requests start at least `gap` ms apart across all lanes. Each success nudges
   the pace up a little; each 429 halves it and pauses every lane at once, for as
   long as exaroton's Retry-After says or an ever longer wait if it says nothing. */
let gap = 150;
let nextStart = 0;
let pausedUntil = 0;
let pushedBack = 0;

loadEnv(join(ROOT, '.env.local'));
const token = process.env.EXAROTON_API_KEY;
const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
if (!PUSH && !token) fail('EXAROTON_API_KEY vantar í .env.local');
if (!blobToken) fail('BLOB_READ_WRITE_TOKEN vantar í .env.local: kortagögnin fara í Vercel Blob. Lykillinn er í Vercel undir Storage.');

try {
  await main();
} catch (err) {
  fail(err instanceof Error ? err.message : String(err));
}

async function main() {
  if (PUSH) return push();

  const id = await serverId();
  const server = await call(`${id}/`);
  if (server?.status !== 1) {
    console.warn('Þjónninn er ekki í gangi. Exaroton afhendir skrár hægt á meðan, svo þetta getur tekið langan tíma.');
    console.warn('Mun fljótlegra er að afrita kortið meðan þjónninn er í gangi.\n');
  }

  console.log(`Les möppur í ${REMOTE} á þjóninum…`);
  const listed = await listedMaps(id);
  const found = (await walk(id)).filter(({ rel }) => {
    const map = rel.match(/^maps\/([^/]+)\//)?.[1];
    return !map || !listed || listed.has(map);
  });
  if (!found.some((f) => f.rel === 'index.html') || !found.some((f) => f.rel.startsWith('maps/'))) {
    fail(`Fann hvorki index.html né kortagögn í ${REMOTE}. Er BlueMap uppsett og búið að teikna kortið?`);
  }

  const total = found.length;
  const bytes = found.reduce((sum, f) => sum + (f.size ?? 0), 0);
  console.log(`Sæki ${total} skrár (${mb(bytes)} MB)${FULL ? ', allar upp á nýtt' : ''}…`);

  let fetched = 0, unchanged = 0, done = 0;
  const changed = new Set();
  await pool(found, async ({ rel, size }) => {
    const file = target(rel);
    /* Tiles and the texture atlas are the bulk and change size whenever they are
       redrawn, so a matching size means nothing changed. Everything else is small
       and can change without changing size (settings.json, say), so it is always
       fetched. */
    const trustSize = /^maps\/[^/]+\/(tiles\/|textures\.json)/.test(rel);
    const current = !FULL && trustSize && typeof size === 'number' && existsSync(file) && statSync(file).size === size;
    if (current) {
      unchanged++;
    } else {
      const body = await call(`${id}/files/data/${encode(`${REMOTE}/${rel}`)}`, true);
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(`${file}.part`, body);
      renameSync(`${file}.part`, file);
      fetched++;
      changed.add(rel);
    }
    done++;
    if (done % 25 === 0 || done === total) process.stdout.write(`\r  ${done} / ${total}`);
  });
  process.stdout.write('\n');

  /* only now that every file is in place: drop whatever the server no longer has */
  const keep = new Set([...found.map((f) => target(f.rel)), ...OWN_FILES.map((rel) => join(SHELL, ...rel.split('/')))]);
  const removed = prune(SHELL, keep) + prune(DATA, keep);

  console.log(`\nKortið afritað. Sóttar skrár: ${fetched}, óbreyttar: ${unchanged}, fjarlægðar: ${removed}.`);
  if (pushedBack) {
    const times = pushedBack === 1 ? 'einu sinni' : `${pushedBack} sinnum`;
    console.log(`Exaroton bað ${times} um hlé og afritunin hægði á sér á meðan.`);
  }

  const files = found.map((f) => f.rel).filter((rel) => rel.startsWith('maps/')).sort();
  /* What the store already holds is what the last manifest says it uploaded;
     anything fetched this run, or not in that list, goes up. --full sends all. */
  const previous = readManifest();
  const had = new Set(previous.blob ? previous.files : []);
  const todo = FULL ? files : files.filter((rel) => changed.has(rel) || !had.has(rel));
  const blob = await upload(files, todo, previous.blob);
  writeManifest(files, blob);
}

/* --push: the local copy as it stands goes to the store, exaroton is not asked. */
async function push() {
  if (!existsSync(DATA)) fail(`Engin afrit í ${relative(ROOT, DATA)}. Keyrðu map:sync án --push til að sækja kortið fyrst.`);
  const files = walkLocal(DATA).filter((rel) => !skip(rel)).sort();
  if (!files.length) fail(`Engar skrár í ${relative(ROOT, DATA)}.`);
  const blob = await upload(files, files, readManifest().blob);
  writeManifest(files, blob);
}

/* Every map file under DATA, as maps/… paths. */
function walkLocal(dir, base = dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkLocal(path, base));
    else if (!entry.name.endsWith('.part') && !entry.name.startsWith('.')) out.push(relative(base, path).split(sep).join('/'));
  }
  return out;
}

function readManifest() {
  try { return JSON.parse(readFileSync(MANIFEST, 'utf8')); } catch { return { syncedAt: null, files: [] }; }
}

function writeManifest(files, blob) {
  const syncedAt = new Date().toISOString();
  writeFileSync(MANIFEST, JSON.stringify({ syncedAt, version: versionOf(syncedAt), files, blob }, null, 2) + '\n');
  brand(ROOT);
  console.log(`\nTil að birta það: git add public/bluemap src/lib/bluemap-snapshot.json, commit og push.`);
}

/* Sends `todo` to the store, drops whatever the store holds that is no longer in
   `files`, and answers with where the store is and whether it is public. The
   store is either public or private, decided when it was made; a public one
   is served through a rewrite, a private one through the /bluemap-data route. */
async function upload(files, todo, known) {
  let access = process.env.BLOB_ACCESS === 'private' || known?.access === 'private' ? 'private' : 'public';
  let base = known?.base ?? null;
  const total = todo.length;
  const bytes = todo.reduce((sum, rel) => sum + statSync(target(rel)).size, 0);
  console.log(`\nSendi ${total} skrár (${mb(bytes)} MB) í Vercel Blob…`);

  let done = 0;
  const send = async (rel) => {
    const body = readFileSync(target(rel));
    const options = { access, addRandomSuffix: false, allowOverwrite: true, cacheControlMaxAge: BLOB_MAX_AGE, contentType: mime(rel), token: blobToken };
    let result;
    try {
      result = await put(`${BLOB_DIR}/${rel}`, body, options);
    } catch (err) {
      if (access === 'public' && /private/i.test(err?.message ?? '')) {
        access = 'private';
        result = await put(`${BLOB_DIR}/${rel}`, body, { ...options, access });
      } else {
        throw err;
      }
    }
    base ??= result.url.slice(0, result.url.indexOf(`/${BLOB_DIR}/`));
    done++;
    if (done % 25 === 0 || done === total) process.stdout.write(`\r  ${done} / ${total}`);
  };
  /* the first upload settles the store's access level before the rest fan out */
  if (todo.length) { await send(todo[0]); await poolN(todo.slice(1), send, UPLOADS); }
  if (total) process.stdout.write('\n');

  /* what the store has that the server no longer does */
  const keep = new Set(files.map((rel) => `${BLOB_DIR}/${rel}`));
  const stale = [];
  let cursor;
  do {
    const page = await list({ prefix: `${BLOB_DIR}/`, cursor, limit: 1000, token: blobToken });
    for (const b of page.blobs) {
      if (!base) base = b.url.slice(0, b.url.indexOf(`/${BLOB_DIR}/`));
      if (!keep.has(b.pathname)) stale.push(b.url);
    }
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  for (let i = 0; i < stale.length; i += 100) await del(stale.slice(i, i + 100), { token: blobToken });

  console.log(`Í geymslunni: ${files.length} skrár${stale.length ? `, ${stale.length} gamlar fjarlægðar` : ''}. Geymslan er ${access === 'public' ? 'opin' : 'lokuð'}.`);
  if (!base) fail('Fann ekki slóð geymslunnar.');
  return { base, access };
}

function mime(rel) {
  const ext = rel.slice(rel.lastIndexOf('.') + 1).toLowerCase();
  return { gz: 'application/gzip', json: 'application/json', png: 'image/png', dat: 'application/octet-stream', prbm: 'application/octet-stream' }[ext] ?? 'application/octet-stream';
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
    || name.endsWith('.map')                               // source maps: only a debugger reads them
    || /^maps\/[^/]+\/live\/players\.json$/.test(rel)      // live, served from the server while it runs
    || /^maps\/[^/]+\/rstate\//.test(rel)                  // BlueMap's record of what it rendered; the viewer never reads it
    || /^maps\/[^/]+\/assets\/playerheads\//.test(rel);   // served by /api/map-head
}

/* The maps the viewer lists (settings.json on the server). A map folder that
   isn't listed, like one left from a map that was switched off, stays behind.
   If the list can't be read, every map is copied. */
async function listedMaps(id) {
  try {
    const body = await call(`${id}/files/data/${encode(`${REMOTE}/settings.json`)}`, true);
    const maps = JSON.parse(body.toString('utf8')).maps;
    return Array.isArray(maps) && maps.length ? new Set(maps) : null;
  } catch {
    return null;
  }
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
  return poolN(items, worker, PARALLEL);
}

async function poolN(items, worker, width) {
  let next = 0;
  const lanes = Array.from({ length: Math.min(width, items.length) }, async () => {
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

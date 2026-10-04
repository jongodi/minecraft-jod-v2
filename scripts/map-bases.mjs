// The base maps: a small BlueMap map of its own around each base in
// src/lib/map-bases.json, with the same look as the main map, and a viewer of
// its own on the site at /kort/<id>, apart from the main map.
//
//   npm run map:bases              show the configs that would be written, write nothing
//   npm run map:bases -- --write   write the configs that aren't on the server yet
//   npm run map:bases -- --write --force   also overwrite ones that are
//   npm run map:bases -- --freeze          freeze every base map (no updates at all)
//   npm run map:bases -- --refresh <id>    unfreeze one base map and update it now
//   npm run map:bases -- --upload [id...]  copy base maps to the site (all of them if none is named)
//   npm run map:bases -- --upload <id> --force   upload it even if nothing changed
//   npm run map:bases -- --prune [id...]   drop the copies the site no longer reads
//
// Each config is a copy of the main map's (plugins/BlueMap/maps/world.conf)
// with only its name, place in the list, start position and render mask
// changed. Every config is also saved under scripts/out/bluemap-maps/ to look at.
//
// The base maps never update on their own: they are frozen, and only redrawn
// when asked. After --write: /bluemap reload in the console, let the first
// render finish (/bluemap shows progress), then --freeze. Freezing is kept
// over server restarts. To redraw one later:
//
//   1. npm run map:bases -- --refresh <id>, and wait for the render to finish
//   2. npm run map:bases -- --freeze
//   3. npm run map:bases -- --upload <id>
//   4. git add src/lib/map-bases/<id>.json, commit and push
//   5. once the site is deployed with it: npm run map:bases -- --prune <id>
//
// --upload copies a base map's folder (bluemap/web/maps/<id>) off the server
// into scripts/out/map-bases/, fetching only what changed since the last time,
// and, if anything did, sends it to Vercel Blob as a few packs
// (scripts/bluemap-pack.mjs) under bluemap-bases/<id>/, with its manifest in
// src/lib/map-bases/<id>.json. Nothing goes up when nothing changed. It only
// ever lists and deletes under bluemap-bases/<id>/, never the main map's
// packs (bluemap-data/) or another base's, and map:sync only ever lists
// bluemap-data/, so neither can touch the other. Packs the site may still be
// reading are kept: the new copy, the one it replaces, and whatever the last
// commit and origin/main name. --prune then drops the replaced one.
//
// These maps never reach the main map on the site: map:sync only copies the
// main map (MAIN_MAP in scripts/bluemap-brand.mjs).
//
// Reads EXAROTON_API_KEY (and EXAROTON_SERVER_ID, EXAROTON_SERVER_HOST and
// BLUEMAP_WEBROOT if set) from .env.local, and BLOB_READ_WRITE_TOKEN for
// --upload and --prune.

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BlobAccessError, BlobStoreNotFoundError, BlobStoreSuspendedError, del, get, list, put } from '@vercel/blob';
import { MAIN_MAP, versionOf } from './bluemap-brand.mjs';
import { BASES_DIR, basePackDir, blobsOf, manifestText, packBody, PACK_BYTES, planPacks } from './bluemap-pack.mjs';

const ROOT  = process.cwd();
const API   = 'https://api.exaroton.com/v1/servers';
const MAPS  = 'plugins/BlueMap/maps';
const OUT   = join(ROOT, 'scripts', 'out', 'bluemap-maps');
/* the base maps as they were last fetched off the server, so the next upload only fetches what changed */
const LOCAL = join(ROOT, 'scripts', 'out', 'map-bases');
const MANIFESTS = join(ROOT, 'src', 'lib', 'map-bases');
const WRITE = process.argv.includes('--write');
const FORCE = process.argv.includes('--force');
const FREEZE = process.argv.includes('--freeze');
const REFRESH = process.argv.includes('--refresh') ? process.argv[process.argv.indexOf('--refresh') + 1] : null;
const UPLOAD = process.argv.includes('--upload') ? named('--upload') : null;
const PRUNE = process.argv.includes('--prune') ? named('--prune') : null;
const PARALLEL = 6;
const PACK_MAX_AGE = 31536000;     // a pack is never overwritten, so the store's CDN may keep it for good
/* Cleanup leaves packs this young alone: they may be another upload's, not yet pushed. */
const PACK_GRACE = 2 * 60 * 60 * 1000;

/** The ids named after a flag, up to the next flag. */
function named(flag) {
  const out = [];
  for (const arg of process.argv.slice(process.argv.indexOf(flag) + 1)) {
    if (arg.startsWith('--')) break;
    out.push(arg);
  }
  return out;
}

/* ---------- HOCON: change one top-level key, keep everything else as it is ---------- */

/** Where the value that starts at `i` ends: past its closing bracket for a
    { } or [ ] block, otherwise the end of the line. Skips strings and comments. */
function valueEnd(text, i) {
  while (text[i] === ' ' || text[i] === '\t') i++;
  const open = text[i];
  if (open !== '{' && open !== '[') {
    const nl = text.indexOf('\n', i);
    return nl < 0 ? text.length : nl;
  }
  let depth = 0;
  for (let j = i; j < text.length; j++) {
    const c = text[j];
    if (c === '"') {
      for (j++; j < text.length && text[j] !== '"'; j++) if (text[j] === '\\') j++;
    } else if (c === '#' || (c === '/' && text[j + 1] === '/')) {
      const nl = text.indexOf('\n', j);
      j = nl < 0 ? text.length : nl;
    } else if (c === '{' || c === '[') {
      depth++;
    } else if (c === '}' || c === ']') {
      if (--depth === 0) return j + 1;
    }
  }
  throw new Error('Lokandi sviga vantar í world.conf');
}

/** Sets a top-level key (one that starts its line, not in a comment) to `value`,
    or adds it at the end if the file doesn't have it. */
export function setKey(text, key, value) {
  const re = new RegExp(`^${key.replace(/-/g, '\\-')}[ \\t]*[:=]?[ \\t]*`, 'm');
  const m = re.exec(text);
  if (!m) return `${text.replace(/\s*$/, '')}\n${key}: ${value}\n`;
  const start = m.index;
  const end = valueEnd(text, start + m[0].length);
  return `${text.slice(0, start)}${key}: ${value}${text.slice(end)}`;
}

/** The main map's config, made into the config for `base` (number `n` in the list). */
export function baseConfig(worldConf, base, n) {
  const r = base.radius;
  let text = worldConf.replace(/\r\n/g, '\n');
  text = setKey(text, 'name', JSON.stringify(base.name));
  text = setKey(text, 'sorting', String(n));
  text = setKey(text, 'start-pos', `{ x: ${base.x}, z: ${base.z} }`);
  text = setKey(text, 'render-mask', [
    '[',
    '  {',
    `    min-x: ${base.x - r}`,
    `    max-x: ${base.x + r}`,
    `    min-z: ${base.z - r}`,
    `    max-z: ${base.z + r}`,
    '  }',
    ']',
  ].join('\n'));
  return `# ${base.name}: written by scripts/map-bases.mjs from world.conf. Centre X ${base.x} Z ${base.z}, ${r} blocks each way.\n${text}`;
}

/* ---------- exaroton ---------- */

let token;

/* Requests start at least `gap` ms apart, so a whole map's worth of files can
   be fetched without exaroton pushing back much; each 429 slows every lane. */
let gap = 150;
let nextStart = 0;
let pausedUntil = 0;
let pushedBack = 0;

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

/* One exaroton API call. A GET is tried again on hiccups; anything that
   changes the server only when exaroton asked for a pause (429), so it never
   runs twice. */
async function call(path, { method = 'GET', body, json, raw = false } = {}) {
  const type = json ? 'application/json' : body ? 'application/octet-stream' : null;
  const safe = method === 'GET';
  for (let attempt = 1; ; attempt++) {
    await turn();
    let res;
    try {
      res = await fetch(`${API}/${path}`, {
        method,
        body: json ? JSON.stringify(json) : body,
        headers: { Authorization: `Bearer ${token}`, ...(type ? { 'Content-Type': type } : {}) },
      });
    } catch (err) {
      if (!safe || attempt >= 6) throw err;
      await sleep(2000 * attempt);
      continue;
    }
    if (res.ok) {
      gap = Math.max(60, gap * 0.97);
      if (method !== 'GET') return null;
      return raw ? Buffer.from(await res.arrayBuffer()) : (await res.json()).data;
    }
    await res.body?.cancel().catch(() => undefined);
    const retry = res.status === 429 || (safe && res.status >= 500);
    if (!retry || attempt >= 10) {
      const err = new Error(`exaroton svaraði ${res.status} fyrir ${method} ${decodeURIComponent(path)}`);
      err.status = res.status;
      throw err;
    }
    if (res.status === 429) {
      pushedBack++;
      gap = Math.min(3000, gap * 2);
    }
    const retryAfter = Number(res.headers.get('retry-after'));
    const wait = retryAfter > 0 ? retryAfter * 1000 : Math.min(60_000, 2000 * 2 ** (attempt - 1));
    pausedUntil = Math.max(pausedUntil, Date.now() + wait);
  }
}

async function serverId() {
  if (process.env.EXAROTON_SERVER_ID) return process.env.EXAROTON_SERVER_ID;
  const host = process.env.EXAROTON_SERVER_HOST ?? 'stebbias.exaroton.me';
  const match = (await call(''))?.find((s) => s.address === host);
  if (!match) throw new Error('Þjónninn fannst ekki á Exaroton-reikningnum');
  return match.id;
}

async function exists(id, path) {
  try {
    await call(`${id}/files/info/${encode(path)}`);
    return true;
  } catch (err) {
    if (err.status === 404) return false;
    throw err;
  }
}

/** Runs a console command on the server (it must be online). */
async function command(id, line) {
  await call(`${id}/command/`, { method: 'POST', json: { command: line } });
  console.log(`  /${line}`);
}

const encode = (path) => path.split('/').map(encodeURIComponent).join('/');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function pool(items, worker, width = PARALLEL) {
  let next = 0;
  const lanes = Array.from({ length: Math.min(width, items.length) }, async () => {
    while (next < items.length) await worker(items[next++]);
  });
  await Promise.all(lanes);
}

function loadEnv(file) {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!m || process.env[m[1]] !== undefined) continue;
    process.env[m[1]] = m[2].trim().replace(/^(['"])(.*)\1$/, '$2');
  }
}

/* ---------- the copies on the site ---------- */

/** Whether a file of a base map's folder stays on the server. The same as
    map:sync leaves behind for the main map: dot files, BlueMap's render
    bookkeeping, live player positions (they come from the server while it
    runs), player heads (/api/map-head), and anything not for the viewer. */
export function baseSkip(rel) {
  const name = rel.slice(rel.lastIndexOf('/') + 1);
  return name.startsWith('.')
    || name.endsWith('.php')
    || name.endsWith('.map')
    || name.endsWith('.part')
    || /^maps\/[^/]+\/live\/players\.json$/.test(rel)
    || /^maps\/[^/]+\/rstate\//.test(rel)
    || /^maps\/[^/]+\/assets\/playerheads\//.test(rel);
}

/** Whether the copy the manifest names still is the map: every file the same
    as when it went up, none come or gone. */
export function unchanged(previous, files, changed) {
  return Boolean(previous?.packs && previous.blob)
    && changed.size === 0
    && previous.files.length === files.length
    && previous.files.every((rel, i) => rel === files[i]);
}

/** The blobs under a base's folder that nothing reads any more: not in a
    manifest to keep, and older than the grace period. */
export function staleBlobs(blobs, keepManifests, now = Date.now(), grace = PACK_GRACE) {
  const keep = new Set(keepManifests.flatMap(blobsOf));
  return blobs.filter((b) => !keep.has(b.pathname) && now - new Date(b.uploadedAt).getTime() >= grace);
}

const manifestFile = (id) => join(MANIFESTS, `${id}.json`);
const localFile = (rel) => join(LOCAL, ...rel.split('/'));

function readJson(file, fallback) {
  try { return JSON.parse(readFileSync(file, 'utf8')); } catch { return fallback; }
}

/* Where BlueMap writes its web app: BLUEMAP_WEBROOT in .env.local if it is set,
   otherwise `webroot` in BlueMap's own webapp.conf, and bluemap/web if neither
   says (as map:sync finds it). */
async function findWebroot(id) {
  const clean = (p) => p.trim().replace(/^\.?\/+/, '').replace(/\/+$/, '');
  if (process.env.BLUEMAP_WEBROOT) return clean(process.env.BLUEMAP_WEBROOT);
  for (const conf of ['plugins/BlueMap/webapp.conf', 'config/bluemap/webapp.conf']) {
    let text;
    try {
      text = (await call(`${id}/files/data/${encode(conf)}`, { raw: true })).toString('utf8');
    } catch {
      continue;
    }
    const m = text.match(/^\s*webroot\s*[:=]\s*"?([^"\n#]+?)"?\s*$/m);
    if (m) return clean(m[1]);
  }
  return 'bluemap/web';
}

/* Every file of one base map's folder on the server, one folder level at a
   time, as maps/<id>/… paths. */
async function walkBase(id, webroot, base) {
  const found = [];
  let level = [`maps/${base}`];
  let read = 0;
  while (level.length) {
    const next = [];
    await pool(level, async (dir) => {
      const info = await call(`${id}/files/info/${encode(`${webroot}/${dir}`)}`);
      for (const kid of info?.children ?? []) {
        const rel = `${dir}/${kid.name}`;
        if (baseSkip(rel)) continue;
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

/* Fetches what changed since the last time into scripts/out/map-bases, drops
   what the server no longer has, and answers which files changed. */
async function fetchBase(id, webroot, base, found) {
  const total = found.length;
  const bytes = found.reduce((sum, f) => sum + (f.size ?? 0), 0);
  console.log(`  Sæki ${total} skrár (${mb(bytes)} MB)…`);
  const changed = new Set();
  let fetched = 0, done = 0;
  await pool(found, async ({ rel, size }) => {
    const file = localFile(rel);
    /* tiles and the texture atlas change size whenever they are redrawn;
       everything else is small and always fetched (as map:sync does) */
    const trustSize = /^maps\/[^/]+\/(tiles\/|textures\.json)/.test(rel);
    const current = trustSize && typeof size === 'number' && existsSync(file) && statSync(file).size === size;
    if (!current) {
      const body = await call(`${id}/files/data/${encode(`${webroot}/${rel}`)}`, { raw: true });
      const same = existsSync(file) && statSync(file).size === body.length && readFileSync(file).equals(body);
      if (!same) {
        mkdirSync(dirname(file), { recursive: true });
        writeFileSync(`${file}.part`, body);
        renameSync(`${file}.part`, file);
        changed.add(rel);
      }
      fetched++;
    }
    done++;
    if (done % 25 === 0 || done === total) process.stdout.write(`\r  ${done} / ${total}`);
  });
  process.stdout.write('\n');

  /* a file gone from the server shows in the file list, which is compared with the manifest's */
  const keep = new Set(found.map((f) => localFile(f.rel)));
  const removed = prune(join(LOCAL, 'maps', base), keep);
  console.log(`  Sóttar skrár: ${fetched} (${changed.size} breyttar), óbreyttar: ${total - fetched}, fjarlægðar: ${removed}.`);
  return changed;
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

/* Packs the base map's files, sends the packs to the store under a folder of
   its own, and answers where the store is and the packs. The store is the
   one the main map is in, public or private as it was made. */
async function sendBase(base, files, version, previous) {
  const mainBlob = readJson(join(ROOT, 'src', 'lib', 'bluemap-snapshot.json'), {}).blob;
  let access = process.env.BLOB_ACCESS === 'private' || previous.blob?.access === 'private' || mainBlob?.access === 'private' ? 'private' : 'public';
  let storeBase = null;
  const plan = planPacks(files, (rel) => statSync(localFile(rel)).size, version, PACK_BYTES, basePackDir(base));
  const bytes = plan.at.reduce((sum, [, , size]) => sum + size, 0);
  const count = plan.names.length;
  console.log(`  Sendi í Vercel Blob: ${files.length} skrár í ${count} ${count === 1 ? 'pakka' : 'pökkum'} (${mb(bytes)} MB)…`);

  for (let p = 0; p < count; p++) {
    const body = packBody(files, plan, p, (rel) => readFileSync(localFile(rel)));
    const options = { access, addRandomSuffix: false, allowOverwrite: true, cacheControlMaxAge: PACK_MAX_AGE, contentType: 'application/octet-stream', token: blobToken() };
    let result;
    try {
      result = await put(plan.names[p], body, options);
    } catch (err) {
      if (access === 'public' && /private/i.test(err?.message ?? '')) {
        access = 'private';
        result = await put(plan.names[p], body, { ...options, access });
      } else {
        throw err;
      }
    }
    if (p === 0) {
      storeBase = result.url.slice(0, result.url.indexOf(`/${BASES_DIR}/`));
      await checkRange(result.url, access, body);
    }
    console.log(`    ${p + 1} / ${count}  ${mb(body.length)} MB`);
  }
  if (!storeBase) throw new Error('Fann ekki slóð geymslunnar.');
  return { blob: { base: storeBase, access }, packs: plan };
}

/* The site reads each file out of its pack with a range request. Ask for the
   first bytes of the first pack the way the site will, before any manifest
   points at the packs. */
async function checkRange(url, access, body) {
  const want = body.subarray(0, Math.min(16, body.length));
  if (!want.length) return;
  const headers = { range: `bytes=0-${want.length - 1}` };
  const res = access === 'public'
    ? await fetch(url, { headers })
    : await get(url, { access, headers, token: blobToken() });
  const got = res && Buffer.from(await new Response(access === 'public' ? res.body : res.stream).arrayBuffer());
  const ranged = /^bytes 0-/.test(res?.headers.get('content-range') ?? '');
  if (!got || !ranged || !got.equals(want)) {
    throw new Error('Geymslan afhenti ekki hluta úr pakka eins og vefurinn þarf (range request). Kortið á vefnum er óbreytt; láttu vita af þessu.');
  }
}

/* The base's manifest in the last commit and on origin/main, freshly fetched,
   or null if git can't say what origin/main holds: then nothing is deleted. */
function committedManifests(base) {
  try {
    execFileSync('git', ['fetch', '--quiet', 'origin', 'main'], { cwd: ROOT, stdio: 'ignore', timeout: 60_000 });
  } catch {
    return null;
  }
  const out = [];
  for (const ref of ['HEAD', 'origin/main']) {
    try {
      const text = execFileSync('git', ['show', `${ref}:src/lib/map-bases/${base}.json`], {
        cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 64 * 1024 * 1024,
      });
      out.push(JSON.parse(text));
    } catch { /* no such file in that commit */ }
  }
  return out;
}

/* Deletes what is under this base's folder in the store and no manifest to
   keep reads. Only bluemap-bases/<base>/ is ever listed. */
async function dropStale(base, keepManifests) {
  const blobs = [];
  let cursor;
  do {
    const page = await list({ prefix: `${basePackDir(base)}/`, cursor, limit: 1000, token: blobToken() });
    blobs.push(...page.blobs);
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  const stale = staleBlobs(blobs, keepManifests);
  for (let i = 0; i < stale.length; i += 100) await del(stale.slice(i, i + 100).map((b) => b.url), { token: blobToken() });
  return stale.length;
}

async function uploadBase(id, webroot, base) {
  console.log(`\n${base.id} (${base.name}):`);
  try {
    await call(`${id}/files/info/${encode(`${webroot}/maps/${base.id}`)}`);
  } catch (err) {
    if (err.status !== 404) throw err;
    throw new Error(`Kortið ${base.id} er ekki í ${webroot}/maps á þjóninum. Er búið að teikna það (npm run map:bases -- --write, svo /bluemap reload)?`);
  }
  const found = await walkBase(id, webroot, base.id);
  if (!found.some((f) => f.rel === `maps/${base.id}/settings.json`) || !found.some((f) => f.rel.includes('/tiles/'))) {
    throw new Error(`Fann hvorki settings.json né reiti í ${webroot}/maps/${base.id}. Er teikningunni lokið?`);
  }
  const changed = await fetchBase(id, webroot, base.id, found);
  const files = found.map((f) => f.rel).sort();
  const previous = readJson(manifestFile(base.id), { syncedAt: null, files: [] });

  if (!FORCE && unchanged(previous, files, changed)) {
    console.log('  Óbreytt frá síðasta afriti; ekkert sent í geymsluna. (--force sendir það samt.)');
    return false;
  }

  const syncedAt = new Date().toISOString();
  const version = versionOf(syncedAt);
  const sent = await sendBase(base.id, files, version, previous);
  mkdirSync(MANIFESTS, { recursive: true });
  writeFileSync(manifestFile(base.id), manifestText({ syncedAt, version, files, ...sent }));

  /* the new copy, the one it replaces, and whatever the site may run now */
  const committed = committedManifests(base.id);
  if (committed) {
    const dropped = await dropStale(base.id, [{ files, ...sent }, previous, ...committed]);
    if (dropped) console.log(`  ${dropped} eldri pakkar fjarlægðir.`);
  } else {
    console.log('  Náði ekki í origin/main með git, svo engu var eytt úr geymslunni.');
  }
  console.log(`  Komið í geymsluna, útgáfa ${version}. Geymslan er ${sent.blob.access === 'public' ? 'opin' : 'lokuð'}.`);
  return true;
}

/* --prune: what the site no longer reads goes, now that the new copy is deployed. */
async function pruneBase(base) {
  const committed = committedManifests(base.id);
  if (!committed) throw new Error('Náði ekki í origin/main með git; engu eytt. Vefurinn gæti enn verið að lesa það sem þar er.');
  const local = readJson(manifestFile(base.id), { syncedAt: null, files: [] });
  const dropped = await dropStale(base.id, [local, ...committed]);
  console.log(`${base.id.padEnd(10)} ${dropped ? `${dropped} ${dropped === 1 ? 'pakki fjarlægður' : 'pakkar fjarlægðir'}` : 'ekkert að fjarlægja'}`);
}

function blobToken() {
  const t = process.env.BLOB_READ_WRITE_TOKEN;
  if (!t) throw new Error('BLOB_READ_WRITE_TOKEN vantar í .env.local: kortin fara í Vercel Blob. Lykillinn er í Vercel undir Storage.');
  return t;
}

/* What went wrong with the store, said so it can be acted on. */
function explain(err) {
  if (err instanceof BlobStoreSuspendedError) {
    return 'Vercel hefur sett Blob-geymsluna í bið (store suspended). Sjá Usage á vercel.com. Kortin á vefnum eru óbreytt.';
  }
  if (err instanceof BlobAccessError) {
    return 'Blob-geymslan hafnaði lyklinum. Athugaðu að BLOB_READ_WRITE_TOKEN í .env.local sé sá sami og í Vercel (Storage → geymslan → .env.local).';
  }
  if (err instanceof BlobStoreNotFoundError) {
    return 'Blob-geymslan sem BLOB_READ_WRITE_TOKEN vísar á er ekki til. Sæktu lykilinn aftur úr Storage á vercel.com.';
  }
  return err instanceof Error ? err.message : String(err);
}

function mb(bytes) {
  return (bytes / 1024 / 1024).toLocaleString('is-IS', { maximumFractionDigits: 1 });
}

/* ---------- main ---------- */

async function main() {
  loadEnv(join(ROOT, '.env.local'));

  const { bases } = JSON.parse(readFileSync(join(ROOT, 'src', 'lib', 'map-bases.json'), 'utf8'));
  const ids = new Set();
  for (const b of bases) {
    if (!/^[a-z0-9-]+$/.test(b.id)) throw new Error(`Auðkennið "${b.id}" má bara hafa a-z, 0-9 og -`);
    if (b.id === MAIN_MAP || ids.has(b.id)) throw new Error(`Auðkennið "${b.id}" er þegar notað`);
    ids.add(b.id);
  }
  /* the bases named after --upload or --prune, or all of them if none is */
  const pick = (names) => {
    const unknown = names.filter((n) => !ids.has(n));
    if (unknown.length) throw new Error(`Ekkert grunnkort heitir "${unknown.join('", "')}". Til eru: ${[...ids].join(', ')}`);
    return names.length ? bases.filter((b) => names.includes(b.id)) : bases;
  };

  if (PRUNE !== null) {
    const chosen = pick(PRUNE);
    blobToken();
    console.log('Fjarlægi pakka sem hvorki þetta afrit, síðasta commit né origin/main les:');
    for (const b of chosen) await pruneBase(b);
    return;
  }

  const chosen = UPLOAD !== null ? pick(UPLOAD) : null;
  if (chosen) blobToken();
  token = process.env.EXAROTON_API_KEY;
  if (!token) throw new Error('EXAROTON_API_KEY vantar í .env.local');
  const id = await serverId();

  if (chosen) {
    const server = await call(`${id}/`);
    if (server?.status !== 1) {
      console.warn('Þjónninn er ekki í gangi. Exaroton afhendir skrár hægt á meðan, svo þetta getur tekið langan tíma.');
    }
    const webroot = await findWebroot(id);
    const sent = [];
    for (const b of chosen) if (await uploadBase(id, webroot, b)) sent.push(b.id);
    if (pushedBack) console.log(`\nExaroton bað ${pushedBack === 1 ? 'einu sinni' : `${pushedBack} sinnum`} um hlé og afritunin hægði á sér á meðan.`);
    if (sent.length) {
      console.log(`\nTil að birta það: git add ${sent.map((b) => `src/lib/map-bases/${b}.json`).join(' ')}, commit og push.`);
      console.log(`Þegar vefurinn er kominn upp með því: npm run map:bases -- --prune ${sent.join(' ')}`);
    }
    return;
  }

  if (FREEZE || REFRESH !== null) {
    const server = await call(`${id}/`);
    if (server?.status !== 1) throw new Error('Þjónninn þarf að vera í gangi til að taka við skipunum.');
    if (FREEZE) {
      console.log('Fryst, kortin uppfærast ekki fyrr en beðið er um það:');
      for (const b of bases) await command(id, `bluemap freeze ${b.id}`);
      return;
    }
    if (!ids.has(REFRESH)) throw new Error(`Ekkert grunnkort heitir "${REFRESH ?? ''}". Til eru: ${[...ids].join(', ')}`);
    console.log(`Uppfæri ${REFRESH}:`);
    await command(id, `bluemap unfreeze ${REFRESH}`);
    await command(id, `bluemap update ${REFRESH}`);
    console.log(`\nÞegar teikningunni er lokið (/bluemap sýnir framvinduna): npm run map:bases -- --freeze, svo npm run map:bases -- --upload ${REFRESH}`);
    return;
  }

  const worldConf = (await call(`${id}/files/data/${encode(`${MAPS}/${MAIN_MAP}.conf`)}`, { raw: true })).toString('utf8');
  mkdirSync(OUT, { recursive: true });

  let written = 0;
  for (const [i, base] of bases.entries()) {
    const conf = baseConfig(worldConf, base, i + 1);
    writeFileSync(join(OUT, `${base.id}.conf`), conf);
    const path = `${MAPS}/${base.id}.conf`;
    const there = await exists(id, path);
    const size = base.radius * 2 + 1;
    let note;
    if (!WRITE) note = there ? 'er þegar á þjóninum' : 'yrði skrifuð';
    else if (there && !FORCE) note = 'er þegar á þjóninum, óbreytt (--force til að skrifa yfir)';
    else {
      await call(`${id}/files/data/${encode(path)}`, { method: 'PUT', body: conf });
      note = there ? 'skrifuð yfir' : 'skrifuð';
      written++;
    }
    console.log(`${base.id.padEnd(10)} ${base.name.padEnd(16)} ${size}x${size} kubbar  ${note}`);
  }

  console.log(`\nAfrit af öllum stillingum: ${OUT}`);
  if (!WRITE) {
    console.log('Ekkert skrifað. Keyrðu npm run map:bases -- --write til að setja þær á þjóninn.');
    return;
  }
  if (written) {
    console.log('\nNæst, í stjórnborði þjónsins: /bluemap reload');
    console.log('Þegar fyrstu teikningunni er lokið (/bluemap sýnir framvinduna): npm run map:bases -- --freeze');
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((err) => {
    console.error(`\nVilla: ${explain(err)}`);
    process.exit(1);
  });
}

// Copies the BlueMap web folder off the Minecraft server, so the map on the
// site still works while the server is stopped.
//
//   npm run map:sync            fetch what changed since the last copy, upload it
//   npm run map:sync -- --full  fetch everything again, upload everything
//   npm run map:sync -- --push  upload the local copy as it is, without exaroton
//   npm run map:sync -- --only-online  do nothing while the server is stopped
//                                (the scheduled sync, .github/workflows/map-sync.yml)
//
// The viewer (a few MB) goes to public/bluemap and travels with the site. The
// map data (hundreds of MB) goes to public/bluemap-data as a local copy for
// development, ignored by git, and from there to Vercel Blob under
// bluemap-data/packs, which is what the site serves it from: every deployment
// used to carry the whole copy as static files. It goes up as a few large
// packs, not file by file, since every upload counts against the store's
// monthly allowance (scripts/bluemap-pack.mjs), and only when the map changed.
// src/lib/bluemap-snapshot.json lists the map files, where each one sits in
// the packs, and names the store, so the /bluemap-data route can read a file
// back out. Live player positions are left out on purpose: while the server
// runs they come straight from it.
//
// Only what the viewer reads is copied: BlueMap's render bookkeeping
// (maps/*/rstate), maps the viewer doesn't list, player heads (they come from
// /api/map-head) and source maps stay on the server. The last step brands the
// viewer as JOÐ's map (scripts/bluemap-brand.mjs; npm run map:brand on its own).
//
// Reads EXAROTON_API_KEY (and EXAROTON_SERVER_ID and BLUEMAP_WEBROOT, if set)
// and BLOB_READ_WRITE_TOKEN from .env.local. BlueMap's web folder is found from
// its own webapp.conf unless BLUEMAP_WEBROOT names it. Run it while the server is online:
// exaroton hands out files very slowly once a server has stopped. exaroton also
// limits how fast the API may be called, so requests are spaced out and slow
// down further whenever it asks.

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { BlobAccessError, BlobStoreNotFoundError, BlobStoreSuspendedError, del, get, list, put } from '@vercel/blob';
import { brand, OWN_FILES, versionOf } from './bluemap-brand.mjs';
import { BLOB_DIR, blobsOf, manifestText, packBody, planPacks } from './bluemap-pack.mjs';

const ROOT     = process.cwd();
let REMOTE     = 'bluemap/web';   // BlueMap's web folder on the server; read from its webapp.conf in main()
const SHELL    = join(ROOT, 'public', 'bluemap');
const DATA     = join(ROOT, 'public', 'bluemap-data');
const MANIFEST = join(ROOT, 'src', 'lib', 'bluemap-snapshot.json');
const API      = 'https://api.exaroton.com/v1/servers';
const PARALLEL = 6;
const MIN_GAP  = 60;      // ms between request starts, at the fastest
const MAX_GAP  = 3000;    // ms between request starts, when exaroton keeps pushing back
const FULL     = process.argv.includes('--full');
const PUSH     = process.argv.includes('--push');
const ONLY_ONLINE = process.argv.includes('--only-online');
const PACK_MAX_AGE = 31536000;     // a pack is never overwritten, so the store's CDN may keep it for good
/* Cleanup leaves packs this young alone: they may be another sync's, uploaded
   but not yet pushed (the scheduled one and one from a PC, at the same time). */
const PACK_GRACE = 2 * 60 * 60 * 1000;

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
  fail(explain(err));
}

async function main() {
  if (PUSH) return push();

  const id = await serverId();
  const server = await call(`${id}/`);
  if (server?.status !== 1 && ONLY_ONLINE) {
    console.log('Þjónninn er ekki í gangi; ekkert sótt. Exaroton afhendir skrár of hægt á meðan.');
    return;
  }
  if (server?.status !== 1) {
    console.warn('Þjónninn er ekki í gangi. Exaroton afhendir skrár hægt á meðan, svo þetta getur tekið langan tíma.');
    console.warn('Mun fljótlegra er að afrita kortið meðan þjónninn er í gangi.\n');
  }

  REMOTE = await findWebroot(id);
  try {
    await call(`${id}/files/info/${encode(REMOTE)}`);
  } catch (err) {
    if (err?.status !== 404) throw err;
    fail(`Mappan ${REMOTE} er ekki á þjóninum. Opnaðu skráasafnið á exaroton.com og finndu möppuna sem BlueMap skrifar vefinn í `
      + `(hún geymir index.html og maps; slóðin er \`webroot\` í plugins/BlueMap/webapp.conf). `
      + `Settu hana svo í .env.local, til dæmis BLUEMAP_WEBROOT=bluemap/web. Sé engin slík mappa: ræstu þjóninn svo BlueMap skrifi vefinn, `
      + `og athugaðu að \`enabled: true\` sé í webapp.conf.`);
  }
  if (REMOTE !== 'bluemap/web') {
    console.log(`Vefur BlueMap er í ${REMOTE}. Settu BLUEMAP_WEBROOT=${REMOTE} líka í Vercel (Settings → Environment Variables), svo staða leikmanna finnist.\n`);
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
      /* the small files are fetched every time; only a real change counts */
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

  /* only now that every file is in place: drop whatever the server no longer has */
  const keep = new Set([...found.map((f) => target(f.rel)), ...OWN_FILES.map((rel) => join(SHELL, ...rel.split('/')))]);
  const removed = prune(SHELL, keep) + prune(DATA, keep);

  console.log(`\nKortið afritað. Sóttar skrár: ${fetched} (${changed.size} breyttar), óbreyttar: ${unchanged}, fjarlægðar: ${removed}.`);
  if (pushedBack) {
    const times = pushedBack === 1 ? 'einu sinni' : `${pushedBack} sinnum`;
    console.log(`Exaroton bað ${times} um hlé og afritunin hægði á sér á meðan.`);
  }

  const files = found.map((f) => f.rel).filter((rel) => rel.startsWith('maps/')).sort();
  /* The packs the last manifest names still hold the map if no map file was
     fetched this run and none came or went; then nothing goes up. --full sends
     it all again. */
  const previous = readManifest();
  const syncedAt = new Date().toISOString();
  const same = !FULL && previous.packs && previous.blob
    && ![...changed].some((rel) => rel.startsWith('maps/'))
    && previous.files.length === files.length && previous.files.every((rel, i) => rel === files[i]);
  if (same) {
    /* the copy keeps its date and version, so the site keeps its caches and
       there is nothing to commit */
    console.log('\nKortagögnin eru óbreytt frá síðasta afriti; ekkert sent í geymsluna og ekkert að birta.');
    writeManifest(previous.syncedAt, files, previous, false);
  } else {
    writeManifest(syncedAt, files, await upload(files, syncedAt, previous));
  }
}

/* --push: the local copy as it stands goes to the store, exaroton is not asked. */
async function push() {
  if (!existsSync(DATA)) fail(`Engin afrit í ${relative(ROOT, DATA)}. Keyrðu map:sync án --push til að sækja kortið fyrst.`);
  const files = walkLocal(DATA).filter((rel) => !skip(rel)).sort();
  if (!files.length) fail(`Engar skrár í ${relative(ROOT, DATA)}.`);
  const syncedAt = new Date().toISOString();
  writeManifest(syncedAt, files, await upload(files, syncedAt, readManifest()));
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

function writeManifest(syncedAt, files, { blob, packs }, changed = true) {
  writeFileSync(MANIFEST, manifestText({ syncedAt, version: versionOf(syncedAt), files, blob, packs }));
  brand(ROOT);
  if (changed) console.log(`\nTil að birta það: git add public/bluemap src/lib/bluemap-snapshot.json src/lib/bluemap-viewer.json, commit og push.`);
}

/* Packs the map files, sends the packs to the store under this sync's
   version, drops what no copy in use still reads, and answers with where the
   store is, whether it is public, and the packs. The store is either public or
   private, decided when it was made; a private one is read with the token
   through the /bluemap-data route. */
async function upload(files, syncedAt, previous) {
  let access = process.env.BLOB_ACCESS === 'private' || previous.blob?.access === 'private' ? 'private' : 'public';
  let base = null;
  const plan = planPacks(files, (rel) => statSync(target(rel)).size, versionOf(syncedAt));
  const bytes = plan.at.reduce((sum, [, , size]) => sum + size, 0);
  const count = plan.names.length;
  console.log(`\nSendi kortið í Vercel Blob: ${files.length} skrár í ${count} ${count === 1 ? 'pakka' : 'pökkum'} (${mb(bytes)} MB)…`);

  for (let p = 0; p < count; p++) {
    const body = packBody(files, plan, p, (rel) => readFileSync(target(rel)));
    const options = { access, addRandomSuffix: false, allowOverwrite: true, cacheControlMaxAge: PACK_MAX_AGE, contentType: 'application/octet-stream', token: blobToken };
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
    /* the store the packs went to, should the token now name another */
    if (p === 0) {
      base = result.url.slice(0, result.url.indexOf(`/${BLOB_DIR}/`));
      await checkRange(result.url, access, body);
    }
    console.log(`  ${p + 1} / ${count}  ${mb(body.length)} MB`);
  }
  if (!base) fail('Fann ekki slóð geymslunnar.');

  /* Keep what this copy reads, what the copy it replaces reads, and what the
     copy on GitHub reads (the one the site runs until this one is pushed and
     deployed), and anything uploaded in the last two hours; anything else in
     bluemap-data/ is from older copies. */
  const keep = new Set([...plan.names, ...blobsOf(previous), ...committedManifests().flatMap(blobsOf)]);
  const stale = [];
  let cursor;
  do {
    const page = await list({ prefix: `${BLOB_DIR}/`, cursor, limit: 1000, token: blobToken });
    for (const b of page.blobs) {
      const young = Date.now() - new Date(b.uploadedAt).getTime() < PACK_GRACE;
      if (!keep.has(b.pathname) && !young) stale.push(b.url);
    }
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  for (let i = 0; i < stale.length; i += 100) await del(stale.slice(i, i + 100), { token: blobToken });

  console.log(`Í geymslunni: ${count} ${count === 1 ? 'pakki' : 'pakkar'}${stale.length ? `, ${stale.length} eldri skrár fjarlægðar` : ''}. Geymslan er ${access === 'public' ? 'opin' : 'lokuð'}.`);
  return { blob: { base, access }, packs: plan };
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
    : await get(url, { access, headers, token: blobToken });
  const got = res && Buffer.from(await new Response(access === 'public' ? res.body : res.stream).arrayBuffer());
  const ranged = /^bytes 0-/.test(res?.headers.get('content-range') ?? '');
  if (!got || !ranged || !got.equals(want)) {
    fail('Geymslan afhenti ekki hluta úr pakka eins og vefurinn þarf (range request). Kortið á vefnum er óbreytt; láttu vita af þessu.');
  }
}

/* The manifest in the last commit and on origin/main, if git can say. */
function committedManifests() {
  const out = [];
  for (const ref of ['HEAD', 'origin/main']) {
    try {
      const text = execFileSync('git', ['show', `${ref}:src/lib/bluemap-snapshot.json`], {
        cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 64 * 1024 * 1024,
      });
      out.push(JSON.parse(text));
    } catch { /* no git, or no such commit */ }
  }
  return out;
}

/* What went wrong, said so it can be acted on. */
function explain(err) {
  if (err instanceof BlobStoreSuspendedError) {
    return 'Vercel hefur sett Blob-geymsluna í bið (store suspended), oftast af því að farið var yfir mánaðarkvóta Hobby. '
      + 'Sjá Usage á vercel.com. Kortið á vefnum er óbreytt og les af þjóninum á meðan.';
  }
  if (err instanceof BlobAccessError) {
    return 'Blob-geymslan hafnaði lyklinum. Athugaðu að BLOB_READ_WRITE_TOKEN í .env.local sé sá sami og í Vercel (Storage → geymslan → .env.local).';
  }
  if (err instanceof BlobStoreNotFoundError) {
    return 'Blob-geymslan sem BLOB_READ_WRITE_TOKEN vísar á er ekki til. Sæktu lykilinn aftur úr Storage á vercel.com.';
  }
  return err instanceof Error ? err.message : String(err);
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

/* Where BlueMap writes its web app: BLUEMAP_WEBROOT in .env.local if it is set,
   otherwise `webroot` in BlueMap's own webapp.conf (plugins/BlueMap on Paper and
   Spigot, config/bluemap on Fabric and Forge), and bluemap/web if neither says. */
async function findWebroot(id) {
  const clean = (p) => p.trim().replace(/^\.?\/+/, '').replace(/\/+$/, '');
  if (process.env.BLUEMAP_WEBROOT) return clean(process.env.BLUEMAP_WEBROOT);
  for (const conf of ['plugins/BlueMap/webapp.conf', 'config/bluemap/webapp.conf']) {
    let text;
    try {
      text = (await call(`${id}/files/data/${encode(conf)}`, true)).toString('utf8');
    } catch {
      continue;
    }
    const m = text.match(/^\s*webroot\s*[:=]\s*"?([^"\n#]+?)"?\s*$/m);
    if (m) return clean(m[1]);
  }
  return 'bluemap/web';
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
      const err = new Error(`exaroton svaraði ${res.status} fyrir ${decodeURIComponent(path)}`);
      err.status = res.status;
      throw err;
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

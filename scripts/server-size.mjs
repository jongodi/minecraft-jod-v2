// How much room the Minecraft server takes, folder by folder, read through the
// exaroton API (the panel doesn't show it). For finding what to trim when the
// server nears exaroton's maximum size.
//
//   npm run server:size
//
// Reads EXAROTON_API_KEY (and EXAROTON_SERVER_ID, if set) from .env.local.
// Only reads; nothing on the server is changed.

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const API = 'https://api.exaroton.com/v1/servers';
const PARALLEL = 6;
const GAP = 120;          // ms between request starts
const SHOW = 12;          // how many of the largest folders to list at each level

loadEnv(join(process.cwd(), '.env.local'));
const token = process.env.EXAROTON_API_KEY;
if (!token) fail('EXAROTON_API_KEY vantar í .env.local');

let nextStart = 0;

try {
  const id = await serverId();
  console.log('Les möppur þjónsins… (getur tekið nokkrar mínútur)');
  const root = await measureRoot(id);
  console.log(`\nAlls: ${human(root.size)} í ${root.files.toLocaleString('is-IS')} skrám\n`);
  report(root, 0);
  hints(root);
} catch (err) {
  fail(err instanceof Error ? err.message : String(err));
}

/* The whole server. Should the API not list its top folder, the folders a
   Minecraft server usually has are measured one by one instead. */
async function measureRoot(id) {
  try {
    return await measure(id, '');
  } catch (err) {
    if (!/svaraði 4\d\d/.test(err?.message ?? '')) throw err;
  }
  const usual = ['world', 'world_nether', 'world_the_end', 'plugins', 'bluemap', 'logs', 'crash-reports', 'cache',
    'libraries', 'versions', 'config', 'mods', 'backups'];
  const root = { name: '/', size: 0, files: 0, kids: [] };
  for (const name of usual) {
    try {
      const sub = await measure(id, name);
      root.kids.push(sub);
      root.size += sub.size;
      root.files += sub.files;
    } catch { /* not on this server */ }
  }
  console.log('(Efsta mappan var ekki lesanleg; hér eru venjulegu möppurnar, lausar skrár efst ekki taldar með.)');
  root.kids.sort((a, b) => b.size - a.size);
  return root;
}

/* A folder's size is the sum of everything under it. */
async function measure(id, dir) {
  const info = await call(`${id}/files/info/${encode(dir)}`);
  const node = { name: dir || '/', size: 0, files: 0, kids: [] };
  const subdirs = [];
  for (const kid of info?.children ?? []) {
    const rel = dir ? `${dir}/${kid.name}` : kid.name;
    if (kid.isDirectory) subdirs.push(rel);
    else { node.size += kid.size ?? 0; node.files++; }
  }
  await pool(subdirs, async (rel) => {
    const sub = await measure(id, rel);
    node.kids.push(sub);
    node.size += sub.size;
    node.files += sub.files;
  });
  node.kids.sort((a, b) => b.size - a.size);
  return node;
}

/* The largest folders, and inside the largest few, what makes them large. */
function report(node, depth) {
  for (const kid of node.kids.slice(0, SHOW)) {
    if (kid.size < 1024 * 1024) break;
    console.log(`${'  '.repeat(depth)}${human(kid.size).padStart(9)}  ${kid.name}`);
    if (depth < 2 && kid.size > node.size * 0.1) report(kid, depth + 1);
  }
}

/* What is usually safe to trim, if it is here and large. */
function hints(root) {
  const find = (path) => {
    let node = root;
    for (const part of path.split('/')) {
      node = node.kids.find((k) => k.name.split('/').pop().toLowerCase() === part.toLowerCase());
      if (!node) return null;
    }
    return node;
  };
  const known = [
    ['bluemap', 'Vefur og gögn BlueMap. Síðan geymir afritið sitt í Vercel Blob; minna svæði (render-mask) minnkar þetta.'],
    ['logs', 'Gamlar annálaskrár; má eyða þeim eldri.'],
    ['crash-reports', 'Hrunskýrslur; má eyða.'],
    ['cache', 'Skyndiminni Paper; verður til aftur.'],
    ['plugins/CoreProtect', 'Gagnagrunnur CoreProtect; stækkar endalaust nema gömlum færslum sé eytt (/co purge t:30d).'],
  ];
  const found = known.map(([path, why]) => [find(path), why]).filter(([n]) => n && n.size > 20 * 1024 * 1024);
  if (!found.length) return;
  console.log('\nOft má minnka:');
  for (const [n, why] of found) console.log(`  ${human(n.size).padStart(9)}  ${n.name}: ${why}`);
}

async function serverId() {
  if (process.env.EXAROTON_SERVER_ID) return process.env.EXAROTON_SERVER_ID;
  const host = process.env.EXAROTON_SERVER_HOST ?? 'stebbias.exaroton.me';
  const servers = await call('');
  const match = servers?.find((s) => s.address === host);
  if (!match) throw new Error(`Þjónninn ${host} fannst ekki á Exaroton-reikningnum`);
  return match.id;
}

async function call(path) {
  for (let attempt = 1; ; attempt++) {
    const wait = nextStart - Date.now();
    nextStart = Math.max(Date.now(), nextStart) + GAP;
    if (wait > 0) await sleep(wait);
    let res;
    try {
      res = await fetch(`${API}/${path}`, { headers: { Authorization: `Bearer ${token}` } });
    } catch (err) {
      if (attempt >= 5) throw err;
      await sleep(2000 * attempt);
      continue;
    }
    if (res.ok) return (await res.json()).data;
    await res.body?.cancel().catch(() => undefined);
    if ((res.status === 429 || res.status >= 500) && attempt < 8) {
      const after = Number(res.headers.get('retry-after'));
      await sleep(after > 0 ? after * 1000 : 2000 * attempt);
      continue;
    }
    throw new Error(`exaroton svaraði ${res.status} fyrir ${decodeURIComponent(path)}`);
  }
}

async function pool(items, worker) {
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(PARALLEL, items.length) }, async () => {
    while (next < items.length) await worker(items[next++]);
  }));
}

function human(bytes) {
  const gb = bytes / 1024 ** 3;
  return gb >= 1
    ? `${gb.toLocaleString('is-IS', { maximumFractionDigits: 2 })} GB`
    : `${(bytes / 1024 ** 2).toLocaleString('is-IS', { maximumFractionDigits: 0 })} MB`;
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

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function fail(message) {
  console.error(`\nVilla: ${message}`);
  process.exit(1);
}

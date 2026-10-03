// Writes a BlueMap map config on the server for every base in
// src/lib/map-bases.json: a small map of its own around the base, with the
// same look as the main map. Each one is a copy of the main map's config
// (plugins/BlueMap/maps/world.conf) with only its name, place in the list,
// start position and render mask changed.
//
//   npm run map:bases              show what would be written, write nothing
//   npm run map:bases -- --write   write the configs that aren't on the server yet
//   npm run map:bases -- --write --force   also overwrite ones that are
//   npm run map:bases -- --freeze          freeze every base map (no updates at all)
//   npm run map:bases -- --refresh <id>    unfreeze one base map and update it now
//
// Every config is also saved under scripts/out/bluemap-maps/ to look at.
//
// The base maps never update on their own: they are frozen, and only redrawn
// when asked. After --write: /bluemap reload in the console, let the first
// render finish (/bluemap shows progress), then --freeze. To redraw one later:
// --refresh <id>, wait for the render, then --freeze again. Freezing is kept
// over server restarts.
//
// These maps never reach the main map on the site: map:sync only copies the
// main map (MAIN_MAP in scripts/bluemap-brand.mjs).
//
// Reads EXAROTON_API_KEY (and EXAROTON_SERVER_ID, EXAROTON_SERVER_HOST if set)
// from .env.local.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MAIN_MAP } from './bluemap-brand.mjs';

const ROOT  = process.cwd();
const API   = 'https://api.exaroton.com/v1/servers';
const MAPS  = 'plugins/BlueMap/maps';
const OUT   = join(ROOT, 'scripts', 'out', 'bluemap-maps');
const WRITE = process.argv.includes('--write');
const FORCE = process.argv.includes('--force');
const FREEZE = process.argv.includes('--freeze');
const REFRESH = process.argv.includes('--refresh') ? process.argv[process.argv.indexOf('--refresh') + 1] : null;

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

async function call(path, { method = 'GET', body, json, raw = false } = {}) {
  const type = json ? 'application/json' : body ? 'application/octet-stream' : null;
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(`${API}/${path}`, {
      method,
      body: json ? JSON.stringify(json) : body,
      headers: { Authorization: `Bearer ${token}`, ...(type ? { 'Content-Type': type } : {}) },
    });
    if (res.ok) {
      if (method !== 'GET') return null;
      return raw ? Buffer.from(await res.arrayBuffer()) : (await res.json()).data;
    }
    await res.body?.cancel().catch(() => undefined);
    if (res.status === 429 && attempt < 8) {
      const wait = Number(res.headers.get('retry-after')) * 1000 || 2000 * attempt;
      await new Promise((r) => setTimeout(r, wait));
      continue;
    }
    const err = new Error(`exaroton svaraði ${res.status} fyrir ${method} ${decodeURIComponent(path)}`);
    err.status = res.status;
    throw err;
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

function loadEnv(file) {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!m || process.env[m[1]] !== undefined) continue;
    process.env[m[1]] = m[2].trim().replace(/^(['"])(.*)\1$/, '$2');
  }
}

/* ---------- main ---------- */

async function main() {
  loadEnv(join(ROOT, '.env.local'));
  token = process.env.EXAROTON_API_KEY;
  if (!token) throw new Error('EXAROTON_API_KEY vantar í .env.local');

  const { bases } = JSON.parse(readFileSync(join(ROOT, 'src', 'lib', 'map-bases.json'), 'utf8'));
  const ids = new Set();
  for (const b of bases) {
    if (!/^[a-z0-9-]+$/.test(b.id)) throw new Error(`Auðkennið "${b.id}" má bara hafa a-z, 0-9 og -`);
    if (b.id === MAIN_MAP || ids.has(b.id)) throw new Error(`Auðkennið "${b.id}" er þegar notað`);
    ids.add(b.id);
  }

  const id = await serverId();

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
    console.log('\nÞegar teikningunni er lokið (/bluemap sýnir framvinduna): npm run map:bases -- --freeze');
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
    console.error(`\nVilla: ${err instanceof Error ? err.message : err}`);
    process.exit(1);
  });
}

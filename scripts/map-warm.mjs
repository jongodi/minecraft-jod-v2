// Loads the whole map through the site once, so Vercel's CDN already holds
// every file when visitors ask for it. Meant for while the Blob store is
// paused and the site reads the map off the Minecraft server: the CDN then
// keeps each file for a month, so the map opens quickly even while the server
// is stopped. Run it while the server is on, once the deployment that should
// serve the map is live, and again after a new deployment.
//
//   npm run map:warm
//   npm run map:warm -- --site=https://minecraft-jod.vercel.app
//
// The site is jodcraft.world (play.jodcraft.world is the Minecraft server's
// address, not the website's).
//
// Vercel keeps the files at the edge location nearest to where this runs, the
// same one visitors from nearby reach. Only reads; nothing is changed.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const SITE = (process.argv.find((a) => a.startsWith('--site='))?.slice('--site='.length)
  || process.env.NEXT_PUBLIC_SITE_URL || 'https://jodcraft.world').replace(/\/+$/, '');
const PARALLEL = 4;
const TRIES = 6;

try {
  await main();
} catch (err) {
  fail(err instanceof Error ? err.message : String(err));
}

async function main() {
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(join(ROOT, 'src', 'lib', 'bluemap-snapshot.json'), 'utf8'));
  } catch {
    fail('Fann ekki src/lib/bluemap-snapshot.json. Keyrðu skipunina í möppu vefsins.');
  }
  const files = manifest.files ?? [];
  if (!files.length || !manifest.version) fail('Ekkert kortaafrit í src/lib/bluemap-snapshot.json.');

  /* the site has to run this copy, or the addresses warmed aren't the ones visitors ask for */
  const expected = `/bluemap-data/${manifest.version}/maps`;
  const settings = await fetch(`${SITE}/bluemap/settings.json`, { cache: 'no-store' })
    .then((res) => (res.ok ? res.json() : null))
    .catch(() => null);
  if (!settings) fail(`Náði ekki í ${SITE}/bluemap/settings.json. Er slóðin rétt?`);
  if (settings.mapDataRoot !== expected) {
    fail(`Vefurinn les kortið úr ${settings.mapDataRoot}, en afritið hér er ${expected}. `
      + 'Keyrðu git pull, eða bíddu eftir að nýjasta útgáfan fari í loftið, og reyndu aftur.');
  }

  const status = await fetch(`${SITE}/api/server-status`).then((res) => res.json()).catch(() => null);
  if (status?.online === false) {
    console.warn('Þjónninn er ekki í gangi, svo exaroton afhendir skrárnar hægt. Fljótlegra er að hita kortið meðan hann er í gangi.\n');
  }

  console.log(`Hita kortið á ${SITE}: ${files.length} skrár…`);
  const started = Date.now();
  const tally = { cached: 0, fetched: 0, missing: 0, failed: 0 };
  let bytes = 0;
  let done = 0;
  const failed = [];
  await pool(files, async (rel) => {
    const res = await warm(`${SITE}/bluemap-data/${manifest.version}/${rel}`);
    if (res.status === 200) {
      bytes += res.bytes;
      if (/^(HIT|STALE)$/i.test(res.cache ?? '')) tally.cached++;
      else tally.fetched++;
    } else if (res.status === 404) {
      tally.missing++;
    } else {
      tally.failed++;
      failed.push(`${res.status || 'ekkert svar'} ${rel}`);
    }
    done++;
    if (done % 10 === 0 || done === files.length) process.stdout.write(`\r  ${done} / ${files.length}`);
  });
  process.stdout.write('\n');

  const secs = Math.round((Date.now() - started) / 1000);
  console.log(`\nBúið á ${secs} s: ${tally.fetched} sóttar, ${tally.cached} voru þegar tilbúnar, ${mb(bytes)} MB alls.`);
  if (tally.missing) {
    const one = tally.missing === 1;
    console.log(`${tally.missing} ${one ? 'skrá er' : 'skrár eru'} ekki á þjóninum lengur (BlueMap hefur fjarlægt ${one ? 'hana' : 'þær'}); það er í lagi.`);
  }
  if (tally.failed) {
    console.log(`${tally.failed} ${tally.failed === 1 ? 'tókst' : 'tókust'} ekki, til dæmis ${failed.slice(0, 3).join(', ')}. Keyrðu skipunina aftur; þær sem tókust eru geymdar.`);
    process.exitCode = 1;
  }
}

/* One file, read to the end so the CDN keeps it. The site answers 503 with
   Retry-After when exaroton asks it to slow down, and 502 when exaroton didn't
   answer; both are tried again. */
async function warm(url) {
  for (let attempt = 1; ; attempt++) {
    let res;
    try {
      /* the site gives up on exaroton after 60 s, so a longer wait is a hang */
      res = await fetch(url, { headers: { 'accept-encoding': 'gzip, deflate, br' }, signal: AbortSignal.timeout(90_000) });
      const body = await res.arrayBuffer();
      if (![502, 503, 504].includes(res.status) || attempt >= TRIES) {
        return { status: res.status, cache: res.headers.get('x-vercel-cache'), bytes: body.byteLength };
      }
    } catch {
      if (attempt >= TRIES) return { status: 0, cache: null, bytes: 0 };
    }
    const after = Number(res?.headers.get('retry-after'));
    await sleep(after > 0 ? after * 1000 : 2000 * attempt);
  }
}

async function pool(items, worker) {
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(PARALLEL, items.length) }, async () => {
    while (next < items.length) await worker(items[next++]);
  }));
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

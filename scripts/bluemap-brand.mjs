// Makes the BlueMap viewer in public/bluemap JOÐ's map: every map:sync copies
// BlueMap's own index.html, settings.json and language list over it, so this
// runs as the last step of every sync and can be run on its own:
//
//   npm run map:brand
//
// It writes
//   public/bluemap/index.html     Icelandic, JOÐ's title, icon, link preview and
//                                 app manifest; the skin (public/bluemap-jod) in
//                                 <head> so BlueMap's own look never shows; the
//                                 map's first files preloaded; and the map's
//                                 facts (version, edges, start view, and the
//                                 detailed tiles kept from earlier copies) for
//                                 jod.js
//   public/bluemap/settings.json  the map read from /bluemap-data/<version>/maps,
//                                 the start view from data.ts, and view distances
//                                 sized to the world that is actually rendered
//   public/bluemap/lang/settings.conf  Icelandic first (lang/is.conf is ours and
//                                 map:sync leaves it alone)
//   src/lib/bluemap-viewer.json   the viewer's files, for the home page to fetch
//                                 ahead when a visitor reaches for the map, and
//                                 for the base maps' viewers (/kort/<id>, built
//                                 by baseViewer below) to load
//
// and adds `version` to src/lib/bluemap-snapshot.json if an older sync left it out.

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { manifestText } from './bluemap-pack.mjs';

/* Files under public/bluemap that are ours, not BlueMap's: map:sync keeps them
   when it prunes what the server no longer has. */
export const OWN_FILES = ['lang/is.conf'];

/* The main map, the only one this viewer shows. BlueMap also renders small
   maps of other bases (src/lib/map-bases.json, npm run map:bases); they are
   kept apart from this one, so map:sync doesn't copy them and the viewer's
   map list never names them. */
export const MAIN_MAP = 'world';

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || 'https://jodcraft.world').replace(/\/+$/, '');

/* The viewer's view distances, in blocks. The hires layer loads a square of
   floor(d / 32) tiles each way (160 → 11×11 tiles); jod.js holds phones to 110.
   The lowres layers load floor(d / 500) of their tiles each way, at each of the
   three levels, so 1050 asked for 75 tiles around a world a thousand blocks
   wide, most of which don't exist; 600 asks for 27. */
const VIEW = { hiresSliderDefault: 160, lowresSliderDefault: 600 };

/** The version the map is read under: changes with every sync, short enough for a path. */
export function versionOf(syncedAt) {
  const t = Date.parse(syncedAt ?? '');
  return Number.isFinite(t) ? `v${Math.floor(t / 1000).toString(36)}` : null;
}

/* tiles/0/x-2/3/3/z-2/9/5.prbm.gz → x -233, z -295 */
const HIRES = /^maps\/([^/]+)\/tiles\/0\/x(-?[\d/]+?)\/z(-?[\d/]+)\.prbm(?:\.gz)?$/;
const coord = (s) => Number(s.replace(/\//g, ''));

/** The edges of the rendered world, in blocks, from the hires tiles in the copy.
    `shape` is 'circle' when the tiles fill about π/4 of their box (a circle
    render mask), so the camera can be held inside the circle, not the box. */
export function boundsOf(files, map, tile = { size: 32, translate: 2 }) {
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity, count = 0;
  for (const f of files) {
    const m = HIRES.exec(f);
    if (!m || m[1] !== map) continue;
    const x = coord(m[2]), z = coord(m[3]);
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z);
    count++;
  }
  if (!count) return null;
  const box = (maxX - minX + 1) * (maxZ - minZ + 1);
  return {
    minX: minX * tile.size + tile.translate,
    maxX: (maxX + 1) * tile.size + tile.translate,
    minZ: minZ * tile.size + tile.translate,
    maxZ: (maxZ + 1) * tile.size + tile.translate,
    shape: count / box < 0.86 ? 'circle' : 'box',
  };
}

/* How far around the camera a phone draws in full detail (PHONE_HIRES in
   public/bluemap-jod/jod.js): 110 blocks, a 7×7 square of hires tiles. */
const PHONE_REACH = 110;
/* the least a heavy map is cut to: 48 blocks, a 3×3 square */
const LEAST_HIRES = 48;

/** The mean size, as stored, of the hires tiles a phone loads first: the
    square around (x, z) that PHONE_REACH reaches. Null when there are none. */
export function startTileBytes(files, sizeOf, map, x, z, reach = PHONE_REACH) {
  const each = Math.floor(reach / 32);
  const tx = Math.floor((x - 2) / 32), tz = Math.floor((z - 2) / 32);
  let count = 0, bytes = 0;
  for (const f of files) {
    const m = HIRES.exec(f);
    if (!m || m[1] !== map) continue;
    if (Math.abs(coord(m[2]) - tx) > each || Math.abs(coord(m[3]) - tz) > each) continue;
    count++;
    bytes += sizeOf(f);
  }
  return count ? bytes / count : null;
}

/** How many times heavier a map's first detailed tiles are than the main
    map's, to one decimal; 1 when not a quarter heavier or more, or unknown. */
export function heaviness(mapBytes, mainBytes) {
  if (!mapBytes || !mainBytes) return 1;
  const w = mapBytes / mainBytes;
  return w >= 1.25 ? Math.round(w * 10) / 10 : 1;
}

/** A hires view distance for a map `weight` times heavier than the main one:
    about the same weight of tiles in memory (the square's area goes down by
    the weight), never less than a 3×3 square. public/bluemap-jod/jod.js does
    the same for its quality choices. */
export function lighterHires(distance, weight) {
  return weight > 1 ? Math.max(LEAST_HIRES, Math.round(distance / Math.sqrt(weight))) : distance;
}

/** The map's detailed tiles that are the same as in an earlier copy, by the
    version they are read under: { [version]: 'x,z x,z …' }, tile coordinates
    as BlueMap names the tiles, sorted. `since` is the manifest's, parallel to
    `files`; tiles that are this copy's own `version` are left out, and so is
    everything else (the texture atlas, the low-detail layers), which the
    viewer reads under the copy's version. public/bluemap-jod/jod.js asks for
    each of these tiles under its own version. */
export function keptTiles(files, since, map, version) {
  if (!Array.isArray(since) || since.length !== files.length) return {};
  const byVersion = {};
  files.forEach((rel, i) => {
    const v = since[i];
    if (!v || v === version) return;
    const m = HIRES.exec(rel);
    if (!m || m[1] !== map) return;
    (byVersion[v] ??= []).push([coord(m[2]), coord(m[3])]);
  });
  const out = {};
  for (const v of Object.keys(byVersion).sort()) {
    out[v] = byVersion[v].sort((a, b) => a[0] - b[0] || a[1] - b[1]).map(([x, z]) => `${x},${z}`).join(' ');
  }
  return out;
}

/** The address the viewer reads a file of a copy under, below /bluemap-data:
    its own `since` version for a detailed tile the copy kept, otherwise the
    copy's version (keptTiles above, and jod.js). */
export function addressOf(rel, i, manifest) {
  const v = manifest.since?.length === manifest.files?.length ? manifest.since[i] : null;
  const kept = v && v !== manifest.version && HIRES.test(rel);
  return `${kept ? v : manifest.version}/${rel}`;
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

/** Reads the hashed script and stylesheet names out of BlueMap's (or an earlier branded) index.html. */
export function viewerAssets(html) {
  const script = html.match(/<script[^>]+type="module"[^>]+src="(\.\/assets\/[^"]+\.js)"/)?.[1];
  const style = html.match(/<link[^>]+rel="stylesheet"[^>]+href="(\.\/assets\/[^"]+\.css)"/)?.[1];
  const version = html.match(/<meta name="version" content="([^"]+)"/)?.[1] ?? '';
  if (!script || !style) throw new Error('Fann ekki skriftu og stílsnið BlueMap í public/bluemap/index.html.');
  return { script, style, version };
}

/** The viewer's page. `page` names another map's viewer (a base map's,
    /kort/<id>): its title, description and where the page comes from; left
    out, it is the main map's page at /bluemap. */
export function indexHtml({ script, style, version }, map, page = {}) {
  const title = page.title ? `${page.title} · JOÐcraft` : 'Heimurinn · JOÐcraft';
  const description = page.description ?? 'Heimasvæðið á JOÐ í þrívídd: dragðu, snúðu og stækkaðu. play.jodcraft.world';
  const origin = page.origin ?? 'Written by scripts/bluemap-brand.mjs (npm run map:brand). map:sync overwrites BlueMap\'s own copy of this file and brands it again.';
  const data = map.root ? `${map.root}/${map.id}` : null;
  const preload = [
    data && map.files.has(`maps/${map.id}/settings.json`) && `${data}/settings.json`,
    data && map.files.has(`maps/${map.id}/textures.json.gz`) && `${data}/textures.json.gz`,
  ].filter(Boolean);
  const facts = {
    map: map.id,
    version: map.version,
    syncedAt: map.syncedAt,
    bounds: map.bounds,
    start: map.start,
    /* the plank's title on a base map's viewer (public/bluemap-jod/jod.js) */
    ...(page.title ? { title: page.title } : {}),
    /* how many times heavier its detailed tiles are than the main map's, for jod.js to draw fewer */
    ...(map.weight > 1 ? { weight: map.weight } : {}),
    /* detailed tiles the same as in an earlier copy, read where browsers and the CDN still have them */
    ...(map.kept && Object.keys(map.kept).length ? { kept: map.kept } : {}),
  };
  return `<!DOCTYPE html>
<!-- ${esc(origin)} -->
<html lang="is">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="user-scalable=no, width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover">
        <title>${esc(title)}</title>
        <meta name="description" content="${esc(description)}">
        <meta name="version" content="${esc(version)}">
        <meta name="theme-color" content="#15100D">
        <meta name="robots" content="index,nofollow">
        <meta property="og:site_name" content="JOÐcraft">
        <meta property="og:title" content="${esc(title)}">
        <meta property="og:description" content="${esc(description)}">
        <meta property="og:type" content="website">
        <meta property="og:locale" content="is_IS">
        <meta property="og:image" content="${SITE}/map-poster.webp">
        <meta property="og:image:width" content="1920">
        <meta property="og:image:height" content="1080">
        <meta name="twitter:card" content="summary_large_image">
        <link rel="icon" href="/icon.svg" type="image/svg+xml">
        <link rel="icon" href="/icon-32.png" sizes="32x32" type="image/png">
        <link rel="apple-touch-icon" href="/apple-touch-icon.png">
        <link rel="manifest" href="/manifest.webmanifest">
${preload.map((href) => `        <link rel="preload" href="${esc(href)}" as="fetch" crossorigin>`).join('\n')}
        <link rel="preload" href="/bluemap-jod/fonts/silkscreen-latin-400-normal.woff2" as="font" type="font/woff2" crossorigin>
        <script>
            window.JOD_MAP = ${JSON.stringify(facts).replace(/</g, '\\u003c')};
            if (window.top !== window) document.documentElement.classList.add('jod-embed');
        </script>
        <script type="module" crossorigin src="${esc(script)}"></script>
        <link rel="stylesheet" crossorigin href="${esc(style)}">
        <link rel="stylesheet" href="/bluemap-jod/jod.css">
        <script defer src="/bluemap-jod/jod.js"></script>
    </head>
    <body>
        <noscript>
            <p class="jod-noscript">Þrívíddarkortið þarf JavaScript. <a href="/">Aftur á JOÐ</a></p>
        </noscript>
        <div id="map-container"></div>
        <div id="app"></div>
    </body>
</html>
`;
}

/** A base map's own viewer (/kort/<id>), built when the site is built
    (src/app/kort/[id]/[file]/route.ts): the main viewer's page and settings
    for one map, read from that base's copy. `shell` is the viewer's files as
    src/lib/bluemap-viewer.json names them, `settings` the main viewer's
    settings.json, `base` the base as src/lib/map-bases.json lists it and
    `copy` its manifest (src/lib/map-bases/<id>.json). The camera opens on the
    base's centre from the main map's distance and angle, and is held over
    what is rendered; players and the places' lanterns come live through
    /bluemap, as on the main map. `weight` says how many times heavier the
    base's first detailed tiles are than the main map's (heaviness above): a
    heavy map loads a smaller square of them from the very first frame, so a
    phone's tab isn't overwhelmed (Joðville's mountains are about nine times
    the main map's). */
/** Where a base map's viewer opens: the base's own view if it has one
    ("view" in src/lib/map-bases.json, x:y:z:distance:rotation:angle:tilt:ortho:mode,
    as BlueMap's address writes it after the #), otherwise its centre seen from
    the main map's distance and angle. */
export function openingView(base, settings) {
  const own = String(base.view ?? '').split(':');
  if (own.length === 9 && own.slice(0, 8).every((v) => Number.isFinite(Number(v)) && v !== '')) {
    return { x: Number(own[0]), z: Number(own[2]), start: `${base.id}:${own.join(':')}` };
  }
  const view = String(settings.startLocation ?? '').split(':').slice(4);
  const angle = view.length === 6 ? view.join(':') : '65:2.03:1.08:0:0:perspective';
  return { x: base.x, z: base.z, start: `${base.id}:${base.x}:${base.y}:${base.z}:${angle}` };
}

export function baseViewer(shell, settings, base, copy, weight = 1) {
  const root = `/bluemap-data/${copy.version}/maps`;
  /* map:x:y:z, then distance:rotation:angle:tilt:ortho:mode, as the main map opens */
  const { start } = openingView(base, settings);
  const r = base.radius;
  const bounds = boundsOf(copy.files, base.id)
    ?? { minX: base.x - r, maxX: base.x + r + 1, minZ: base.z - r, maxZ: base.z + r + 1, shape: 'box' };
  const html = indexHtml(shell, {
    id: base.id,
    root,
    version: copy.version,
    syncedAt: copy.syncedAt,
    files: new Set(copy.files),
    bounds,
    start,
    weight,
    kept: keptTiles(copy.files, copy.since, base.id, copy.version),
  }, {
    title: base.name,
    description: `${base.name} á JOÐ í þrívídd: dragðu, snúðu og stækkaðu. play.jodcraft.world`,
    origin: 'Built from scripts/bluemap-brand.mjs by src/app/kort/[id]/[file]/route.ts when the site is built.',
  });
  return {
    html,
    settings: {
      ...settings,
      maps: [base.id],
      mapDataRoot: root,
      liveDataRoot: '/bluemap/maps',
      startLocation: start,
      hiresSliderDefault: lighterHires(Number(settings.hiresSliderDefault) || 160, weight),
    },
  };
}

const LANG_SETTINGS = `// Written by scripts/bluemap-brand.mjs: the viewer speaks Icelandic, and English is one choice away.
{
  default: "is"
  useBrowserLanguage: false
  languages: [
    { locale: "is", name: "Íslenska" }
    { locale: "en", name: "English" }
  ]
}
`;

function readJson(file, fallback) {
  try { return JSON.parse(readFileSync(file, 'utf8')); } catch { return fallback; }
}

/** Brands public/bluemap in place. `root` is the repository. */
export function brand(root = process.cwd()) {
  const shell = join(root, 'public', 'bluemap');
  const manifestFile = join(root, 'src', 'lib', 'bluemap-snapshot.json');
  if (!existsSync(join(shell, 'index.html')) || !existsSync(join(shell, 'settings.json'))) {
    throw new Error('Skoðarinn er ekki í public/bluemap. Keyrðu npm run map:sync fyrst.');
  }

  const manifest = readJson(manifestFile, { syncedAt: null, files: [] });
  const version = manifest.version ?? versionOf(manifest.syncedAt);
  if (version && manifest.version !== version) {
    /* keep the key order map:sync writes, and everything else it wrote */
    const { syncedAt, version: _stale, ...rest } = manifest;
    writeFileSync(manifestFile, manifestText({ syncedAt, version, ...rest }));
  }

  const dataTs = readFileSync(join(root, 'src', 'components', 'badlands', 'data.ts'), 'utf8');
  const start = dataTs.match(/MAP_START_VIEW = '([^']+)'/)?.[1] ?? null;

  const settingsFile = join(shell, 'settings.json');
  const settings = readJson(settingsFile, null);
  if (!settings) throw new Error('public/bluemap/settings.json er ekki lesanlegt.');
  const mapId = MAIN_MAP;
  const hasCopy = manifest.files.length > 0;
  const root_ = hasCopy && version ? `/bluemap-data/${version}/maps` : settings.mapDataRoot;
  const clamp = (v, min, max) => Math.min(max ?? v, Math.max(min ?? v, v));
  const ours = new Set(['/bluemap-jod/jod.js', '/bluemap-jod/jod.css']);
  const next = {
    ...settings,
    maps: [mapId],
    mapDataRoot: root_,
    ...(start ? { startLocation: start } : {}),
    hiresSliderDefault: clamp(VIEW.hiresSliderDefault, settings.hiresSliderMin, settings.hiresSliderMax),
    lowresSliderDefault: clamp(VIEW.lowresSliderDefault, settings.lowresSliderMin, settings.lowresSliderMax),
    /* the skin is linked from index.html, so it is in place before the first paint */
    scripts: (settings.scripts ?? []).filter((s) => !ours.has(s)),
    styles: (settings.styles ?? []).filter((s) => !ours.has(s)),
  };
  writeFileSync(settingsFile, JSON.stringify(next));

  const html = readFileSync(join(shell, 'index.html'), 'utf8');
  writeFileSync(join(shell, 'index.html'), indexHtml(viewerAssets(html), {
    id: mapId,
    root: root_,
    version,
    syncedAt: manifest.syncedAt,
    files: new Set(manifest.files),
    bounds: boundsOf(manifest.files, mapId),
    start,
    kept: hasCopy && version ? keptTiles(manifest.files, manifest.since, mapId, version) : {},
  }));

  /* what the home page fetches ahead when a visitor reaches for the lantern,
     and the viewer's own files, which the base maps' viewers (/kort/<id>) share */
  const assets = viewerAssets(readFileSync(join(shell, 'index.html'), 'utf8'));
  const data = hasCopy && version ? `${root_}/${mapId}` : null;
  writeFileSync(join(root, 'src', 'lib', 'bluemap-viewer.json'), JSON.stringify({
    shell: {
      script: assets.script.replace(/^\.\//, '/bluemap/'),
      style: assets.style.replace(/^\.\//, '/bluemap/'),
      version: assets.version,
    },
    warm: [
      assets.script.replace(/^\.\//, '/bluemap/'),
      assets.style.replace(/^\.\//, '/bluemap/'),
      '/bluemap-jod/jod.css',
      '/bluemap-jod/jod.js',
      ...(data ? [`${data}/settings.json`, `${data}/textures.json.gz`].filter((f) => manifest.files.includes(f.replace(`${root_}/`, 'maps/'))) : []),
    ],
  }, null, 2) + '\n');

  writeFileSync(join(shell, 'lang', 'settings.conf'), LANG_SETTINGS);
  if (!existsSync(join(shell, 'lang', 'is.conf'))) {
    console.warn('Aðvörun: public/bluemap/lang/is.conf vantar; skoðarinn talar ensku þar til hún er komin aftur.');
  }
  console.log(`Skoðarinn merktur JOÐ${version ? `, kortið lesið sem ${root_}` : ''}.`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    brand();
  } catch (err) {
    console.error(`\nVilla: ${err instanceof Error ? err.message : err}`);
    process.exit(1);
  }
}

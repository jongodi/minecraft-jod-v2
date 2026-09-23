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
//                                 facts (version, edges, start view) for jod.js
//   public/bluemap/settings.json  the map read from /bluemap-data/<version>/maps,
//                                 the start view from data.ts, and view distances
//                                 sized to the world that is actually rendered
//   public/bluemap/lang/settings.conf  Icelandic first (lang/is.conf is ours and
//                                 map:sync leaves it alone)
//   src/lib/bluemap-viewer.json   the viewer's files, for the home page to fetch
//                                 ahead when a visitor reaches for the map
//
// and adds `version` to src/lib/bluemap-snapshot.json if an older sync left it out.

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { manifestText } from './bluemap-pack.mjs';

/* Files under public/bluemap that are ours, not BlueMap's: map:sync keeps them
   when it prunes what the server no longer has. */
export const OWN_FILES = ['lang/is.conf'];

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || 'https://jodcraft.world').replace(/\/+$/, '');

/* The viewer's view distances, in blocks. The hires layer loads a square of
   floor(d / 32) tiles each way (150 → 9×9 tiles); jod.js narrows it on phones.
   The lowres layers load floor(d / 500) of their tiles each way, at each of the
   three levels, so 1050 asked for 75 tiles around a world a thousand blocks
   wide, most of which don't exist; 600 asks for 27. */
const VIEW = { hiresSliderDefault: 150, lowresSliderDefault: 600 };

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

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

/** Reads the hashed script and stylesheet names out of BlueMap's (or an earlier branded) index.html. */
export function viewerAssets(html) {
  const script = html.match(/<script[^>]+type="module"[^>]+src="(\.\/assets\/[^"]+\.js)"/)?.[1];
  const style = html.match(/<link[^>]+rel="stylesheet"[^>]+href="(\.\/assets\/[^"]+\.css)"/)?.[1];
  const version = html.match(/<meta name="version" content="([^"]+)"/)?.[1] ?? '';
  if (!script || !style) throw new Error('Fann ekki skriftu og stílsnið BlueMap í public/bluemap/index.html.');
  return { script, style, version };
}

export function indexHtml({ script, style, version }, map) {
  const title = 'Heimurinn · JOÐ';
  const description = 'Heimasvæðið á JOÐ í þrívídd: dragðu, snúðu og stækkaðu. play.jodcraft.world';
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
  };
  return `<!DOCTYPE html>
<!-- Written by scripts/bluemap-brand.mjs (npm run map:brand). map:sync overwrites BlueMap's own copy of this file and brands it again. -->
<html lang="is">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="user-scalable=no, width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover">
        <title>${esc(title)}</title>
        <meta name="description" content="${esc(description)}">
        <meta name="version" content="${esc(version)}">
        <meta name="theme-color" content="#15100D">
        <meta name="robots" content="index,nofollow">
        <meta property="og:site_name" content="JOÐ">
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
  const mapId = (Array.isArray(settings.maps) && settings.maps[0]) || 'world';
  const hasCopy = manifest.files.length > 0;
  const root_ = hasCopy && version ? `/bluemap-data/${version}/maps` : settings.mapDataRoot;
  const clamp = (v, min, max) => Math.min(max ?? v, Math.max(min ?? v, v));
  const ours = new Set(['/bluemap-jod/jod.js', '/bluemap-jod/jod.css']);
  const next = {
    ...settings,
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
  }));

  /* what the home page fetches ahead when a visitor reaches for the lantern */
  const assets = viewerAssets(readFileSync(join(shell, 'index.html'), 'utf8'));
  const data = hasCopy && version ? `${root_}/${mapId}` : null;
  writeFileSync(join(root, 'src', 'lib', 'bluemap-viewer.json'), JSON.stringify({
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

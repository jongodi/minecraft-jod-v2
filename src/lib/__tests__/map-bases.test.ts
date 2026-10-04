import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { get } from '@vercel/blob';
import { GET as data } from '../../app/bluemap-data/[...path]/route';
import { GET as live } from '../../app/bluemap/[[...path]]/route';
import { GET as kort, generateStaticParams } from '../../app/kort/[id]/[file]/route';
import { baseCopyFor, uploadedBases } from '@/lib/bluemap-bases';
import { baseAt } from '@/lib/base-links';
import { BASES_DIR, BLOB_DIR, basePackDir, planPacks } from '../../../scripts/bluemap-pack.mjs';
import { baseViewer, heaviness, indexHtml, lighterHires, startTileBytes, viewerAssets } from '../../../scripts/bluemap-brand.mjs';
import { baseSkip, compareWithCopy, staleBlobs, took } from '../../../scripts/map-bases.mjs';
import { baseConfig, getKey } from '../../../scripts/bluemap-conf.mjs';
import config from '@/lib/map-bases.json';

vi.mock('@vercel/blob', async (original) => ({ ...(await original<typeof import('@vercel/blob')>()), get: vi.fn() }));
vi.mock('@/lib/map', () => ({ readMap: async () => null }));

/* the main map, packed, and one base map (Joðville) with a copy of its own;
   the other bases have not been uploaded */
vi.mock('@/lib/bluemap-snapshot.json', () => ({
  default: {
    syncedAt: '2026-09-22T21:00:00.000Z',
    version: 'vmain',
    files: ['maps/world/settings.json'],
    blob: { base: 'https://store.private.blob.vercel-storage.com', access: 'private' },
    packs: { names: ['bluemap-data/packs/vmain-0.pack'], at: [[0, 0, 11]] },
  },
}));
vi.mock('@/lib/map-bases/jodville.json', () => ({
  default: {
    syncedAt: '2026-10-03T12:00:00.000Z',
    version: 'vbase',
    files: ['maps/jodville/live/markers.json', 'maps/jodville/settings.json', 'maps/jodville/tiles/0/x4/z-3.prbm.gz'],
    blob: { base: 'https://store.private.blob.vercel-storage.com', access: 'private' },
    packs: { names: ['bluemap-bases/jodville/vbase-0.pack'], at: [[0, 0, 2], [0, 2, 10], [0, 12, 5]] },
  },
}));

/* the bases not uploaded in these tests, whatever the real manifests hold */
vi.mock('@/lib/map-bases/faraway.json', () => ({ default: { syncedAt: null, files: [] } }));
vi.mock('@/lib/map-bases/bustadur.json', () => ({ default: { syncedAt: null, files: [] } }));
vi.mock('@/lib/map-bases/shroomy.json', () => ({ default: { syncedAt: null, files: [] } }));

const BASE_PACK = Buffer.from('{}{"base":1}\x1f\x8b\x08\x00\x07');
const MAIN_PACK = Buffer.from('{"main":12}');

const askData = (version: string, path: string) => data(new Request(`https://jod.test/bluemap-data/${version}/${path}`), {
  params: Promise.resolve({ path: [version, ...path.split('/')] }),
});

/* the store answers a range of whichever pack is asked for */
function store(name: string, opts?: Parameters<typeof get>[1]) {
  const pack = name.startsWith('bluemap-bases/') ? BASE_PACK : MAIN_PACK;
  const [from, to] = String((opts?.headers as Record<string, string>).range).replace('bytes=', '').split('-').map(Number);
  return {
    statusCode: 200,
    stream: new Response(pack.subarray(from, to + 1)).body!,
    headers: new Headers({ 'content-range': `bytes ${from}-${to}/${pack.length}` }),
  } as unknown as Awaited<ReturnType<typeof get>>;
}

describe('the base maps\' copies', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubEnv('BLOB_READ_WRITE_TOKEN', 'vercel_blob_rw_test');
    vi.stubEnv('EXAROTON_API_KEY', 'exaroton-test');
    vi.stubEnv('EXAROTON_SERVER_ID', 'srv');
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.mocked(get).mockImplementation(async (name, opts) => store(String(name), opts));
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    fetchMock.mockReset();
    vi.mocked(get).mockReset();
  });

  it('reads a base map\'s file out of its own pack, kept for a year under its own version', async () => {
    const res = await askData('vbase', 'maps/jodville/settings.json');
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('{"base":1}');
    expect(res.headers.get('Cache-Control')).toContain('immutable');
    expect(get).toHaveBeenCalledWith('bluemap-bases/jodville/vbase-0.pack', expect.objectContaining({ headers: { range: 'bytes=2-11' } }));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('keeps the main map on its own copy and version', async () => {
    const res = await askData('vmain', 'maps/world/settings.json');
    expect(await res.text()).toBe('{"main":12}');
    expect(res.headers.get('Cache-Control')).toContain('immutable');
    expect(get).toHaveBeenCalledWith('bluemap-data/packs/vmain-0.pack', expect.anything());

    /* the main map's version is not the base's: found, but not kept for good */
    const other = await askData('vmain', 'maps/jodville/settings.json');
    expect(other.status).toBe(200);
    expect(other.headers.get('Cache-Control')).not.toContain('immutable');
  });

  it('knows what a base copy does not hold without asking the store', async () => {
    const res = await askData('vbase', 'maps/jodville/tiles/0/x9/z9.prbm.gz');
    expect(res.status).toBe(404);
    expect(res.headers.get('Cache-Control')).toContain('immutable');
    /* a base map's file is never looked for in the main map's copy, nor the other way round */
    expect((await askData('vmain', 'maps/world/tiles/0/x4/z-3.prbm.gz')).status).toBe(404);
    expect(get).not.toHaveBeenCalled();
  });

  it('answers a base that hasn\'t been uploaded with a brief 404, asking nobody', async () => {
    const res = await askData('vbase', 'maps/faraway/settings.json');
    expect(res.status).toBe(404);
    expect(res.headers.get('Cache-Control')).toBe('public, max-age=60, s-maxage=120');
    expect(get).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('reads a base map off the server when the store refuses', async () => {
    vi.mocked(get).mockRejectedValue(new Error('store suspended'));
    fetchMock.mockResolvedValue(new Response('{"base":1}'));
    const res = await askData('vbase', 'maps/jodville/settings.json');
    expect(await res.text()).toBe('{"base":1}');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.exaroton.com/v1/servers/srv/files/data/bluemap/web/maps/jodville/settings.json',
      expect.anything(),
    );
  });

  it('gives a base map its own marker sets while the server is stopped', async () => {
    vi.stubEnv('EXAROTON_API_KEY', '');
    const res = await live(new Request('https://jod.test/bluemap/maps/jodville/live/markers.json'), {
      params: Promise.resolve({ path: ['maps', 'jodville', 'live', 'markers.json'] }),
    });
    expect(await res.json()).toEqual({});
    expect(get).toHaveBeenCalledWith('bluemap-bases/jodville/vbase-0.pack', expect.objectContaining({ headers: { range: 'bytes=0-1' } }));
  });

  it('finds a base copy by the map named in the path', () => {
    expect(baseCopyFor('maps/jodville/settings.json')?.version).toBe('vbase');
    expect(baseCopyFor('maps/world/settings.json')).toBeNull();
    expect(baseCopyFor('settings.json')).toBeNull();
    expect(uploadedBases().map((b) => b.id)).toEqual(['jodville']);
  });
});

describe('a base map\'s viewer', () => {
  const shell = { script: '/bluemap/assets/index-A.js', style: '/bluemap/assets/index-B.css', version: '5.27' };
  const settings = {
    version: '5.27', maps: ['world'], mapDataRoot: '/bluemap-data/vmain/maps', liveDataRoot: 'maps',
    startLocation: 'world:-6890:57:-8919:65:2.03:1.08:0:0:perspective', hiresSliderDefault: 160,
  };
  const base = { id: 'jodville', name: 'Joðville', x: 136, y: 128, z: -84, radius: 550 };
  const copy = { version: 'vbase', syncedAt: '2026-10-03T12:00:00.000Z', files: ['maps/jodville/textures.json.gz', 'maps/jodville/tiles/0/x4/z-3.prbm.gz'] };

  it('lists only its own map, read from its own copy, opening on the base the way the main map opens', () => {
    const { settings: s } = baseViewer(shell, settings, base, copy);
    expect(s.maps).toEqual(['jodville']);
    expect(s.mapDataRoot).toBe('/bluemap-data/vbase/maps');
    expect(s.liveDataRoot).toBe('/bluemap/maps');
    expect(s.startLocation).toBe('jodville:136:128:-84:65:2.03:1.08:0:0:perspective');
    expect(s.hiresSliderDefault).toBe(160);
  });

  it('wears the main viewer\'s clothes, with the base\'s name and the edges of its own map', () => {
    const { html } = baseViewer(shell, settings, base, copy);
    expect(html).toContain('<title>Joðville · JOÐ</title>');
    expect(html).toContain('src="/bluemap/assets/index-A.js"');
    expect(html).toContain('href="/bluemap-jod/jod.css"');
    expect(html).toContain('href="/bluemap-data/vbase/maps/jodville/textures.json.gz" as="fetch"');
    const facts = JSON.parse(/window\.JOD_MAP = (\{.*\});/.exec(html)![1]);
    expect(facts).toMatchObject({ map: 'jodville', version: 'vbase', title: 'Joðville', start: 'jodville:136:128:-84:65:2.03:1.08:0:0:perspective' });
    expect(facts.bounds).toEqual({ minX: 130, maxX: 162, minZ: -94, maxZ: -62, shape: 'box' });
  });

  it('falls back to the rendered square when the copy has no detailed tiles', () => {
    const { html } = baseViewer(shell, settings, base, { ...copy, files: [] });
    const facts = JSON.parse(/window\.JOD_MAP = (\{.*\});/.exec(html)![1]);
    expect(facts.bounds).toEqual({ minX: -414, maxX: 687, minZ: -634, maxZ: 467, shape: 'box' });
  });

  it('loads fewer detailed tiles of a map much heavier than the main one, from the first frame', () => {
    const heavy = baseViewer(shell, settings, base, copy, 9);
    /* 160 / 3 → 53 blocks, a 3×3 square of tiles instead of 11×11 */
    expect(heavy.settings.hiresSliderDefault).toBe(53);
    expect(JSON.parse(/window\.JOD_MAP = (\{.*\});/.exec(heavy.html)![1]).weight).toBe(9);
    /* one as heavy as the main map is left as it is */
    const plain = baseViewer(shell, settings, base, copy);
    expect(plain.settings.hiresSliderDefault).toBe(160);
    expect(JSON.parse(/window\.JOD_MAP = (\{.*\});/.exec(plain.html)![1])).not.toHaveProperty('weight');
  });

  it('leaves the main viewer\'s page as it was', () => {
    const assets = viewerAssets('<meta name="version" content="5.27"><script type="module" crossorigin src="./assets/index-A.js"></script><link rel="stylesheet" crossorigin href="./assets/index-B.css">');
    const html = indexHtml(assets, { id: 'world', root: '/bluemap-data/vx/maps', version: 'vx', syncedAt: null, files: new Set(), bounds: null, start: null });
    expect(html).toContain('<title>Heimurinn · JOÐ</title>');
    expect(html).toContain("<!-- Written by scripts/bluemap-brand.mjs (npm run map:brand). map:sync overwrites BlueMap's own copy of this file and brands it again. -->");
    expect(html).not.toContain('"title"');
  });

  it('is built only for the bases that have been uploaded', async () => {
    expect(generateStaticParams()).toEqual([
      { id: 'jodville', file: 'index.html' },
      { id: 'jodville', file: 'settings.json' },
    ]);
    const ask = (id: string, file: string) => kort(new Request(`https://jod.test/kort/${id}/${file}`), { params: Promise.resolve({ id, file }) });

    const page = await ask('jodville', 'index.html');
    expect(page.headers.get('Content-Type')).toBe('text/html; charset=utf-8');
    expect(await page.text()).toContain('<title>Joðville · JOÐ</title>');

    const json = await ask('jodville', 'settings.json');
    expect(json.headers.get('Content-Type')).toBe('application/json; charset=utf-8');
    expect(await json.json()).toMatchObject({ maps: ['jodville'], mapDataRoot: '/bluemap-data/vbase/maps', liveDataRoot: '/bluemap/maps' });

    expect((await ask('faraway', 'index.html')).status).toBe(404);
    expect((await ask('world', 'index.html')).status).toBe(404);
    expect((await ask('jodville', 'other.json')).status).toBe(404);
  });
});

describe('uploading the base maps', () => {
  it('packs each base under a folder of its own, outside the main map\'s', () => {
    const plan = planPacks(['maps/jodville/a', 'maps/jodville/b'], () => 4, 'vbase', 6, basePackDir('jodville'));
    expect(plan.names).toEqual(['bluemap-bases/jodville/vbase-0.pack', 'bluemap-bases/jodville/vbase-1.pack']);
    /* map:sync lists and cleans up only bluemap-data/, so it never sees a base map's packs */
    expect(`${BASES_DIR}/`.startsWith(`${BLOB_DIR}/`)).toBe(false);
    expect(`${BLOB_DIR}/`.startsWith(`${BASES_DIR}/`)).toBe(false);
    /* and the main map's packs are where they always were */
    expect(planPacks(['maps/world/a'], () => 1, 'vx').names).toEqual(['bluemap-data/packs/vx-0.pack']);
  });

  it('leaves on the server what map:sync leaves there', () => {
    expect(baseSkip('maps/jodville/live/players.json')).toBe(true);
    expect(baseSkip('maps/jodville/rstate/x.json')).toBe(true);
    expect(baseSkip('maps/jodville/assets/playerheads/abc.png')).toBe(true);
    expect(baseSkip('maps/jodville/.hidden')).toBe(true);
    expect(baseSkip('maps/jodville/live/markers.json')).toBe(false);
    expect(baseSkip('maps/jodville/tiles/0/x1/z2.prbm.gz')).toBe(false);
    expect(baseSkip('maps/jodville/textures.json.gz')).toBe(false);
  });

  it('tells from the manifest alone whether the server\'s map is the copy the site has', () => {
    const previous = {
      files: ['maps/j/live/markers.json', 'maps/j/settings.json', 'maps/j/textures.json.gz', 'maps/j/tiles/0/x1/z1.prbm.gz'],
      blob: { base: 'x', access: 'private' },
      packs: { names: ['p'], at: [[0, 0, 2], [0, 2, 9], [0, 11, 500], [0, 511, 300]] },
    };
    const found = [
      { rel: 'maps/j/tiles/0/x1/z1.prbm.gz', size: 300 },
      { rel: 'maps/j/settings.json', size: 9 },
      { rel: 'maps/j/textures.json.gz', size: 500 },
      { rel: 'maps/j/live/markers.json', size: 2 },
    ];
    /* tiles and the atlas by size, the small files still to be compared byte for byte, live data not at all */
    expect(compareWithCopy(found, previous)).toEqual({ same: true, check: ['maps/j/settings.json'] });
    expect(compareWithCopy(found.map((f) => (f.rel.includes('live') ? { ...f, size: 40 } : f)), previous).same).toBe(true);
    /* a redrawn tile */
    expect(compareWithCopy(found.map((f) => (f.rel.includes('tiles') ? { ...f, size: 301 } : f)), previous).same).toBe(false);
    /* a tile come or gone */
    expect(compareWithCopy([...found, { rel: 'maps/j/tiles/0/x2/z1.prbm.gz', size: 1 }], previous).same).toBe(false);
    expect(compareWithCopy(found.slice(1), previous).same).toBe(false);
    /* nothing uploaded yet */
    expect(compareWithCopy(found, { syncedAt: null, files: [] }).same).toBe(false);
  });

  it('drops only packs no copy in use reads, and none uploaded in the last two hours', () => {
    const now = Date.parse('2026-10-03T12:00:00Z');
    const old = '2026-10-01T00:00:00Z';
    const blobs = [
      { pathname: 'bluemap-bases/jodville/vnew-0.pack', uploadedAt: old, url: 'u1' },
      { pathname: 'bluemap-bases/jodville/vlive-0.pack', uploadedAt: old, url: 'u2' },
      { pathname: 'bluemap-bases/jodville/vold-0.pack', uploadedAt: old, url: 'u3' },
      { pathname: 'bluemap-bases/jodville/vother-0.pack', uploadedAt: '2026-10-03T11:30:00Z', url: 'u4' },
    ];
    const manifest = (name: string) => ({ files: ['f'], blob: { base: 'x', access: 'private' }, packs: { names: [name], at: [] } });
    const stale = staleBlobs(blobs, [manifest('bluemap-bases/jodville/vnew-0.pack'), manifest('bluemap-bases/jodville/vlive-0.pack')], now);
    expect(stale.map((b: { url: string }) => b.url)).toEqual(['u3']);
  });

  it('has a manifest wired up for every base', () => {
    const source = readFileSync(join(process.cwd(), 'src', 'lib', 'bluemap-bases.ts'), 'utf8');
    for (const b of config.bases) {
      expect(source).toContain(`@/lib/map-bases/${b.id}.json`);
      expect(() => JSON.parse(readFileSync(join(process.cwd(), 'src', 'lib', 'map-bases', `${b.id}.json`), 'utf8'))).not.toThrow();
    }
  });
});

describe('weighing a map\'s detailed tiles', () => {
  const tile = (x: number, z: number) => `maps/m/tiles/0/x${x}/z${z}.prbm.gz`;
  const files = [tile(0, 0), tile(1, 1), tile(3, 0), tile(4, 0), 'maps/m/tiles/1/x0/z0.prbm.gz', 'maps/m/settings.json'];
  const sizes: Record<string, number> = { [tile(0, 0)]: 100, [tile(1, 1)]: 300, [tile(3, 0)]: 500, [tile(4, 0)]: 9000 };
  const sizeOf = (f: string) => sizes[f] ?? 1;

  it('averages the hires tiles a phone loads first, around where the map opens', () => {
    /* 110 blocks reach 3 tiles each way from the start's tile: x4 is past it, lowres and other files don't count */
    expect(startTileBytes(files, sizeOf, 'm', 10, 10)).toBe(300);
    expect(startTileBytes(files, sizeOf, 'other', 10, 10)).toBeNull();
  });

  it('says how many times heavier, only when it is a quarter heavier or more', () => {
    expect(heaviness(2994, 331)).toBe(9);
    expect(heaviness(400, 331)).toBe(1);
    expect(heaviness(null, 331)).toBe(1);
    expect(heaviness(500, null)).toBe(1);
  });

  it('cuts the detailed square by the weight, never below 3×3', () => {
    expect(lighterHires(160, 1)).toBe(160);
    expect(lighterHires(160, 4)).toBe(80);
    expect(lighterHires(110, 9)).toBe(48);
    expect(lighterHires(70, 9)).toBe(48);
  });
});

describe('getKey', () => {
  it('reads a top-level setting of a map config, a whole block for one, and nothing commented out', () => {
    const conf = 'name: "World"\n# remove-caves-below-y: 10\nremove-caves-below-y: 55\nrender-mask: [\n  { min-x: -10, max-x: 10 }\n]\n';
    expect(getKey(conf, 'remove-caves-below-y')).toBe('55');
    expect(getKey(conf, 'render-mask')).toBe('[\n  { min-x: -10, max-x: 10 }\n]');
    expect(getKey(conf, 'min-inhabited-time')).toBeNull();
  });
});

describe('took', () => {
  it('says a duration the way the logs do', () => {
    expect(took(4_400)).toBe('4 s');
    expect(took(139_000)).toBe('2 mín 19 s');
    expect(took(3_600_000)).toBe('60 mín 0 s');
  });
});

describe('baseAt', () => {
  const bases = [
    { id: 'a', name: 'A', x: 0, z: 0, radius: 100 },
    { id: 'b', name: 'B', x: 150, z: 0, radius: 100 },
  ];

  it('finds the base whose rendered square holds a place, the nearest where two overlap', () => {
    expect(baseAt(bases, { x: 10, z: -90 })?.id).toBe('a');
    expect(baseAt(bases, { x: 90, z: 0 })?.id).toBe('b');
    expect(baseAt(bases, { x: 0, z: 101 })).toBeNull();
    expect(baseAt([], { x: 0, z: 0 })).toBeNull();
  });
});

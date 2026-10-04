import { describe, expect, it } from 'vitest';
import { parseWorldPoint, DEFAULT_LOCATIONS } from '@/lib/map-types';
import { sanitizeMapConfig } from '@/lib/map';
import { placesMarkerSet } from '@/lib/bluemap-markers';
import { parseDataPath } from '@/lib/bluemap-snapshot';
import { addressOf, boundsOf, indexHtml, keptTiles, versionOf, viewerAssets } from '../../../scripts/bluemap-brand.mjs';
import { blobsOf, manifestText, packBody, planPacks, sinceOf, sumOf } from '../../../scripts/bluemap-pack.mjs';

describe('parseWorldPoint', () => {
  it('reads what F3 and a copied /tp write', () => {
    expect(parseWorldPoint('-6890 64 -8919')).toEqual({ x: -6890, y: 64, z: -8919 });
    expect(parseWorldPoint('XYZ: -6890.500 / 64.00000 / -8919.300')).toEqual({ x: -6890, y: 64, z: -8919 });
    expect(parseWorldPoint('/execute in minecraft:overworld run tp @s -6890.50 64.00 -8919.30 12.34 56.78')).toEqual({ x: -6890, y: 64, z: -8919 });
  });

  it('takes a comma for a separator, never a decimal point', () => {
    expect(parseWorldPoint('-6890,64,-8919')).toEqual({ x: -6890, y: 64, z: -8919 });
  });

  it('gives nothing for fewer than three numbers', () => {
    expect(parseWorldPoint('')).toBeNull();
    expect(parseWorldPoint('-6890 -8919')).toBeNull();
    expect(parseWorldPoint('joðbær')).toBeNull();
  });
});

describe('sanitizeMapConfig world coordinates', () => {
  const withWorld = (world: unknown) => {
    const res = sanitizeMapConfig({ locations: [{ ...DEFAULT_LOCATIONS[0], world }], zones: [] });
    if ('error' in res) throw new Error(res.error);
    return res.config.locations[0].world;
  };

  it('keeps a whole point, rounded, with the height held to the build limits', () => {
    expect(withWorld({ x: -6890.4, y: 64.6, z: -8919 })).toEqual({ x: -6890, y: 65, z: -8919 });
    expect(withWorld({ x: 0, y: 900, z: 0 })).toEqual({ x: 0, y: 320, z: 0 });
  });

  it('drops a missing, partial or impossible point', () => {
    expect(withWorld(undefined)).toBeNull();
    expect(withWorld({ x: 1, z: 2 })).toBeNull();
    expect(withWorld({ x: 40_000_000, y: 64, z: 0 })).toBeNull();
    expect(withWorld('-6890 64 -8919')).toBeNull();
  });
});

describe('placesMarkerSet', () => {
  it('stands only the places that have world coordinates, as lanterns', () => {
    const set = placesMarkerSet([
      { ...DEFAULT_LOCATIONS[1], world: { x: -6890, y: 70, z: -8919 } },
      { ...DEFAULT_LOCATIONS[2], world: null },
    ]);
    expect(Object.keys(set.markers)).toEqual([`stadur-${DEFAULT_LOCATIONS[1].id}`]);
    const m = set.markers[`stadur-${DEFAULT_LOCATIONS[1].id}`];
    expect(m.position).toEqual({ x: -6889.5, y: 71, z: -8918.5 });
    expect(m.classes).toContain('jod-place');
    expect(m.html).toContain(`data-stadur="${DEFAULT_LOCATIONS[1].id}"`);
  });

  it('escapes what the admin wrote, since BlueMap sets it as HTML', () => {
    const set = placesMarkerSet([{ ...DEFAULT_LOCATIONS[0], label: '<img src=x onerror=alert(1)>', sublabel: 'a "b" & c', world: { x: 0, y: 64, z: 0 } }]);
    const html = Object.values(set.markers)[0].html;
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(html).toContain('a &quot;b&quot; &amp; c');
  });
});

describe('parseDataPath', () => {
  it('splits a versioned map address', () => {
    expect(parseDataPath(['vtlldtz', 'maps', 'world', 'settings.json'])).toEqual({ version: 'vtlldtz', path: 'maps/world/settings.json' });
  });

  it('leaves an unversioned one as it is', () => {
    expect(parseDataPath(['maps', 'world', 'settings.json'])).toEqual({ version: null, path: 'maps/world/settings.json' });
    expect(parseDataPath(['v1', 'world'])).toEqual({ version: null, path: 'v1/world' });
  });
});

describe('the brand step', () => {
  it('names a version by the sync time', () => {
    expect(versionOf('2026-09-19T03:32:23.704Z')).toBe('vtlldtz');
    expect(versionOf(null)).toBeNull();
  });

  it('finds the rendered edges from the hires tiles, and tells a circle from a box', () => {
    const box: string[] = [];
    for (let x = -3; x <= 3; x++) for (let z = -3; z <= 3; z++) box.push(`maps/world/tiles/0/x${x < 0 ? '-' : ''}${Math.abs(x)}/z${z < 0 ? '-' : ''}${Math.abs(z)}.prbm.gz`);
    expect(boundsOf(box, 'world')).toEqual({ minX: -94, maxX: 130, minZ: -94, maxZ: 130, shape: 'box' });

    const circle = box.filter((f) => {
      const [, x, z] = /x(-?\d+)\/z(-?\d+)/.exec(f)!.map(Number);
      return x * x + z * z <= 10;
    });
    expect(boundsOf(circle, 'world')?.shape).toBe('circle');
    expect(boundsOf(box, 'world_nether')).toBeNull();
  });

  it('reads multi-digit tile paths', () => {
    expect(boundsOf(['maps/world/tiles/0/x-2/3/3/z-2/9/5.prbm.gz'], 'world')).toMatchObject({ minX: -233 * 32 + 2, minZ: -295 * 32 + 2 });
  });

  it('writes an Icelandic, JOÐ-branded page that keeps BlueMap\'s own files', () => {
    const assets = viewerAssets('<meta name="version" content="5.27"><script type="module" crossorigin src="./assets/index-A.js"></script><link rel="stylesheet" crossorigin href="./assets/index-B.css">');
    expect(assets).toEqual({ script: './assets/index-A.js', style: './assets/index-B.css', version: '5.27' });
    const html = indexHtml(assets, {
      id: 'world', root: '/bluemap-data/vx/maps', version: 'vx', syncedAt: null,
      files: new Set(['maps/world/textures.json.gz']), bounds: null, start: null,
    });
    expect(html).toContain('<html lang="is">');
    expect(html).toContain('<title>Heimurinn · JOÐcraft</title>');
    expect(html).not.toMatch(/BlueMap is a tool|avatars\.githubusercontent/);
    expect(html).toContain('href="/bluemap-data/vx/maps/world/textures.json.gz" as="fetch" crossorigin');
    expect(html).not.toContain('world/settings.json" as="fetch"');
    expect(html).toContain('src="./assets/index-A.js"');
    /* BlueMap's stylesheet first, JOÐ's after it, so the skin wins */
    expect(html.indexOf('index-B.css')).toBeLessThan(html.indexOf('/bluemap-jod/jod.css'));
    /* the page reads its round trip with viewerAssets again after a second brand */
    expect(viewerAssets(html)).toEqual(assets);
  });
});

describe('packing the copy', () => {
  const files = ['maps/world/a.json', 'maps/world/b.prbm.gz', 'maps/world/c.prbm.gz', 'maps/world/d.png'];
  const bytes: Record<string, Buffer> = {
    'maps/world/a.json': Buffer.from('{"x":1}'),
    'maps/world/b.prbm.gz': Buffer.from([0x1f, 0x8b, 8, 0, 1, 2, 3, 4, 5, 6]),
    'maps/world/c.prbm.gz': Buffer.alloc(0),
    'maps/world/d.png': Buffer.from([0x89, 0x50, 0x4e, 0x47, 9, 9, 9]),
  };
  const sizeOf = (rel: string) => bytes[rel].length;

  it('lays the files end to end, starting a new pack when the next would not fit', () => {
    const plan = planPacks(files, sizeOf, 'vx', 17);
    expect(plan.names).toEqual(['bluemap-data/packs/vx-0.pack', 'bluemap-data/packs/vx-1.pack']);
    expect(plan.at).toEqual([[0, 0, 7], [0, 7, 10], [0, 17, 0], [1, 0, 7]]);
    /* a file larger than a pack gets one of its own */
    expect(planPacks(files, sizeOf, 'vx', 4).names).toHaveLength(3);
  });

  it('gives every file back byte for byte', () => {
    for (const limit of [4, 17, 1 << 20]) {
      const plan = planPacks(files, sizeOf, 'vx', limit);
      const packs = plan.names.map((_: string, p: number) => packBody(files, plan, p, (rel: string) => bytes[rel]));
      files.forEach((rel, i) => {
        const [p, offset, length] = plan.at[i];
        expect(packs[p].subarray(offset, offset + length).equals(bytes[rel])).toBe(true);
      });
    }
  });

  it('refuses a file that changed size after it was planned', () => {
    const plan = planPacks(files, sizeOf, 'vx');
    expect(() => packBody(files, plan, 0, (rel: string) => (rel.endsWith('d.png') ? Buffer.alloc(1) : bytes[rel]))).toThrow(/breyttist/);
  });

  it('knows which blobs a copy reads, packed or not', () => {
    expect(blobsOf({ files, blob: { base: 'b', access: 'private' }, packs: { names: ['bluemap-data/packs/vx-0.pack'], at: [] } }))
      .toEqual(['bluemap-data/packs/vx-0.pack']);
    expect(blobsOf({ files, blob: { base: 'b', access: 'private' } })).toEqual(files.map((f) => `bluemap-data/${f}`));
    expect(blobsOf({ files, blob: undefined })).toEqual([]);
    expect(blobsOf(null)).toEqual([]);
  });

  it('writes each file\'s place on a line of its own and reads back the same', () => {
    const sums = files.map((rel) => sumOf(bytes[rel]));
    const manifest = { syncedAt: 'now', version: 'vx', files, packs: planPacks(files, sizeOf, 'vx'), sums, since: files.map(() => 'vx') };
    const text = manifestText(manifest);
    expect(text).toContain('\n      [0, 7, 10],\n');
    expect(JSON.parse(text)).toEqual(manifest);
  });
});

describe('the files a new copy keeps', () => {
  const files = ['maps/world/settings.json', 'maps/world/textures.json.gz', 'maps/world/tiles/0/x0/z0.prbm.gz', 'maps/world/tiles/0/x1/z0.prbm.gz'];
  const bytes: Record<string, Buffer> = {
    'maps/world/settings.json': Buffer.from('{"a":1}'),
    'maps/world/textures.json.gz': Buffer.from('textures'),
    'maps/world/tiles/0/x0/z0.prbm.gz': Buffer.from('tile zero'),
    'maps/world/tiles/0/x1/z0.prbm.gz': Buffer.from('tile one'),
  };
  const sizeOf = (rel: string) => bytes[rel].length;
  const sums = files.map((rel) => sumOf(bytes[rel]));
  const copy = (version: string, since?: string[]) => ({
    syncedAt: 'then', version, files, packs: planPacks(files, sizeOf, version), sums, ...(since ? { since } : {}),
  });

  it('fingerprints a file by its bytes', () => {
    expect(sumOf(Buffer.from('tile zero'))).toBe(sumOf(Buffer.from('tile zero')));
    expect(sumOf(Buffer.from('tile zero'))).not.toBe(sumOf(Buffer.from('tile zeri')));
    expect(sumOf(Buffer.alloc(0))).toMatch(/^[0-9a-f]{16}$/);
  });

  it('keeps the version a file was first sent under for as long as its bytes stay the same', () => {
    /* the second tile was redrawn, and a new tile came */
    const next = [...files, 'maps/world/tiles/0/x2/z0.prbm.gz'];
    const nextSums = [...sums.slice(0, 3), sumOf(Buffer.from('tile one, redrawn')), sumOf(Buffer.from('tile two'))];
    expect(sinceOf(next, nextSums, () => 0, copy('vb', ['va', 'vb', 'va', 'va']), 'vc'))
      .toEqual(['va', 'vb', 'va', 'vc', 'vc']);
    /* a copy that says nothing of since: its files are its own version */
    expect(sinceOf(files, sums, sizeOf, copy('vb'), 'vc')).toEqual(['vb', 'vb', 'vb', 'vb']);
  });

  it('starts afresh with no copy before, or one it cannot read', () => {
    expect(sinceOf(files, sums, sizeOf, { syncedAt: null, files: [] }, 'vc')).toEqual(['vc', 'vc', 'vc', 'vc']);
    expect(sinceOf(files, sums, sizeOf, null, 'vc')).toEqual(['vc', 'vc', 'vc', 'vc']);
    /* sums that don't line up with the files are no sums at all */
    expect(sinceOf(files, sums, sizeOf, { ...copy('vb'), sums: sums.slice(1), packs: undefined }, 'vc')).toEqual(['vc', 'vc', 'vc', 'vc']);
  });

  it('tells a copy from before sums by the size of its tiles and atlas, as map:sync does, and nothing else', () => {
    const before = { syncedAt: 'then', version: 'vb', files, packs: planPacks(files, sizeOf, 'vb') };
    const resized = (rel: string) => (rel.endsWith('x1/z0.prbm.gz') ? 99 : sizeOf(rel));
    /* settings.json can change without changing size, so it never counts as the same */
    expect(sinceOf(files, sums, resized, before, 'vc')).toEqual(['vc', 'vb', 'vb', 'vc']);
  });

  it('lists the detailed tiles kept from earlier copies, by version, for the viewer', () => {
    const tiles = ['maps/world/tiles/0/x-2/1/6/z-2/8/4.prbm.gz', 'maps/world/tiles/0/x0/z0.prbm.gz', 'maps/world/tiles/0/x-1/z3.prbm.gz', 'maps/world/tiles/1/x0/z0.png', 'maps/world/textures.json.gz', 'maps/other/tiles/0/x5/z5.prbm.gz'];
    expect(keptTiles(tiles, ['va', 'vc', 'va', 'va', 'va', 'va'], 'world', 'vc')).toEqual({ va: '-216,-284 -1,3' });
    expect(keptTiles(tiles, ['vb', 'va', 'vc', 'vc', 'vc', 'vc'], 'world', 'vc')).toEqual({ va: '0,0', vb: '-216,-284' });
    /* nothing to say without since, or with one that doesn't line up */
    expect(keptTiles(tiles, undefined, 'world', 'vc')).toEqual({});
    expect(keptTiles(tiles, ['va'], 'world', 'vc')).toEqual({});
  });

  it('says where the viewer reads each file: a kept tile under its own version, the rest under the copy\'s', () => {
    const manifest = { version: 'vc', files, since: ['va', 'va', 'va', 'vc'] };
    expect(files.map((rel, i) => addressOf(rel, i, manifest))).toEqual([
      'vc/maps/world/settings.json', 'vc/maps/world/textures.json.gz', 'va/maps/world/tiles/0/x0/z0.prbm.gz', 'vc/maps/world/tiles/0/x1/z0.prbm.gz',
    ]);
    expect(addressOf(files[2], 2, { version: 'vc', files })).toBe('vc/maps/world/tiles/0/x0/z0.prbm.gz');
  });

  it('hands the kept tiles to jod.js in the page, and says nothing when there are none', () => {
    const assets = { script: './assets/index-A.js', style: './assets/index-B.css', version: '5.28' };
    const map = { id: 'world', root: '/bluemap-data/vc/maps', version: 'vc', syncedAt: null, files: new Set<string>(), bounds: null, start: null };
    const facts = (html: string) => JSON.parse(/window\.JOD_MAP = (\{.*\});/.exec(html)![1]);
    expect(facts(indexHtml(assets, { ...map, kept: { va: '0,0 1,0' } })).kept).toEqual({ va: '0,0 1,0' });
    expect(facts(indexHtml(assets, { ...map, kept: {} }))).not.toHaveProperty('kept');
    expect(facts(indexHtml(assets, map))).not.toHaveProperty('kept');
  });
});

import { describe, expect, it } from 'vitest';
import { parseWorldPoint, DEFAULT_LOCATIONS } from '@/lib/map-types';
import { sanitizeMapConfig } from '@/lib/map';
import { placesMarkerSet } from '@/lib/bluemap-markers';
import { parseDataPath } from '@/lib/bluemap-snapshot';
import { boundsOf, indexHtml, versionOf, viewerAssets } from '../../../scripts/bluemap-brand.mjs';

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
    expect(html).toContain('<title>Heimurinn · JOÐ</title>');
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

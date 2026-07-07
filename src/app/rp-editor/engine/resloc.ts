// ─────────────────────────────────────────────────────────────────────────────
// Resource-location resolution
//
// Minecraft addresses assets as `namespace:path`. The bare form defaults to the
// `minecraft` namespace. Each asset category maps a resource location to a
// concrete file under `assets/<namespace>/<category>/<path>.<ext>`.
//
// Getting this exactly right is the difference between a correct dependency
// graph and a pile of false verdicts, so every mapping here is explicit.
// ─────────────────────────────────────────────────────────────────────────────

import type { AssetKind, ResLoc } from './types';

/** Parse `namespace:path` → {namespace, path}. Bare paths default to minecraft. */
export function parseLoc(raw: string): ResLoc {
  const s = raw.trim();
  const i = s.indexOf(':');
  if (i < 0) return { namespace: 'minecraft', path: s };
  return { namespace: s.slice(0, i) || 'minecraft', path: s.slice(i + 1) };
}

/** Render a resource location back to `namespace:path`. */
export function fmtLoc(loc: ResLoc): string {
  return `${loc.namespace}:${loc.path}`;
}

const IMG_EXT = /\.(png|jpg|jpeg)$/i;

/**
 * A texture reference (`ns:block/foo` or `block/foo`) → its file path.
 * A reference may already include a leading `textures/` (rare) — handled.
 */
export function textureLocToPath(raw: string): string {
  const { namespace, path } = parseLoc(raw);
  const p = path.replace(/^textures\//, '').replace(IMG_EXT, '');
  return `assets/${namespace}/textures/${p}.png`;
}

/** A model reference (`ns:item/foo`) → its file path. */
export function modelLocToPath(raw: string): string {
  const { namespace, path } = parseLoc(raw);
  const p = path.replace(/^models\//, '').replace(/\.json$/i, '');
  return `assets/${namespace}/models/${p}.json`;
}

/** An item-definition reference (1.21.4+ `ns:foo`) → its file path. */
export function itemDefLocToPath(raw: string): string {
  const { namespace, path } = parseLoc(raw);
  return `assets/${namespace}/items/${path.replace(/\.json$/i, '')}.json`;
}

/** A font reference (`ns:foo`) → its file path. */
export function fontLocToPath(raw: string): string {
  const { namespace, path } = parseLoc(raw);
  return `assets/${namespace}/font/${path.replace(/\.json$/i, '')}.json`;
}

/** Equipment reference (`ns:foo`) → its file path (1.21.2+). */
export function equipmentLocToPath(raw: string): string {
  const { namespace, path } = parseLoc(raw);
  return `assets/${namespace}/equipment/${path.replace(/\.json$/i, '')}.json`;
}

/**
 * An equipment layer texture. `ns:foo` on a layer of type `humanoid` resolves
 * to `assets/ns/textures/entity/equipment/humanoid/foo.png`.
 */
export function equipmentTexturePath(raw: string, layerType: string): string {
  const { namespace, path } = parseLoc(raw);
  return `assets/${namespace}/textures/entity/equipment/${layerType}/${path.replace(IMG_EXT, '')}.png`;
}

/** A particle texture (`ns:foo`) resolves under `textures/particle/`. */
export function particleTexturePath(raw: string): string {
  const { namespace, path } = parseLoc(raw);
  const p = path.replace(/^textures\//, '').replace(IMG_EXT, '');
  // Particle textures are addressed relative to textures/particle unless the
  // value already carries its own subfolder under textures/.
  const rel = p.startsWith('particle/') ? p : `particle/${p}`;
  return `assets/${namespace}/textures/${rel}.png`;
}

/** Font bitmap `file` (`ns:foo.png`) resolves under `textures/`. */
export function fontBitmapPath(raw: string): string {
  const { namespace, path } = parseLoc(raw);
  const p = path.replace(/^textures\//, '').replace(IMG_EXT, '');
  return `assets/${namespace}/textures/${p}.png`;
}

/** Classify a zip-relative file path into an AssetKind. */
export function classify(path: string): AssetKind {
  const p = path.toLowerCase();
  if (p === 'pack.mcmeta' || p.endsWith('/pack.mcmeta')) return 'pack_meta';
  if (p === 'pack.png' || p.endsWith('/pack.png')) return 'pack_png';
  if (IMG_EXT.test(p)) {
    // Textures live under assets/*/textures — but treat any png as a texture.
    return 'texture';
  }
  if (p.endsWith('.png.mcmeta') || /\.(jpg|jpeg)\.mcmeta$/.test(p)) return 'texture_meta';
  if (p.endsWith('.ogg') || p.endsWith('.mp3') || p.endsWith('.wav')) return 'sound';
  if (p.endsWith('/sounds.json') || p === 'sounds.json') return 'sounds_json';
  if (/\/lang\/[^/]+\.json$/.test(p)) return 'lang';
  if (p.endsWith('.fsh') || p.endsWith('.vsh') || p.endsWith('.glsl') || /\/shaders\//.test(p)) return 'shader';
  if (p.endsWith('.mcmeta')) return 'texture_meta';
  if (p.endsWith('.json')) {
    if (/\/blockstates\/.+\.json$/.test(p)) return 'blockstate';
    if (/\/items\/.+\.json$/.test(p)) return 'item_definition';
    if (/\/font\/.+\.json$/.test(p)) return 'font';
    if (/\/particles\/.+\.json$/.test(p)) return 'particle';
    if (/\/atlases\/.+\.json$/.test(p)) return 'atlas';
    if (/\/equipment\/.+\.json$/.test(p)) return 'equipment';
    if (/\/models\/.+\.json$/.test(p)) return 'model';
    return 'other';
  }
  if (p.endsWith('.txt') || p.endsWith('.md')) return 'text';
  return 'other';
}

/** Extract the namespace from a zip path, or null if it's not under assets/data. */
export function namespaceOf(path: string): string | null {
  const m = path.match(/^(?:assets|data)\/([^/]+)\//);
  return m ? m[1] : null;
}

/**
 * The resource location for a texture file path.
 * `assets/ns/textures/block/foo.png` → `ns:block/foo`.
 */
export function texturePathToLoc(path: string): ResLoc | null {
  const m = path.match(/^assets\/([^/]+)\/textures\/(.+?)\.(?:png|jpg|jpeg)$/i);
  return m ? { namespace: m[1], path: m[2] } : null;
}

/** The resource location for a model file path. */
export function modelPathToLoc(path: string): ResLoc | null {
  const m = path.match(/^assets\/([^/]+)\/models\/(.+?)\.json$/i);
  return m ? { namespace: m[1], path: m[2] } : null;
}

/** The resource location for an item-definition file path. */
export function itemDefPathToLoc(path: string): ResLoc | null {
  const m = path.match(/^assets\/([^/]+)\/items\/(.+?)\.json$/i);
  return m ? { namespace: m[1], path: m[2] } : null;
}

/** Normalize a texture reference for loose comparison (namespace + ext stripped). */
export function normTex(raw: string): string {
  return raw
    .replace(/^minecraft:/, '')
    .replace(/^assets\/[^/]+\/textures\//, '')
    .replace(/^textures\//, '')
    .replace(IMG_EXT, '')
    .toLowerCase();
}

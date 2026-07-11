// ─────────────────────────────────────────────────────────────────────────────
// Model geometry resolution for the 3D viewer
//
// A model rarely carries its own `elements` — it inherits them from a parent
// (block/cube_all → block/cube, orientable, cross, …). The old viewer only read
// the selected model, so any inherited model rendered nothing. This resolves the
// full parent chain (pack models first, then bundled vanilla templates), merging
// texture variables child-wins and taking elements from the nearest ancestor
// that defines them — exactly how Minecraft assembles a model.
// ─────────────────────────────────────────────────────────────────────────────

import { vanillaModel } from './vanilla-models';
import { modelLocToPath } from './resloc';

export interface ResolvedGeometry {
  elements: any[] | null;
  textures: Record<string, string>;
  /** The deepest parent reference that could not be resolved (for builtin detection). */
  parentRef: string | null;
  /** The chain includes item/generated or builtin/generated (a flat sprite item). */
  isGenerated: boolean;
  guiLight?: string;
}

/** Resolve a model ref to its JSON: pack model first, then bundled vanilla. */
export function makeModelLookup(fileData: Record<string, string>) {
  return (ref: string): any | null => {
    const path = modelLocToPath(ref);
    const txt = fileData[path];
    if (txt != null) { try { return JSON.parse(txt); } catch { return null; } }
    return vanillaModel(ref);
  };
}

export function resolveModelGeometry(
  rootJson: any,
  lookup: (ref: string) => any | null,
): ResolvedGeometry {
  const chain: any[] = [];
  const seen = new Set<string>();
  let cur = rootJson;
  let parentRef: string | null = null;
  let isGenerated = false;

  while (cur) {
    chain.push(cur);
    const parent = cur.parent;
    if (typeof parent !== 'string' || !parent) break;
    parentRef = parent;
    const bare = parent.replace(/^minecraft:/, '');
    if (bare === 'item/generated' || bare === 'builtin/generated' || bare === 'item/handheld') isGenerated = true;
    if (bare.startsWith('builtin/')) break;
    if (seen.has(parent)) break;
    seen.add(parent);
    const next = lookup(parent);
    if (!next) break; // unresolved (parentRef holds the ref for builtin/entity detection)
    cur = next;
  }

  // Merge textures ancestor → child so child values win.
  const textures: Record<string, string> = {};
  for (let i = chain.length - 1; i >= 0; i--) {
    const t = chain[i]?.textures;
    if (t && typeof t === 'object') Object.assign(textures, t);
  }

  // Elements: nearest (child-first) definition wins.
  let elements: any[] | null = null;
  for (const m of chain) {
    if (Array.isArray(m.elements)) { elements = m.elements; break; }
  }

  const guiLight = chain.map((m) => m.gui_light).find((g) => typeof g === 'string');
  return { elements, textures, parentRef, isGenerated, guiLight };
}

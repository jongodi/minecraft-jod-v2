// ─────────────────────────────────────────────────────────────────────────────
// Applying fixes
//
// A fix replaces string values equal to `from` with `to` inside one JSON file.
// This is structural (walks the parsed tree, only touches string values), never
// a blind text substitution, so it can't corrupt keys or partial matches.
//
// When a fix carries a `kind`, replacement is further constrained to positions
// where that kind of reference lives (texture slots for texture fixes, model
// slots for model fixes). A model and a texture can legally share the same
// resource-location string in one file — repointing the broken texture must not
// silently rewrite the working model parent.
// ─────────────────────────────────────────────────────────────────────────────

export type RefKind = 'texture' | 'model' | 'font';

/**
 * Does a string at (key, parentKey) hold a reference of `kind`?
 *   texture — model `textures` map values, particle `textures[]`, equipment
 *             layer `texture`, atlas `resource`/`textures[]`/`palette_key`/
 *             `permutations` values
 *   model   — `model` (blockstates, overrides, item definitions), `parent`,
 *             special-model `base`
 *   font    — bitmap provider `file`, unihex `hex_file`, reference `id`
 */
function kindMatches(kind: RefKind, key?: string, parentKey?: string): boolean {
  if (kind === 'texture') {
    return key === 'texture' || key === 'palette_key' || key === 'resource' ||
      parentKey === 'textures' || parentKey === 'permutations';
  }
  if (kind === 'model') return key === 'model' || key === 'parent' || key === 'base';
  return key === 'file' || key === 'hex_file' || key === 'id';
}

/**
 * Structurally rewrite string values: `rewrite` sees each string with its
 * position (key + parent key) and returns a replacement or null to keep it.
 */
export function rewriteRefsInJson(
  jsonText: string,
  rewrite: (value: string, pos: { key?: string; parentKey?: string }) => string | null,
): { text: string; applied: number } {
  let json: any;
  try { json = JSON.parse(jsonText); } catch { return { text: jsonText, applied: 0 }; }
  let applied = 0;
  const walk = (node: any, key?: string, parentKey?: string): any => {
    if (typeof node === 'string') {
      const r = rewrite(node, { key, parentKey });
      if (r != null && r !== node) { applied++; return r; }
      return node;
    }
    // Array items inherit the array's key as their parent context
    // ({"textures": ["a"]} → items see parentKey "textures").
    if (Array.isArray(node)) return node.map((v) => walk(v, key, key));
    if (node && typeof node === 'object') {
      const o: Record<string, any> = {};
      for (const k of Object.keys(node)) o[k] = walk(node[k], k, key);
      return o;
    }
    return node;
  };
  const out = walk(json);
  if (applied === 0) return { text: jsonText, applied: 0 };
  return { text: JSON.stringify(out, null, 2), applied };
}

/** Is a string at this position a texture reference slot? */
export function isTextureSlot(key?: string, parentKey?: string): boolean {
  return kindMatches('texture', key, parentKey);
}
/** Is a string at this position a model reference slot? */
export function isModelSlot(key?: string, parentKey?: string): boolean {
  return kindMatches('model', key, parentKey);
}

export function replaceRefsInJson(
  jsonText: string,
  repl: Array<{ from: string; to: string; kind?: RefKind }>,
): { text: string; applied: number } {
  const map = new Map(repl.map((r) => [r.from, r]));
  return rewriteRefsInJson(jsonText, (value, { key, parentKey }) => {
    const r = map.get(value);
    if (r && (!r.kind || kindMatches(r.kind, key, parentKey))) return r.to;
    return null;
  });
}

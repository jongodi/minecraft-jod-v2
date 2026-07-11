// ─────────────────────────────────────────────────────────────────────────────
// Overlay (model texture-layer) helpers
//
// Minecraft generated item models stack textures as layer0 (base) + layer1,
// layer2… (overlays) — how dyed leather armor, potions, spawn eggs and tipped
// arrows render. "Does this texture have an overlay" == is it a layer of a model
// that also defines layer1+. These helpers read that structure straight off the
// analysis (which already resolved every model's textures).
// ─────────────────────────────────────────────────────────────────────────────

import type { AnalysisResult, ModelResolution } from '../engine/types';

export interface LayerRef {
  key: string;         // 'layer0', 'layer1', …
  index: number;
  ref: string;         // the resource-location value in the model
  path: string | null; // resolved pack file path, if present
}

export interface OverlayInfo {
  model: string;       // the item model file that stacks the layers
  layers: LayerRef[];  // sorted by index (layer0 first)
  hasOverlay: boolean; // has layer1 or higher
  /** The namespace of the model, used when creating a new overlay texture. */
  namespace: string;
}

const LAYER_RE = /^layer(\d+)$/;

/** True if a model stacks numbered layers (i.e. a generated item that can have overlays). */
export function isLayeredModel(res: ModelResolution): boolean {
  return res.textures.some((t) => LAYER_RE.test(t.key));
}

function layersOf(res: ModelResolution): LayerRef[] {
  return res.textures
    .map((t) => {
      const m = t.key.match(LAYER_RE);
      return m ? { key: t.key, index: parseInt(m[1], 10), ref: t.value, path: t.resolvedPath ?? null } : null;
    })
    .filter((x): x is LayerRef => !!x)
    .sort((a, b) => a.index - b.index);
}

/**
 * The overlay/layer info for a texture: the layered item model that uses it (as
 * any layer) plus that model's full layer stack. Null if the texture isn't part
 * of a layered item model.
 */
export function overlayForTexture(texPath: string, analysis: AnalysisResult): OverlayInfo | null {
  const node = analysis.nodes[texPath];
  if (!node) return null;
  for (const m of node.usedBy) {
    const res = analysis.models[m];
    if (!res) continue;
    const layers = layersOf(res);
    if (!layers.length || !layers.some((l) => l.path === texPath)) continue;
    const namespace = m.match(/^assets\/([^/]+)\//)?.[1] ?? 'minecraft';
    return { model: m, layers, hasOverlay: layers.some((l) => l.index >= 1), namespace };
  }
  return null;
}

/** The item model that renders `texPath` (as layer0), if any — for the 3D/preview. */
export function modelForTexture(texPath: string, analysis: AnalysisResult): string | null {
  const node = analysis.nodes[texPath];
  if (!node) return null;
  // Prefer a model that uses it as layer0 (it's the "owner" texture).
  for (const m of node.usedBy) {
    const res = analysis.models[m];
    if (res && res.textures.some((t) => t.key === 'layer0' && t.resolvedPath === texPath)) return m;
  }
  // Otherwise any model that references it.
  return node.usedBy.find((m) => analysis.models[m]) ?? null;
}

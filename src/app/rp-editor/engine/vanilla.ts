// ─────────────────────────────────────────────────────────────────────────────
// Vanilla knowledge base
//
// Used to distinguish three things the raw graph cannot:
//   1. "vanilla default" vs "broken"     — a minecraft: ref absent from the pack
//      is inherited from vanilla, not broken. A CUSTOM-namespace ref absent from
//      the pack IS broken.
//   2. "used-by-convention override"      — a file at a vanilla path replaces a
//      default and is loaded by hardcoded path, so it is used even with no ref.
//   3. "overrides a vanilla item/block"   — an item definition / model / texture
//      named after a vanilla asset is wired up by convention.
//
// The asset lists come from a real, generated manifest (misode/mcmeta, current
// release). Every list here is UPGRADE-ONLY: membership can only move a verdict
// toward "used"/"keep". An incomplete/stale list therefore causes, at worst, an
// over-cautious "review" — never a dangerous false "safe to remove".
// ─────────────────────────────────────────────────────────────────────────────

import { normTex } from './resloc';
import {
  VANILLA_ITEM_ID_LIST, VANILLA_BLOCK_ID_LIST, isVanillaTexturePath,
} from './vanilla-manifest';

/** Special builtin parents that terminate a model's parent chain. */
export const BUILTIN_PARENTS = new Set([
  'builtin/generated',
  'builtin/entity',
  'builtin/missing',
]);

/**
 * True when a model `parent` reference is satisfied by vanilla (so its absence
 * from the pack is NOT an error). Any minecraft-namespace parent is vanilla;
 * a custom-namespace parent must ship in the pack.
 */
export function isVanillaModelRef(raw: string): boolean {
  const i = raw.indexOf(':');
  const namespace = i < 0 ? 'minecraft' : raw.slice(0, i);
  const path = i < 0 ? raw : raw.slice(i + 1);
  if (BUILTIN_PARENTS.has(path)) return true;
  return namespace === 'minecraft';
}

/**
 * Texture path prefixes (relative to assets/<ns>/textures/) that Minecraft
 * loads by HARDCODED path rather than through a model. A file here overrides a
 * vanilla default and is used-by-convention regardless of model references.
 */
export const STRONG_OVERRIDE_PREFIXES = [
  'gui/',
  'font/',
  'entity/',
  'environment/',
  'painting/',
  'misc/',
  'map/',
  'mob_effect/',
  'colormap/',
  'effect/',
  'trims/',
  'models/armor/', // legacy armor overlay (pre-1.21.2)
  'title/',
];

/** Prefixes that are normally reached THROUGH a model/blockstate. */
export const MODEL_REFERENCED_PREFIXES = ['block/', 'item/'];

/** Does this texture path sit at a hardcoded vanilla-override location? */
export function isStrongOverridePath(texRelPath: string): boolean {
  const p = texRelPath.toLowerCase();
  return STRONG_OVERRIDE_PREFIXES.some((pre) => p.startsWith(pre));
}

// ── Vanilla registries (from the generated manifest) ─────────────────────────
export const VANILLA_ITEM_IDS = VANILLA_ITEM_ID_LIST;
export const VANILLA_BLOCK_IDS = VANILLA_BLOCK_ID_LIST;

/** Is this item-definition / model name a vanilla item override? */
export function isVanillaItem(name: string): boolean {
  const bare = name.replace(/^minecraft:/, '').split('/').pop() ?? name;
  return VANILLA_ITEM_IDS.has(bare);
}

/** Is this blockstate / model name a vanilla block override? */
export function isVanillaBlock(name: string): boolean {
  const bare = name.replace(/^minecraft:/, '').split('/').pop() ?? name;
  return VANILLA_BLOCK_IDS.has(bare);
}

/**
 * Is this texture (by relative path, e.g. block/stone, item/diamond_sword) a
 * real vanilla texture? A pack file at this path overrides the vanilla default,
 * which vanilla's own model still loads — so it is used even with no pack ref.
 */
export function isKnownVanillaTexture(texRelPath: string): boolean {
  return isVanillaTexturePath(normTex(texRelPath));
}

// ── Vanilla particle / font / equipment names (upgrade-only) ─────────────────
export const VANILLA_PARTICLES = new Set([
  'angry_villager', 'ash', 'big_smoke', 'bubble', 'bubble_pop', 'campfire_cosy_smoke',
  'campfire_signal_smoke', 'cloud', 'composter', 'crit', 'critical_hit', 'damage_indicator',
  'dolphin', 'dragon_breath', 'drip_hang', 'drip_fall', 'drip_land', 'dust', 'effect',
  'enchanted_hit', 'end_rod', 'explosion', 'explosion_emitter', 'firework', 'fishing',
  'flame', 'flash', 'generic', 'generic_0', 'glint', 'glitter', 'glow', 'heart',
  'lava', 'nautilus', 'note', 'sga_a', 'soul', 'soul_fire_flame', 'spark', 'spell',
  'spit', 'splash', 'sneeze', 'sweep', 'wax_off', 'wax_on', 'scrape', 'vibration',
]);

export const VANILLA_FONTS = new Set([
  'default', 'alt', 'uniform', 'illageralt',
]);

/** Vanilla equipment layer material names (upgrade-only). */
export const VANILLA_EQUIPMENT = new Set([
  'leather', 'chainmail', 'iron', 'gold', 'diamond', 'netherite', 'turtle_scute',
  'turtle', 'elytra', 'armadillo_scute', 'wolf_armor', 'horse_leather', 'saddle',
  'llama', 'iron_horse', 'gold_horse', 'diamond_horse', 'trader_llama',
]);

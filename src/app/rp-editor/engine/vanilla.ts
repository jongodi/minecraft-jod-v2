// ─────────────────────────────────────────────────────────────────────────────
// Vanilla knowledge base
//
// Used to distinguish three things the raw graph cannot:
//   1. "vanilla default" vs "broken"     — a minecraft: ref absent from the pack
//      is inherited from vanilla, not broken. A CUSTOM-namespace ref absent from
//      the pack IS broken.
//   2. "used-by-convention override"      — a file at a vanilla path replaces a
//      default and is loaded by hardcoded path, so it is used even with no ref.
//   3. "overrides a vanilla item"         — an item definition / model named
//      after a vanilla asset is wired up by convention.
//
// IMPORTANT: every list here is UPGRADE-ONLY. Membership can only move a verdict
// toward "used"/"keep". An incomplete list therefore causes, at worst, an
// over-cautious "review" — never a dangerous false "safe to remove". This is
// what lets us ship best-effort lists without risking the user's pack.
// ─────────────────────────────────────────────────────────────────────────────

import { parseLoc, normTex } from './resloc';

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
  const { namespace, path } = parseLoc(raw);
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

// ── Vanilla item IDs (representative, upgrade-only) ───────────────────────────
// Used to tell "item definition overrides a vanilla item" (used) from a custom
// item model that needs a datapack reference. Not exhaustive by design.
const VANILLA_ITEMS_RAW = `
stone granite polished_granite diorite polished_diorite andesite polished_andesite
deepslate cobbled_deepslate polished_deepslate calcite tuff dripstone_block grass_block
dirt coarse_dirt podzol rooted_dirt mud crimson_nylium warped_nylium cobblestone
oak_planks spruce_planks birch_planks jungle_planks acacia_planks dark_oak_planks
mangrove_planks cherry_planks bamboo_planks crimson_planks warped_planks
oak_sapling spruce_sapling birch_sapling jungle_sapling acacia_sapling dark_oak_sapling
mangrove_propagule cherry_sapling bedrock sand red_sand gravel gold_ore deepslate_gold_ore
iron_ore deepslate_iron_ore coal_ore deepslate_coal_ore copper_ore deepslate_copper_ore
diamond_ore deepslate_diamond_ore emerald_ore deepslate_emerald_ore lapis_ore
deepslate_lapis_ore redstone_ore deepslate_redstone_ore nether_gold_ore nether_quartz_ore
ancient_debris coal_block raw_iron_block raw_copper_block raw_gold_block amethyst_block
budding_amethyst iron_block copper_block gold_block diamond_block netherite_block
oak_log spruce_log birch_log jungle_log acacia_log dark_oak_log mangrove_log cherry_log
crimson_stem warped_stem stripped_oak_log stripped_spruce_log bamboo_block
oak_wood spruce_wood birch_wood jungle_wood acacia_wood dark_oak_wood mangrove_wood
oak_leaves spruce_leaves birch_leaves jungle_leaves acacia_leaves dark_oak_leaves
mangrove_leaves cherry_leaves azalea_leaves flowering_azalea_leaves sponge wet_sponge
glass tinted_glass lapis_block sandstone chiseled_sandstone cut_sandstone
white_wool orange_wool magenta_wool light_blue_wool yellow_wool lime_wool pink_wool
gray_wool light_gray_wool cyan_wool purple_wool blue_wool brown_wool green_wool red_wool
black_wool dandelion poppy blue_orchid allium azure_bluet red_tulip orange_tulip
white_tulip pink_tulip oxeye_daisy cornflower lily_of_the_valley wither_rose torchflower
brown_mushroom red_mushroom crimson_fungus warped_fungus crimson_roots warped_roots
nether_sprouts weeping_vines twisting_vines sugar_cane kelp moss_carpet moss_block
hanging_roots big_dripleaf small_dripleaf bamboo torch end_rod chorus_plant chorus_flower
purpur_block purpur_pillar purpur_stairs purpur_slab pumpkin carved_pumpkin
jack_o_lantern netherrack soul_sand soul_soil basalt polished_basalt smooth_basalt
glowstone infested_stone bricks bookshelf chiseled_bookshelf mossy_cobblestone obsidian
crying_obsidian spawner ladder rail powered_rail detector_rail activator_rail
diamond_sword diamond_pickaxe diamond_axe diamond_shovel diamond_hoe
iron_sword iron_pickaxe iron_axe iron_shovel iron_hoe golden_sword golden_pickaxe
golden_axe golden_shovel golden_hoe stone_sword stone_pickaxe stone_axe stone_shovel
stone_hoe wooden_sword wooden_pickaxe wooden_axe wooden_shovel wooden_hoe netherite_sword
netherite_pickaxe netherite_axe netherite_shovel netherite_hoe mace bow crossbow arrow
spectral_arrow tipped_arrow shield trident fishing_rod carrot_on_a_stick
warped_fungus_on_a_stick flint_and_steel shears lead name_tag compass recovery_compass
clock spyglass leather_helmet leather_chestplate leather_leggings leather_boots
chainmail_helmet chainmail_chestplate chainmail_leggings chainmail_boots iron_helmet
iron_chestplate iron_leggings iron_boots diamond_helmet diamond_chestplate
diamond_leggings diamond_boots golden_helmet golden_chestplate golden_leggings
golden_boots netherite_helmet netherite_chestplate netherite_leggings netherite_boots
turtle_helmet elytra apple golden_apple enchanted_golden_apple melon_slice glow_berries
sweet_berries carrot golden_carrot potato baked_potato poisonous_potato beetroot
beetroot_soup mushroom_stew rabbit_stew suspicious_stew bread cookie cake pumpkin_pie
dried_kelp beef cooked_beef porkchop cooked_porkchop mutton cooked_mutton chicken
cooked_chicken rabbit cooked_rabbit cod cooked_cod salmon cooked_salmon tropical_fish
pufferfish rotten_flesh spider_eye chorus_fruit popped_chorus_fruit honey_bottle
milk_bucket water_bucket lava_bucket bucket cod_bucket salmon_bucket
pufferfish_bucket tropical_fish_bucket axolotl_bucket tadpole_bucket powder_snow_bucket
coal charcoal diamond emerald lapis_lazuli quartz amethyst_shard raw_iron iron_ingot
raw_copper copper_ingot raw_gold gold_ingot netherite_ingot netherite_scrap nether_star
stick bowl string feather gunpowder wheat_seeds wheat flint gold_nugget iron_nugget
egg leather rabbit_hide rabbit_foot clay_ball brick nether_brick prismarine_shard
prismarine_crystals coal_block slime_ball snowball ender_pearl ender_eye ghast_tear
blaze_rod blaze_powder magma_cream fermented_spider_eye glowstone_dust redstone
glowstone sugar bone bone_meal ink_sac glow_ink_sac cocoa_beans white_dye orange_dye
magenta_dye light_blue_dye yellow_dye lime_dye pink_dye gray_dye light_gray_dye cyan_dye
purple_dye blue_dye brown_dye green_dye red_dye black_dye paper book writable_book
written_book enchanted_book map filled_map firework_rocket firework_star
nether_wart potion splash_potion lingering_potion glass_bottle experience_bottle
dragon_breath skeleton_skull wither_skeleton_skull player_head zombie_head creeper_head
dragon_head piglin_head totem_of_undying scute turtle_scute phantom_membrane
nautilus_shell heart_of_the_sea music_disc_13 music_disc_cat music_disc_blocks
music_disc_chirp music_disc_far music_disc_mall music_disc_mellohi music_disc_stal
music_disc_strad music_disc_ward music_disc_11 music_disc_wait music_disc_otherside
music_disc_5 music_disc_pigstep music_disc_relic music_disc_creator
music_disc_creator_music_box music_disc_precipice disc_fragment_5 goat_horn
echo_shard amethyst_shard brush pointed_dripstone amethyst_cluster
copper_ingot lightning_rod tinted_glass sculk sculk_vein sculk_catalyst sculk_shrieker
sculk_sensor calibrated_sculk_sensor stick torchflower_seeds pitcher_pod pitcher_plant
netherite_upgrade_smithing_template sentry_armor_trim_smithing_template
dune_armor_trim_smithing_template coast_armor_trim_smithing_template
wild_armor_trim_smithing_template ward_armor_trim_smithing_template
eye_armor_trim_smithing_template vex_armor_trim_smithing_template
tide_armor_trim_smithing_template snout_armor_trim_smithing_template
rib_armor_trim_smithing_template spire_armor_trim_smithing_template
wayfinder_armor_trim_smithing_template shaper_armor_trim_smithing_template
silence_armor_trim_smithing_template raiser_armor_trim_smithing_template
host_armor_trim_smithing_template flow_armor_trim_smithing_template
bolt_armor_trim_smithing_template angler_pottery_sherd archer_pottery_sherd
arms_up_pottery_sherd blade_pottery_sherd brewer_pottery_sherd burn_pottery_sherd
danger_pottery_sherd explorer_pottery_sherd flow_pottery_sherd friend_pottery_sherd
guster_pottery_sherd heart_pottery_sherd heartbreak_pottery_sherd howl_pottery_sherd
miner_pottery_sherd mourner_pottery_sherd plenty_pottery_sherd prize_pottery_sherd
scrape_pottery_sherd sheaf_pottery_sherd shelter_pottery_sherd skull_pottery_sherd
snort_pottery_sherd bundle white_bundle orange_bundle magenta_bundle light_blue_bundle
yellow_bundle lime_bundle pink_bundle gray_bundle light_gray_bundle cyan_bundle
purple_bundle blue_bundle brown_bundle green_bundle red_bundle black_bundle
saddle carrot_on_a_stick minecart chest_minecart furnace_minecart tnt_minecart
hopper_minecart oak_boat oak_chest_boat bamboo_raft bamboo_chest_raft
`;

export const VANILLA_ITEM_IDS = new Set(
  VANILLA_ITEMS_RAW.split(/\s+/).map((s) => s.trim()).filter(Boolean),
);

/** Is this item-definition / model name a vanilla item override? */
export function isVanillaItem(name: string): boolean {
  const bare = name.replace(/^minecraft:/, '').split('/').pop() ?? name;
  return VANILLA_ITEM_IDS.has(bare);
}

// ── Known vanilla textures (curated, upgrade-only) ───────────────────────────
// A texture under block/ or item/ that matches a vanilla name is a used-by-
// convention override even if no pack model references it (vanilla's own model
// still points at that path). Precision-focused; unknowns fall through safely.
const KNOWN_VANILLA_TEXTURES_RAW = `
block/stone block/cobblestone block/dirt block/grass_block_top block/grass_block_side
block/sand block/red_sand block/gravel block/bedrock block/oak_planks block/spruce_planks
block/birch_planks block/jungle_planks block/acacia_planks block/dark_oak_planks
block/oak_log block/oak_log_top block/spruce_log block/glass block/bricks block/bookshelf
block/obsidian block/netherrack block/soul_sand block/glowstone block/sandstone
block/white_wool block/tnt_side block/tnt_top block/tnt_bottom block/crafting_table_top
block/crafting_table_front block/crafting_table_side block/furnace_front block/furnace_side
block/furnace_top block/iron_block block/gold_block block/diamond_block block/emerald_block
block/coal_block block/redstone_block block/lapis_block block/oak_leaves block/water_still
block/water_flow block/lava_still block/lava_flow block/dirt_path_top block/dirt_path_side
item/diamond item/emerald item/iron_ingot item/gold_ingot item/coal item/charcoal
item/stick item/apple item/bread item/diamond_sword item/diamond_pickaxe item/diamond_axe
item/diamond_shovel item/diamond_hoe item/iron_sword item/iron_pickaxe item/golden_sword
item/stone_sword item/wooden_sword item/netherite_sword item/bow item/arrow item/crossbow
item/shield item/trident item/fishing_rod item/flint_and_steel item/shears item/bucket
item/water_bucket item/lava_bucket item/milk_bucket item/leather_helmet item/leather_chestplate
item/iron_helmet item/iron_chestplate item/iron_leggings item/iron_boots item/diamond_helmet
item/diamond_chestplate item/diamond_leggings item/diamond_boots item/netherite_ingot
item/redstone item/glowstone_dust item/gunpowder item/string item/feather item/leather
item/paper item/book item/enchanted_book item/ender_pearl item/blaze_rod item/blaze_powder
item/nether_star item/name_tag item/lead item/compass item/clock item/map item/bone
item/rotten_flesh item/gold_nugget item/iron_nugget item/wheat item/wheat_seeds item/egg
item/snowball item/slime_ball item/magma_cream item/totem_of_undying item/nether_wart
item/potion item/splash_potion item/glass_bottle item/experience_bottle item/spawn_egg
`;

export const KNOWN_VANILLA_TEXTURES = new Set(
  KNOWN_VANILLA_TEXTURES_RAW.split(/\s+/).map((s) => s.trim()).filter(Boolean),
);

/** Is this texture (by relative path, e.g. block/stone) a known vanilla texture? */
export function isKnownVanillaTexture(texRelPath: string): boolean {
  return KNOWN_VANILLA_TEXTURES.has(normTex(texRelPath));
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

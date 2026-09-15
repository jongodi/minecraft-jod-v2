// Shared datapack data — used by DatapacksSection and the update-checker API.
// To enable automatic update checking, set `source` to 'modrinth' or 'github'
// and fill in the corresponding `modrinthSlug` or `githubRepo` field.
// Leave `source: 'manual'` for packs not hosted on a supported platform.

export type DatapackSource = 'modrinth' | 'github' | 'manual';

export interface DatapackMeta {
  id:           number;
  name:         string;
  description:  string;
  category:     string;
  // Update-tracking fields
  source:       DatapackSource;
  // Modrinth project slug (human-readable URL slug, e.g. "dungeons-and-taverns")
  modrinthSlug?: string;
  // GitHub repo in "owner/repo" format, e.g. "author/my-datapack"
  githubRepo?:  string;
  // The version currently installed on the server
  currentVersion?: string;
  // Minecraft game version to filter update checks against
  gameVersion:  string;
  // Unique substring of the actual filename/folder in /world/datapacks — used by the
  // auto-sync feature to identify this pack regardless of naming conventions.
  // Set to a distinctive part of the name that won't match other packs.
  serverFile?:  string;
}

export const DATAPACKS: DatapackMeta[] = [
  {
    id:             1,
    name:           'MVP',
    description:    'Fleiri málverk í stíl við upprunalega leikinn',
    category:       'BUILD',
    source:         'modrinth',
    modrinthSlug:   'mvp',
    currentVersion: '1.0',
    gameVersion:    '26.1',
    serverFile:     'More Vanilla Paintings',   // "[1.20.x] More Vanilla Paintings v1.0"
  },
  {
    id:             2,
    name:           'Banner Flags',
    description:    'Settu fána niður hvar sem er í heiminum',
    category:       'BUILD',
    source:         'modrinth',
    modrinthSlug:   'banner-flags',
    currentVersion: '3.0.1',
    gameVersion:    '26.1',
    serverFile:     'banner-flags',             // "banner-flags-v3-0-1"
  },
  {
    id:             3,
    name:           'Call of the King',
    description:    'Gerir verurnar RISASTÓRAR!',
    category:       'COMBAT',
    source:         'modrinth',
    modrinthSlug:   'call-of-the-king',
    currentVersion: '1.1',
    gameVersion:    '1.21.11',
    serverFile:     'call_of_the_king',         // "call_of_the_king-1.21.9-10"
  },
  {
    id:             4,
    name:           'Colored Name Teams',
    description:    'Sýnir lituð liðsnöfn fyrir ofan leikmenn',
    category:       'SOCIAL',
    source:         'modrinth',
    modrinthSlug:   'colorednameteams',
    currentVersion: '1.0.3',
    gameVersion:    '1.21.11',
    serverFile:     'ColeredNameTeams',         // "ColeredNameTeams (1.0.3)" — typo is in the folder
  },
  {
    id:             5,
    name:           'Dungeons & Taverns',
    description:    'Ný og endurbætt dýflissu- og kráarmannvirki í heiminum',
    category:       'STRUCTURE',
    source:         'modrinth',
    modrinthSlug:   'dungeons-and-taverns',
    currentVersion: '5.2.0',
    gameVersion:    '26.1',
    serverFile:     'Dungeons and Taverns',     // "Dungeons and Taverns v5.2.0"
  },
  {
    id:             6,
    name:           'Ghast Mayhem',
    description:    'Elddraugar á fullri ferð!',
    category:       'COMBAT',
    source:         'modrinth',
    modrinthSlug:   'ghast-mayhem',
    currentVersion: '1.3',
    gameVersion:    '26.1',
    serverFile:     'GM-',                      // "GM-1_3" — hyphen makes it distinct from "gm4_"
  },
  {
    id:             7,
    name:           'Holographic Tags',
    description:    'Sýnir svífandi textamerki',
    category:       'SOCIAL',
    source:         'modrinth',
    modrinthSlug:   'gm4-holographic-tags',
    currentVersion: '1.6.1',
    gameVersion:    '26.1',
    serverFile:     'gm4_holographic_tags',     // "gm4_holographic_tags_26_1"
  },
  {
    id:             8,
    name:           'LY Graves',
    description:    'Gröf birtist þar sem þú deyrð og dótið þitt helst öruggt',
    category:       'SURVIVAL',
    source:         'modrinth',
    modrinthSlug:   'ly-graves',
    currentVersion: '3.0.0',
    gameVersion:    '26.1',
    serverFile:     'Graves',                   // "Graves v3.0.0 [1.21.11]"
  },
  {
    id:             9,
    name:           'Show Player Health',
    description:    "Sjáðu heilsu annarra leikmanna í listanum sem opnast með Tab",
    category:       'SOCIAL',
    source:         'modrinth',
    modrinthSlug:   'show-player-health',
    currentVersion: '2.2.0',
    gameVersion:    '26.1',
    serverFile:     'Health',                   // "Health-2.2.0"
  },
  {
    id:             10,
    name:           'Better Mineshaft',
    description:    'Alveg endurhannaðar námur til að kanna',
    category:       'STRUCTURE',
    source:         'modrinth',
    modrinthSlug:   'hopo-better-mineshaft',
    currentVersion: '1.3.6-datapack',
    gameVersion:    '26.1',
    serverFile:     'hopobettermineshaft',       // "hopobettermineshaft-26-1-1-3-6"
  },
  {
    id:             11,
    name:           'MC Paint',
    description:    'Búðu til þín eigin myndpunktamálverk í leiknum',
    category:       'BUILD',
    source:         'modrinth',
    modrinthSlug:   'mc-paint',
    currentVersion: '1.7.0',
    gameVersion:    '1.21.11',
    serverFile:     'mc_paint',                 // "mc_paint_v1.7.0_data_pack"
  },
  {
    id:             12,
    name:           'Waystones',
    description:    'Settu niður ferðasteina til að ferðast hratt um heiminn',
    category:       'QOL',
    source:         'modrinth',
    modrinthSlug:   'waystones-data-pack',
    currentVersion: '3.5.1',
    gameVersion:    '26.1',
    serverFile:     'pk_waystones',             // "pk_waystones_V.3.5.1_mc_26.1"
  },
  {
    id:             13,
    name:           'Vanilla Refresh',
    description:    'Nýir hlutir, uppskriftir og eiginleikar í anda upprunalega leiksins',
    category:       'QOL',
    source:         'modrinth',
    modrinthSlug:   'vanilla-refresh',
    currentVersion: '1.4.30',
    gameVersion:    '26.1',
  },
  {
    id:             14,
    name:           'Wabi-Sabi Structures',
    description:    'Mannvirki innblásin af Japan á víð og dreif um heiminn',
    category:       'STRUCTURE',
    source:         'modrinth',
    modrinthSlug:   'wabi-sabi-structures',
    currentVersion: '3.0.5',
    gameVersion:    '1.21.11',
    serverFile:     'Wabi-Sabi Structures',     // "Wabi-Sabi Structures-3.0.5-1.21.11 Datapack"
  },
];

export const CATEGORY_COLORS: Record<string, string> = {
  BUILD:     '#00ff41',
  SURVIVAL:  '#ff6b35',
  QOL:       '#4ecdc4',
  LOOT:      '#f7dc6f',
  WORLD:     '#95e1d3',
  TRADE:     '#c9b1ff',
  CRAFT:     '#ff9ff3',
  COMBAT:    '#ff4466',
  SOCIAL:    '#c9b1ff',
  STRUCTURE: '#f0a500',
};

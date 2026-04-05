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
}

export const DATAPACKS: DatapackMeta[] = [
  {
    id:             1,
    name:           'MVP',
    description:    'More Vanilla Paintings',
    category:       'BUILD',
    source:         'modrinth',
    modrinthSlug:   'mvp',
    currentVersion: '1.0',
    gameVersion:    '26.1',
  },
  {
    id:             2,
    name:           'Banner Flags',
    description:    'Plant banners as flags anywhere in the world',
    category:       'BUILD',
    source:         'modrinth',
    modrinthSlug:   'banner-flags',
    currentVersion: '3.0.1',
    gameVersion:    '26.1',
  },
  {
    id:             3,
    name:           'Call of the King',
    description:    'Makes mobs HUGE!',
    category:       'COMBAT',
    source:         'modrinth',
    modrinthSlug:   'call-of-the-king',
    currentVersion: '1.1',
    gameVersion:    '1.21.11',
  },
  {
    id:             4,
    name:           'Colored Name Teams',
    description:    'Color-coded team nametags visible above players',
    category:       'SOCIAL',
    source:         'modrinth',
    modrinthSlug:   'colorednameteams',
    currentVersion: '1.0.3',
    gameVersion:    '1.21.11',
  },
  {
    id:             5,
    name:           'Dungeons & Taverns',
    description:    'Overhauled dungeons and tavern structures in worldgen',
    category:       'STRUCTURE',
    source:         'modrinth',
    modrinthSlug:   'dungeons-and-taverns',
    currentVersion: '5.2.0',
    gameVersion:    '26.1',
  },
  {
    id:             6,
    name:           'Ghast Mayhem',
    description:    'Speedy ghasts!',
    category:       'COMBAT',
    source:         'modrinth',
    modrinthSlug:   'ghast-mayhem',
    currentVersion: '1.3',
    gameVersion:    '26.1',
  },
  {
    id:             7,
    name:           'Holographic Tags',
    description:    'Floating holographic text displayed!',
    category:       'SOCIAL',
    source:         'modrinth',
    modrinthSlug:   'gm4-holographic-tags',
    currentVersion: '1.6.1',
    gameVersion:    '26.1',
  },
  {
    id:             8,
    name:           'LY Graves',
    description:    'A grave marks your death — your loot stays safe',
    category:       'SURVIVAL',
    source:         'modrinth',
    modrinthSlug:   'ly-graves',
    currentVersion: '3.0.0',
    gameVersion:    '26.1',
  },
  {
    id:             9,
    name:           'Show Player Health',
    description:    "See other players' health in TAB list",
    category:       'SOCIAL',
    source:         'modrinth',
    modrinthSlug:   'show-player-health',
    currentVersion: '2.2.0',
    gameVersion:    '26.1',
  },
  {
    id:             10,
    name:           'Better Mineshaft',
    description:    'Completely redesigned mineshaft structures to explore',
    category:       'STRUCTURE',
    source:         'modrinth',
    modrinthSlug:   'hopo-better-mineshaft',
    currentVersion: '1.3.6-datapack',
    gameVersion:    '26.1',
  },
  {
    id:             11,
    name:           'MC Paint',
    description:    'Create custom pixel-art paintings in-game',
    category:       'BUILD',
    source:         'modrinth',
    modrinthSlug:   'mc-paint',
    currentVersion: '1.7.0',
    gameVersion:    '1.21.11',
  },
  {
    id:             12,
    name:           'Waystones',
    description:    'Place waystones to fast-travel across the world',
    category:       'QOL',
    source:         'modrinth',
    modrinthSlug:   'waystones-data-pack',
    currentVersion: '3.5.1',
    gameVersion:    '26.1',
  },
  {
    id:             13,
    name:           'Vanilla Refresh',
    description:    'New items, recipes and mechanics that feel vanilla',
    category:       'QOL',
    source:         'modrinth',
    modrinthSlug:   'vanilla-refresh',
    currentVersion: '1.4.30',
    gameVersion:    '26.1',
  },
  {
    id:             14,
    name:           'Wabi-Sabi Structures',
    description:    'Japanese-inspired structures scattered across the world',
    category:       'STRUCTURE',
    source:         'modrinth',
    modrinthSlug:   'wabi-sabi-structures',
    currentVersion: '3.0.5',
    gameVersion:    '1.21.11',
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

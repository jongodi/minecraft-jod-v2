export const SERVER_IP = 'play.jodcraft.world';

export const CREW = [
  'stebbias', 'AmmaGaur', 'joenana', 'ingunnbirta',
  'Gamla123', 'fafnir1994', 'IMlonely', 'eikibleiki',
] as const;

export const headUrl = (name: string, size = 128) => `https://mc-heads.net/head/${name}/${size}`;
export const headFallback = (name: string, size = 128) => `https://minotar.net/helm/${name}/${size}`;

export interface NavLink { label: string; href: string; id?: string }

export const HOME_LINKS: NavLink[] = [
  { label: 'Camp',      href: '#camp',      id: 'camp'      },
  { label: 'Territory', href: '#territory', id: 'territory' },
  { label: 'Postcards', href: '#postcards', id: 'postcards' },
  { label: 'Showdown',  href: '#showdown',  id: 'showdown'  },
  { label: 'Tallies',   href: '#tallies',   id: 'tallies'   },
  { label: 'Crew',      href: '/crew' },
];

export const PAGE_LINKS: NavLink[] = [
  { label: 'Camp',      href: '/#camp'      },
  { label: 'Territory', href: '/#territory' },
  { label: 'Postcards', href: '/#postcards' },
  { label: 'Showdown',  href: '/#showdown'  },
  { label: 'Tallies',   href: '/#tallies'   },
  { label: 'Crew',      href: '/crew'       },
];

export interface Plate { id: string; src: string; title: string; sub: string }

/* Used until /api/gallery answers, and if it never does. */
export const PLATES: Plate[] = [
  { id: '1',  src: '/screenshots/the-castle.webp',     title: 'Goði Castle',      sub: 'Far away lands'          },
  { id: '2',  src: '/screenshots/spawn-hill.webp',     title: 'Joð Ville',        sub: 'Old base, spawn'         },
  { id: '3',  src: '/screenshots/cherry-estate.webp',  title: 'Pink Estate',      sub: 'Old base'                },
  { id: '4',  src: '/screenshots/j-club.webp',         title: 'J Club',           sub: 'Secret underground club' },
  { id: '5',  src: '/screenshots/mushroom-isle.webp',  title: 'Mushroom Island',  sub: 'Shroomy heaven'          },
  { id: '6',  src: '/screenshots/the-hall.webp',       title: 'Potions Tower',    sub: 'New base'                },
  { id: '7',  src: '/screenshots/waterfront.webp',     title: 'Venice',           sub: 'New base, coastal'       },
  { id: '8',  src: '/screenshots/the-tavern.webp',     title: 'City Hall',        sub: 'New base'                },
  { id: '9',  src: '/screenshots/the-village.webp',    title: 'The Village',      sub: 'New base, main street'   },
  { id: '10', src: '/screenshots/balloon-island.webp', title: 'Balloon Paradise', sub: 'New base, from above'    },
  { id: '11', src: '/screenshots/night-sky.webp',      title: 'New Town',         sub: 'New base at night'       },
];

/* Gallery titles are stored in caps by the admin panel; show them as names. */
export function titleCase(s: string): string {
  return s.toLowerCase().replace(/(^|[\s(])([a-zð])/g, (_, p, c) => p + c.toUpperCase());
}
export function sentenceCase(s: string): string {
  const t = s.toLowerCase().replace(/\s*·\s*/g, ', ');
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export const STAT_TABS = [
  { id: 'playTimeHours',  label: 'Playtime', unit: (v: number) => `${v} h` },
  { id: 'mobKills',       label: 'Kills',    unit: (v: number) => v.toLocaleString('en-GB') },
  { id: 'deaths',         label: 'Deaths',   unit: (v: number) => v.toLocaleString('en-GB') },
  { id: 'itemsCrafted',   label: 'Crafted',  unit: (v: number) => v.toLocaleString('en-GB') },
  { id: 'distanceWalked', label: 'Walked',   unit: (v: number) => `${(v / 100000).toFixed(1)} km` },
] as const;
export type StatKey = typeof STAT_TABS[number]['id'];

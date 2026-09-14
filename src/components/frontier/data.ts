export const SERVER_IP = 'play.jodcraft.world';

export const CREW = [
  'stebbias', 'AmmaGaur', 'joenana', 'ingunnbirta',
  'Gamla123', 'fafnir1994', 'IMlonely', 'eikibleiki',
] as const;

export const headUrl = (name: string, size = 128) => `https://mc-heads.net/head/${name}/${size}`;
export const headFallback = (name: string, size = 128) => `https://minotar.net/helm/${name}/${size}`;

export interface NavLink { label: string; href: string; id?: string }

export const HOME_LINKS: NavLink[] = [
  { label: 'Búðirnar',      href: '#camp',      id: 'camp'      },
  { label: 'Landakort', href: '#territory', id: 'territory' },
  { label: 'Myndaalbúm', href: '#postcards', id: 'postcards' },
  { label: 'Einvígi',  href: '#showdown',  id: 'showdown'  },
  { label: 'Tölfræði',   href: '#tallies',   id: 'tallies'   },
  { label: 'Hópurinn',      href: '/crew' },
];

export const PAGE_LINKS: NavLink[] = [
  { label: 'Búðirnar',      href: '/#camp'      },
  { label: 'Landakort', href: '/#territory' },
  { label: 'Myndaalbúm', href: '/#postcards' },
  { label: 'Einvígi',  href: '/#showdown'  },
  { label: 'Tölfræði',   href: '/#tallies'   },
  { label: 'Hópurinn',      href: '/crew'       },
];

export interface Plate { id: string; src: string; title: string; sub: string }

/* Used until /api/gallery answers, and if it never does. */
export const PLATES: Plate[] = [
  { id: '1',  src: '/screenshots/the-castle.webp',     title: 'Kastali Goða',      sub: 'Fjarlæg lönd'          },
  { id: '2',  src: '/screenshots/spawn-hill.webp',     title: 'Joðbær',        sub: 'Gamla byggðin, upphafsstaður'         },
  { id: '3',  src: '/screenshots/cherry-estate.webp',  title: 'Bleika setrið',      sub: 'Gamla byggðin'                },
  { id: '4',  src: '/screenshots/j-club.webp',         title: 'J-klúbburinn',           sub: 'Leynilegur klúbbur neðanjarðar' },
  { id: '5',  src: '/screenshots/mushroom-isle.webp',  title: 'Sveppaeyja',  sub: 'Sveppaparadís'          },
  { id: '6',  src: '/screenshots/the-hall.webp',       title: 'Seyðaturninn',    sub: 'Nýja byggðin'                },
  { id: '7',  src: '/screenshots/waterfront.webp',     title: 'Feneyjar',           sub: 'Nýja byggðin, við ströndina'       },
  { id: '8',  src: '/screenshots/the-tavern.webp',     title: 'Ráðhúsið',        sub: 'Nýja byggðin'                },
  { id: '9',  src: '/screenshots/the-village.webp',    title: 'Þorpið',      sub: 'Nýja byggðin, aðalgatan'   },
  { id: '10', src: '/screenshots/balloon-island.webp', title: 'Blöðruparadís', sub: 'Nýja byggðin, úr lofti'    },
  { id: '11', src: '/screenshots/night-sky.webp',      title: 'Nýibær',         sub: 'Nýja byggðin að nóttu'       },
];

/* Gallery titles are stored in caps by the admin panel; show them as names. */
export function titleCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
export function sentenceCase(s: string): string {
  const t = s.toLowerCase().replace(/\s*·\s*/g, ', ');
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export const STAT_TABS = [
  { id: 'playTimeHours',  label: 'Spilatími', unit: (v: number) => `${v.toLocaleString('is-IS')} klst.` },
  { id: 'mobKills',       label: 'Verur felldar',    unit: (v: number) => v.toLocaleString('is-IS') },
  { id: 'deaths',         label: 'Dauðsföll',   unit: (v: number) => v.toLocaleString('is-IS') },
  { id: 'itemsCrafted',   label: 'Smíðað',  unit: (v: number) => v.toLocaleString('is-IS') },
  { id: 'distanceWalked', label: 'Gengið',   unit: (v: number) => `${(v / 100000).toLocaleString('is-IS', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} km` },
] as const;
export type StatKey = typeof STAT_TABS[number]['id'];

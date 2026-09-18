export const SERVER_IP = 'play.jodcraft.world';

export const CREW = [
  'stebbias', 'AmmaGaur', 'joenana', 'ingunnbirta',
  'Gamla123', 'fafnir1994', 'IMlonely', 'eikibleiki',
] as const;

/* Heads are asked for at four times their CSS size so the 8 by 8 face stays sharp on any screen. */
export const headUrl = (name: string, size = 512) => `https://mc-heads.net/head/${name}/${size}`;
export const headFallback = (name: string, size = 512) => `https://minotar.net/helm/${name}/${size}`;

export interface NavLink { label: string; href: string; id?: string }

/* The evening, in order. Each id is a section on the home page and a lantern on the rail. */
export const SECTIONS: NavLink[] = [
  { label: 'Sólsetur',   href: '#top',        id: 'top'        },
  { label: 'Búðirnar',   href: '#camp',       id: 'camp'       },
  { label: 'Landakort',  href: '#territory',  id: 'territory'  },
  { label: 'Myndaalbúm', href: '#postcards',  id: 'postcards'  },
  { label: 'Einvígi',    href: '#showdown',   id: 'showdown'   },
  { label: 'Tölfræði',   href: '#tallies',    id: 'tallies'    },
  { label: 'Pakkar',     href: '#provisions', id: 'provisions' },
  { label: 'Komdu inn',  href: '#ride',       id: 'ride'       },
];

export const HOME_LINKS: NavLink[] = [
  ...SECTIONS.filter(s => s.id !== 'top'),
  { label: 'Hópurinn', href: '/crew' },
];

export const PAGE_LINKS: NavLink[] = HOME_LINKS.map(l => (l.href.startsWith('#') ? { label: l.label, href: `/${l.href}` } : l));

/* The view Heimskort opens on, in BlueMap's own link format:
   map:x:y:z:distance:rotation:angle:tilt:ortho:mode. To change it, open the map
   full screen, frame the view you want and copy everything after the # in the
   address bar. Passing it in the link beats webapp.conf's start-location, which
   has to survive the server, the sync and whatever the viewer remembered. */
export const MAP_START_VIEW = 'world:-6915:58:-8925:65:2.32:1.1:0:0:perspective';
export const MAP_URL = `/bluemap/index.html#${MAP_START_VIEW}`;

export interface Plate { id: string; src: string; title: string; sub: string }

/* Used until /api/gallery answers, and if it never does. */
export const PLATES: Plate[] = [
  { id: '1',  src: '/screenshots/the-castle.webp',     title: 'Kastali Goða',   sub: 'Fjarlæg lönd'                   },
  { id: '2',  src: '/screenshots/spawn-hill.webp',     title: 'Joðbær',         sub: 'Gamla byggðin, upphafsstaður'   },
  { id: '3',  src: '/screenshots/cherry-estate.webp',  title: 'Bleika setrið',  sub: 'Gamla byggðin'                  },
  { id: '4',  src: '/screenshots/j-club.webp',         title: 'J-klúbburinn',   sub: 'Leynilegur klúbbur neðanjarðar' },
  { id: '5',  src: '/screenshots/mushroom-isle.webp',  title: 'Sveppaeyja',     sub: 'Sveppaparadís'                  },
  { id: '6',  src: '/screenshots/the-hall.webp',       title: 'Seyðaturninn',   sub: 'Nýja byggðin'                   },
  { id: '7',  src: '/screenshots/waterfront.webp',     title: 'Feneyjar',       sub: 'Nýja byggðin, við ströndina'    },
  { id: '8',  src: '/screenshots/the-tavern.webp',     title: 'Ráðhúsið',       sub: 'Nýja byggðin'                   },
  { id: '9',  src: '/screenshots/the-village.webp',    title: 'Þorpið',         sub: 'Nýja byggðin, aðalgatan'        },
  { id: '10', src: '/screenshots/balloon-island.webp', title: 'Blöðruparadís',  sub: 'Nýja byggðin, úr lofti'         },
  { id: '11', src: '/screenshots/night-sky.webp',      title: 'Nýibær',         sub: 'Nýja byggðin að nóttu'          },
];

/* Older versions of the admin panel stored every caption in caps. Text typed
   since then keeps the casing the admin chose; only shouting gets calmed down. */
export function isShouting(s: string): boolean {
  return s.length > 3 && s === s.toLocaleUpperCase('is-IS') && s !== s.toLocaleLowerCase('is-IS');
}
export function titleCase(s: string): string {
  const t = isShouting(s) ? s.toLocaleLowerCase('is-IS') : s;
  return t.charAt(0).toLocaleUpperCase('is-IS') + t.slice(1);
}
export function sentenceCase(s: string): string {
  const t = (isShouting(s) ? s.toLocaleLowerCase('is-IS') : s).replace(/\s*·\s*/g, ', ');
  return t.charAt(0).toLocaleUpperCase('is-IS') + t.slice(1);
}
/* For labels on the map: as typed, or lowercase if it was stored in caps. */
export function handCase(s: string): string {
  return isShouting(s) ? s.toLocaleLowerCase('is-IS') : s;
}

export const STAT_TABS = [
  { id: 'playTimeHours',  label: 'Spilatími',     unit: (v: number) => `${v.toLocaleString('is-IS')} klst.` },
  { id: 'mobKills',       label: 'Verur felldar', unit: (v: number) => v.toLocaleString('is-IS') },
  { id: 'deaths',         label: 'Dauðsföll',     unit: (v: number) => v.toLocaleString('is-IS') },
  { id: 'itemsCrafted',   label: 'Smíðað',        unit: (v: number) => v.toLocaleString('is-IS') },
  { id: 'distanceWalked', label: 'Gengið',        unit: (v: number) => `${(v / 100000).toLocaleString('is-IS', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} km` },
] as const;
export type StatKey = typeof STAT_TABS[number]['id'];

/* The three steps that were posted before, kept word for word. */
export const RIDE_STEPS = [
  { title: 'Java-útgáfan',   text: 'Nýleg Java-útgáfa af Minecraft.' },
  { title: 'Boð',            text: 'Vantar þig aðgang? Heyrðu í einhverju okkar.' },
  { title: 'Vistfangið',     text: 'Opnaðu fjölspilun, bættu við þjóni og límdu vistfangið inn.' },
] as const;

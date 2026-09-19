export const SERVER_IP = 'play.jodcraft.world';

export const CREW = [
  'stebbias', 'AmmaGaur', 'joenana', 'ingunnbirta',
  'Gamla123', 'fafnir1994', 'IMlonely', 'eikibleiki',
] as const;

/* Heads are asked for at four times their CSS size so the 8 by 8 face stays
   sharp on any screen. Minotar first: mc-heads keeps a separate cache per
   size, and a changed skin sat as the old one there for days at the sizes the
   page uses while the small sizes had already moved on. */
export const headUrl = (name: string, size = 512) => `https://minotar.net/helm/${name}/${size}`;
export const headFallback = (name: string, size = 512) => `https://mc-heads.net/head/${name}/${size}`;
/* The whole skin, front on, for the profile page. `size` is the width; the picture is twice as tall. */
export const bodyUrl = (name: string, size = 256) => `https://minotar.net/armor/body/${name}/${size}.png`;
export const bodyFallback = (name: string, size = 256) => `https://mc-heads.net/body/${name}/${size}`;

export interface NavLink { label: string; href: string; id?: string }

/* The three doors of the evening, each a lantern in the bar (a tab on phones).
   The first is the world itself; the other two are rooms that open over it.
   A door's id is also the hash that opens it, so /#hopur works from anywhere. */
export type DoorId = 'heimur' | 'hopur' | 'hillan';
export const SECTIONS: (NavLink & { id: DoorId })[] = [
  { label: 'Heimurinn', href: '#heimur', id: 'heimur' },
  { label: 'Eftirlýst', href: '#hopur',  id: 'hopur'  },   /* the crew's room: the wanted board is what it is named for */
  { label: 'Hillan',    href: '#hillan', id: 'hillan' },
];
export const ROOMS = ['hopur', 'hillan'] as const;
export type RoomId = typeof ROOMS[number];
export const isRoom = (s: string | null | undefined): s is RoomId => s === 'hopur' || s === 'hillan';

/* The same doors from another page: they lead back to the home page's sections. */
export const PAGE_LINKS = SECTIONS.map(l => ({ label: l.label, href: `/${l.href}`, id: l.id }));

/* The view the 3D map opens on, in BlueMap's own link format:
   map:x:y:z:distance:rotation:angle:tilt:ortho:mode. To change it, open the map
   full screen, frame the view you want and copy everything after the # in the
   address bar. Passing it in the link beats webapp.conf's start-location, which
   has to survive the server, the sync and whatever the viewer remembered. */
export const MAP_START_VIEW = 'world:-6890:57:-8919:65:2.03:1.08:0:0:perspective';
export const MAP_URL = `/bluemap/index.html#${MAP_START_VIEW}`;

/* The still the world opens as: one screenshot of the start view, taken by
   `npm run map:poster`. The viewer itself only loads when someone asks for it. */
export const MAP_POSTER = '/map-poster.webp';

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

const num = (v: number) => v.toLocaleString('is-IS');
const km  = (cm: number) => `${(cm / 100000).toLocaleString('is-IS', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} km`;
/* a stretch of game time, from ticks: days and hours, whole hours under a day, minutes under an hour */
const span = (ticks: number) => {
  const h = Math.floor(ticks / 72000);
  if (h >= 24) return `${Math.floor(h / 24)} d. ${h % 24} klst.`;
  if (h > 0) return `${h} klst.`;
  return `${Math.floor(ticks / 1200)} mín.`;
};

const ms = (v: number) => `${num(v)} ms`;

/* The wanted board. Every category is a crime, and the poster names the
   outlaw the way a real one would: by the nickname first, the charge under it.
   `low` marks the one charge where less is more: the fastest draw at the campfire. */
export const STAT_TABS = [
  { id: 'playTimeHours',  nick: 'Innipúkinn',     label: 'Spilatími',                  unit: (v: number) => `${num(v)} klst.` },
  { id: 'mobKills',       nick: 'Slátrarinn',     label: 'Verur felldar',              unit: num },
  { id: 'deaths',         nick: 'Draugurinn',     label: 'Dauðsföll',                  unit: num },
  { id: 'timeSinceDeath', nick: 'Ódauðlegi',      label: 'Tími frá síðasta dauða', unit: span },
  { id: 'timeSinceRest',  nick: 'Vökustaurinn',   label: 'Tími frá því síðast var sofið', unit: span },
  { id: 'travelCm',       nick: 'Flakkarinn',     label: 'Ferðalangur, á eigin fótum', unit: km },
  { id: 'damageRatio',    nick: 'Boxpúðinn',      label: 'Skaði þeginn á móti veittum', unit: (v: number) => `${v.toLocaleString('is-IS', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}×` },
  { id: 'raidWins',       nick: 'Ræningjabaninn', label: 'Árásir hraktar',             unit: num },
  { id: 'recordsPlayed',  nick: 'Plötusnúðurinn', label: 'Plötur spilaðar',            unit: num },
  { id: 'drawMs',         nick: 'Fógetinn',       label: 'Hraðasta skotið við varðeldinn', unit: ms, low: true },
] as const;
export const isLowerBetter = (id: StatKey) => STAT_TABS.some(t => t.id === id && 'low' in t && t.low);
export type StatKey = typeof STAT_TABS[number]['id'];

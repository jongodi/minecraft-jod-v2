/* Everything the home page is drawn with on the server, so the hero is
   complete at first paint and nothing moves when the browser's own answers
   arrive: the server's status, the play nights, the gallery, the map and
   what the crew pinned at each place, and the time of year. The page is
   regenerated every half minute (revalidate in src/app/page.tsx), so none of
   it is older than that plus a status answer's own keep. Each read has a
   fallback and a short cap: a store that is slow or down costs a few seconds
   of regeneration, never the page. Server only. */
import { getStatus } from '@/lib/server-status';
import { NO_STATUS, toServerState, type ServerState } from '@/lib/server-state';
import { NO_NIGHTS, viewNights, type PlayNightResponse } from '@/lib/play-night-view';
import { readGallery } from '@/lib/gallery';
import { readMap } from '@/lib/map';
import { placePrints, type PlacePrints } from '@/lib/crew-places';
import { DEFAULT_CONFIG, woodOf, type MapConfig } from '@/lib/map-types';
import { PLATES, sentenceCase, titleCase, type Plate } from '@/components/badlands/data';
import { seasonAt, type Season } from '@/lib/season';
import { getPublicPacks } from '@/lib/datapacks-store';
import { DATAPACKS } from '@/data/datapacks';
import { getCachedStats } from '@/lib/stats';
import { ADVANCEMENT_COUNT, readStoredAdvancements } from '@/lib/advancements';
import { heldNights, type HeldNight } from '@/lib/play-night';
import { formatNumber } from '@/lib/format';
import { freshPlaces } from '@/lib/bluemap-snapshot';
import { sleeplessOf } from '@/lib/sleepless';

export interface HomeData {
  status: ServerState;
  nights: PlayNightResponse;
  plates: Plate[];
  map: MapConfig;
  pinned: Record<string, PlacePrints>;
  season: Season;
  /** how many packs stand on the shelf, for its way in under the hero's lantern */
  packs: number;
  /** the world's own numbers, as splash lines over the Ð (Hero.tsx) */
  facts: string[];
  /** the places whose ground changed in the newest copy of the map, while that is news */
  fresh: number[];
  /** who has gone three of the game's days without a bed, by name in lower case, to the nights awake, as the stats last counted them (src/lib/sleepless.ts) */
  sleepless: Record<string, number>;
}

/** Facts counted from the world: the crew's hours in it, the advancements
    any of them has, the fires held, the mobs felled. Empty without a store.
    Who has not slept is read off the same stats, into `awake`. */
async function worldFacts(awake: Record<string, number> = {}): Promise<string[]> {
  const out: string[] = [];
  /* the nights and the copies live in the store; without one there are no numbers to count, and a build must not reach for it */
  if (!process.env.REDIS_URL) return out;
  const [stats, crew, nights] = await Promise.all([
    getCachedStats().catch(() => null),
    readStoredAdvancements().catch(() => null),
    heldNights().catch(() => [] as HeldNight[]),
  ]);
  if (stats) {
    /* from the ticks: each member's hours are floored, and eight floors lose most of a day */
    const hours = Math.round(stats.players.reduce((a, p) => a + (p.playTimeTicks ?? 0), 0) / 72000);
    const mobs = stats.players.reduce((a, p) => a + (p.mobKills ?? 0), 0);
    if (hours > 0) out.push(`${formatNumber(hours)} klukkustundir í heiminum!`);
    if (mobs > 0) out.push(`${formatNumber(mobs)} verur felldar!`);
    Object.assign(awake, sleeplessOf(stats.players));
  }
  if (crew) {
    const done = new Set(Object.values(crew.players).flatMap(d => Object.keys(d)));
    if (done.size > 0) out.push(`${done.size} af ${ADVANCEMENT_COUNT} afrekum!`);
  }
  /* every night held, the annals' too: the fires let one go a week after its evening */
  if (nights.length > 0) out.push(`${nights.length} spilakvöld við eldinn!`);
  return out;
}

const WAIT_MS = 5000;

/** The answer, or the fallback if it fails or takes longer than the cap. */
async function within<T>(work: Promise<T>, fallback: T): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const capped = new Promise<T>(resolve => { timer = setTimeout(() => resolve(fallback), WAIT_MS); });
  try { return await Promise.race([work.catch(() => fallback), capped]); }
  finally { clearTimeout(timer); }
}

export async function loadHomeData(): Promise<HomeData> {
  const now = Date.now();
  const sleepless: Record<string, number> = {};
  const [status, nights, gallery, map, pinned, packs, facts] = await Promise.all([
    within(getStatus({ live: false }).then(s => toServerState(s, now)), { ...NO_STATUS, online: false, life: 'unknown', checkedAt: now }),
    within(viewNights(null, now), NO_NIGHTS),
    within(readGallery(), []),
    within(readMap(), DEFAULT_CONFIG),
    within(placePrints(), {}),
    within(getPublicPacks().then(l => l.length), DATAPACKS.length),
    within(worldFacts(sleepless), []),
  ]);
  const shown = gallery.filter(p => p.active).sort((a, b) => a.order - b.order);
  return {
    status,
    nights,
    plates: shown.length ? shown.map(p => ({ id: p.id, src: p.filename, title: titleCase(p.title), sub: sentenceCase(p.sublabel) })) : PLATES,
    /* each place with the wood its tag on the rail wears, settled here so the page carries no default map to work it out */
    map: map.locations.length ? { locations: map.locations.map(l => ({ ...l, wood: woodOf(l) })), zones: map.zones ?? [], paths: map.paths ?? [], terrain: map.terrain } : DEFAULT_CONFIG,
    pinned,
    season: seasonAt(new Date(now)),
    packs,
    facts,
    fresh: freshPlaces(map.locations, now),
    sleepless,
  };
}

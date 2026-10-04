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
import { DEFAULT_CONFIG, type MapConfig } from '@/lib/map-types';
import { PLATES, sentenceCase, titleCase, type Plate } from '@/components/badlands/data';
import { seasonAt, type Season } from '@/lib/season';

export interface HomeData {
  status: ServerState;
  nights: PlayNightResponse;
  plates: Plate[];
  map: MapConfig;
  pinned: Record<string, PlacePrints>;
  season: Season;
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
  const [status, nights, gallery, map, pinned] = await Promise.all([
    within(getStatus().then(s => toServerState(s, now)), { ...NO_STATUS, online: false, life: 'unknown', checkedAt: now }),
    within(viewNights(null, now), NO_NIGHTS),
    within(readGallery(), []),
    within(readMap(), DEFAULT_CONFIG),
    within(placePrints(), {}),
  ]);
  const shown = gallery.filter(p => p.active).sort((a, b) => a.order - b.order);
  return {
    status,
    nights,
    plates: shown.length ? shown.map(p => ({ id: p.id, src: p.filename, title: titleCase(p.title), sub: sentenceCase(p.sublabel) })) : PLATES,
    map: map.locations.length ? { locations: map.locations, zones: map.zones ?? [], paths: map.paths ?? [], terrain: map.terrain } : DEFAULT_CONFIG,
    pinned,
    season: seasonAt(new Date(now)),
  };
}

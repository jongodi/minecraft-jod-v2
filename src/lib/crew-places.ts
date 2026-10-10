/* What the crew pinned at each place on the map, from their walls: how many
   things, and the newest few prints, so the world can show them under a
   postcard and count them on a chip. Answered by /api/crew/places and drawn
   into the home page on the server. Server only. */
import { readAllProfiles, type CrewPhoto } from '@/lib/crew';
import { readMap } from '@/lib/map';

/** The ids of the places on the map, which an entry may be pinned at; null
    when the map cannot be read just now. The read is the strict one: the
    lenient one answers a storage error with the built-in map, which would
    turn away a place the admin added. With no map to check against, a place
    is taken as given, as it was before places were checked at all. */
export async function mapPlaceIds(): Promise<Set<number> | null> {
  try { return new Set((await readMap({ strict: true })).locations.map(l => l.id)); }
  catch { return null; }
}

/** What the routes answer a place that is not on the map with. */
export const UNKNOWN_PLACE = 'Þessi staður er ekki á kortinu.';

/** A print pinned at a place, with whose wall it is on. */
export interface PlacePrint extends CrewPhoto { username: string; entryId: string }

/** For one place: how many things the crew pinned there, and the newest few prints. */
export interface PlacePrints { count: number; prints: PlacePrint[] }

const PRINTS_PER_PLACE = 6;

export async function placePrints(): Promise<Record<string, PlacePrints>> {
  const profiles = await readAllProfiles();
  const byPlace: Record<string, PlacePrints> = {};

  const entries = profiles
    .flatMap(p => p.entries.map(e => ({ ...e, username: p.username })))
    .filter(e => e.placeId !== null)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));

  for (const e of entries) {
    const key = String(e.placeId);
    const slot = (byPlace[key] ??= { count: 0, prints: [] });
    slot.count += 1;
    for (const photo of e.photos) {
      if (slot.prints.length >= PRINTS_PER_PLACE) break;
      slot.prints.push({ ...photo, username: e.username, entryId: e.id });
    }
  }

  return byPlace;
}

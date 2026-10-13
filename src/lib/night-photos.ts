/* Myndir kvöldsins: the screenshots taken on a play night, found on the walls
   with nobody tagging anything. The game names a screenshot by the moment it
   was taken (src/lib/crew-types.ts reads it off the name), so a picture taken
   from the half hour the server could be started until the evening was over
   belongs to that night. */
import { EVENING_MS, START_BEFORE_MS } from '@/lib/play-night';
import type { CrewProfile } from '@/lib/crew-types';
import type { SignWood } from '@/lib/sign-wood';

export interface EveningPhoto {
  username: string;
  /** the entry it hangs in, for its link on the wall */
  entryId:  string;
  id:       string;
  filename: string;
  caption:  string;
  takenAt:  string;
  /** the wood of the place the entry belongs to, as the notice strip draws it */
  wood:     SignWood;
}

/** a night's pictures beyond this many stay on the walls */
export const MAX_EVENING_PHOTOS = 24;

/** The pictures taken during the evening at `at`, in the order they were taken. */
export function eveningPhotos(at: string, profiles: CrewProfile[], woodOf: (placeId: number | null) => SignWood = () => 'oak'): EveningPhoto[] {
  const start = Date.parse(at) - START_BEFORE_MS;
  const end = Date.parse(at) + EVENING_MS;
  const found: EveningPhoto[] = [];
  for (const p of profiles) {
    for (const e of p.entries) {
      for (const ph of e.photos) {
        const t = ph.takenAt ? Date.parse(ph.takenAt) : NaN;
        if (!(t >= start && t < end)) continue;
        found.push({ username: p.username, entryId: e.id, id: ph.id, filename: ph.filename, caption: ph.caption || e.text, takenAt: ph.takenAt!, wood: woodOf(e.placeId) });
      }
    }
  }
  return found.sort((a, b) => Date.parse(a.takenAt) - Date.parse(b.takenAt)).slice(0, MAX_EVENING_PHOTOS);
}

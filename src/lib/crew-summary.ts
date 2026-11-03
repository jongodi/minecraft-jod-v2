/* One line per member for the roll call and the crew's room: counts, the
   newest thing pinned, the cover print and when they were last in the game.
   Read on the server for /crew, so the posters and their prints are in the
   page's markup at first paint, and by /api/crew for the room and for the
   roll call's own refresh. Server only. */
import { readAllProfiles, allPhotos, coverPhoto } from '@/lib/crew';
import { readLastSeen } from '@/lib/crew-seen';

export interface CrewSummary {
  username:   string;
  bio:        string;
  entryCount: number;
  photoCount: number;
  /** when the newest thing was pinned; null for a bare wall */
  lastEntry:  string | null;
  cover:      string | null;
  bestDrawMs: number | null;
  /** when they were last in the game, as the status check saw it; null if never, or without the store */
  lastSeen:   string | null;
}

export async function crewSummaries(): Promise<CrewSummary[]> {
  const [profiles, seen] = await Promise.all([readAllProfiles(), readLastSeen().catch(() => ({} as Record<string, string>))]);
  return profiles.map(p => ({
    username:   p.username,
    bio:        p.bio,
    entryCount: p.entries.length,
    photoCount: allPhotos(p).length,
    lastEntry:  p.entries[0]?.createdAt ?? null,
    cover:      coverPhoto(p)?.filename ?? null,
    bestDrawMs: p.bestDrawMs,
    lastSeen:   seen[p.username] ?? null,
  }));
}

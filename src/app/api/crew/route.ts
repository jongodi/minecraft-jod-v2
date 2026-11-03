import { NextResponse } from 'next/server';
import { readAllProfiles, allPhotos, coverPhoto } from '@/lib/crew';
import { readLastSeen } from '@/lib/crew-seen';

export const dynamic = 'force-dynamic';

/** One line per member for the roll call and the room: counts, the newest
    entry and the cover print. */
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

export async function GET() {
  const [profiles, seen] = await Promise.all([readAllProfiles(), readLastSeen().catch(() => ({} as Record<string, string>))]);
  const rows: CrewSummary[] = profiles.map(p => ({
    username:   p.username,
    bio:        p.bio,
    entryCount: p.entries.length,
    photoCount: allPhotos(p).length,
    lastEntry:  p.entries[0]?.createdAt ?? null,
    cover:      coverPhoto(p)?.filename ?? null,
    bestDrawMs: p.bestDrawMs,
    lastSeen:   seen[p.username] ?? null,
  }));
  return NextResponse.json(rows, { headers: { 'Cache-Control': 'no-store' } });
}

import { NextResponse } from 'next/server';
import { readAllProfiles, allPhotos, coverPhoto } from '@/lib/crew';

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
}

export async function GET() {
  const profiles = await readAllProfiles();
  const rows: CrewSummary[] = profiles.map(p => ({
    username:   p.username,
    bio:        p.bio,
    entryCount: p.entries.length,
    photoCount: allPhotos(p).length,
    lastEntry:  p.entries[0]?.createdAt ?? null,
    cover:      coverPhoto(p)?.filename ?? null,
    bestDrawMs: p.bestDrawMs,
  }));
  return NextResponse.json(rows, { headers: { 'Cache-Control': 'no-store' } });
}

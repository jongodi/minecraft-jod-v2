import { NextRequest, NextResponse } from 'next/server';
import { readAllProfiles, type CrewEntry } from '@/lib/crew';

export const dynamic = 'force-dynamic';

/** An entry with the wall it hangs on. */
export interface FeedEntry extends CrewEntry { username: string }

const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 200;

/** What was pinned last, across every wall, newest first. `?limit=` caps it,
    `?photos=1` keeps only entries with a print. */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number(q.get('limit')) || DEFAULT_LIMIT));
  const onlyPhotos = q.get('photos') === '1';

  const profiles = await readAllProfiles();
  const entries: FeedEntry[] = profiles.flatMap(p => p.entries.map(e => ({ ...e, username: p.username })));
  const shown = (onlyPhotos ? entries.filter(e => e.photos.length > 0) : entries)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .slice(0, limit);

  return NextResponse.json(shown, { headers: { 'Cache-Control': 'no-store' } });
}

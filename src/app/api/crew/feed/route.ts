import { NextRequest, NextResponse } from 'next/server';
import { readAllProfiles, type CrewEntry } from '@/lib/crew';
import { readMap } from '@/lib/map';
import { woodOf } from '@/lib/map-types';
import type { SignWood } from '@/lib/sign-wood';

export const dynamic = 'force-dynamic';

/** An entry with the wall it hangs on, and the wood of the place it belongs to. */
export interface FeedEntry extends CrewEntry { username: string; wood: SignWood }

const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 200;

/** What was pinned last, across every wall, newest first. `?limit=` caps it,
    `?photos=1` keeps only entries with a print. */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number(q.get('limit')) || DEFAULT_LIMIT));
  const onlyPhotos = q.get('photos') === '1';

  const [profiles, map] = await Promise.all([readAllProfiles(), readMap().catch(() => null)]);
  const places = new Map((map?.locations ?? []).map(l => [l.id, l]));
  const entries: FeedEntry[] = profiles.flatMap(p => p.entries.map(e => ({
    ...e, username: p.username, wood: woodOf(e.placeId !== null ? places.get(e.placeId) : null),
  })));
  const shown = (onlyPhotos ? entries.filter(e => e.photos.length > 0) : entries)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .slice(0, limit);

  return NextResponse.json(shown, { headers: { 'Cache-Control': 'no-store' } });
}

import { NextResponse } from 'next/server';
import { readAllProfiles, type CrewPhoto } from '@/lib/crew';

export const dynamic = 'force-dynamic';

/** A print pinned at a place, with whose wall it is on. */
export interface PlacePrint extends CrewPhoto { username: string; entryId: string }

/** For each place on the map: how many things the crew pinned there, and the
    newest few prints, so the world can show them under the postcard. */
export interface PlacePrints { count: number; prints: PlacePrint[] }

const PRINTS_PER_PLACE = 6;

export async function GET() {
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

  return NextResponse.json(byPlace, { headers: { 'Cache-Control': 'no-store' } });
}

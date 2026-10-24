import { NextResponse } from 'next/server';
import { pastNights, type PastNight } from '@/lib/play-night';
import { summaryOf, type NightSummary } from '@/lib/night-numbers';
import { eveningPhotos, type EveningPhoto } from '@/lib/night-photos';
import { readAllProfiles } from '@/lib/crew';
import { readMap } from '@/lib/map';
import { woodOf } from '@/lib/map-types';
import { errorMessage } from '@/lib/icelandic';

/* Annáll: the play nights that have been (src/lib/play-night.ts), newest
   first, each with the screenshots the crew took that evening and pinned to
   their walls (src/lib/night-photos.ts) and what the game counted of it, as
   a summary (src/lib/night-numbers.ts). Asked for when the crew's room is
   first opened, never with the page. For anyone, as the nights are. */

export const dynamic = 'force-dynamic';

/** the annals as the room shows them; older nights stay in the store */
const SHOWN = 24;

export interface AnnalNight extends Omit<PastNight, 'numbers'> { photos: EveningPhoto[]; numbers: NightSummary | null }
export interface AnnalsResponse { nights: AnnalNight[] }

export async function GET() {
  if (!process.env.REDIS_URL) return NextResponse.json({ nights: [] } satisfies AnnalsResponse);
  try {
    const [nights, profiles, map] = await Promise.all([pastNights(), readAllProfiles(), readMap().catch(() => null)]);
    const places = new Map((map?.locations ?? []).map(l => [l.id, l]));
    const wood = (id: number | null) => woodOf(id !== null ? places.get(id) : null);
    return NextResponse.json(
      { nights: nights.slice(0, SHOWN).map(({ numbers, ...n }) => ({ ...n, photos: eveningPhotos(n.at, profiles, wood), numbers: summaryOf(numbers) })) } satisfies AnnalsResponse,
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (e) {
    return NextResponse.json({ error: errorMessage(e) }, { status: 500 });
  }
}

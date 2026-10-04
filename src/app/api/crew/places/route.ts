import { NextResponse } from 'next/server';
import { placePrints } from '@/lib/crew-places';

export const dynamic = 'force-dynamic';

export type { PlacePrint, PlacePrints } from '@/lib/crew-places';

/** For each place on the map: how many things the crew pinned there, and the
    newest few prints (src/lib/crew-places.ts). The home page is drawn with the
    same answer on the server; this is for anything that asks later. */
export async function GET() {
  return NextResponse.json(await placePrints(), { headers: { 'Cache-Control': 'no-store' } });
}

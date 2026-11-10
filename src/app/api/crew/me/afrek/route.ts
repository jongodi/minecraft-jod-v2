import { NextResponse } from 'next/server';
import { getCrewSession } from '@/lib/crew';
import { ownRecent, readStoredAdvancements } from '@/lib/advancements';

export const dynamic = 'force-dynamic';

/* The signed-in member's own advancements of the last two weeks, for the
   game's toast when they next open the site (AdvancementToasts.tsx). Asked
   once a visit, and only by a browser that is signed in. Nobody signed in,
   or a store that cannot be read: nothing to show, which is no error. */
export async function GET() {
  const headers = { 'Cache-Control': 'no-store' };
  const session = await getCrewSession().catch(() => null);
  if (!session) return NextResponse.json({ list: [] }, { headers });
  return NextResponse.json({ list: ownRecent(session.username, await readStoredAdvancements()) }, { headers });
}

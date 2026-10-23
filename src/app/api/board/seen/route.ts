import { NextRequest, NextResponse } from 'next/server';
import { jsonObject } from '@/lib/http';
import { getCrewSession } from '@/lib/crew';
import { getSeen, markSeen } from '@/lib/board-seen';

export const dynamic = 'force-dynamic';

const nobody = () => NextResponse.json({ seen: null, member: false }, { headers: { 'Cache-Control': 'no-store' } });

/** When the signed-in member last looked at the board. A visitor's is kept in their own browser. */
export async function GET() {
  const session = await getCrewSession();
  if (!session) return nobody();
  try {
    return NextResponse.json({ seen: await getSeen(session.username), member: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    console.error('GET board seen:', e);
    return NextResponse.json({ error: 'Náði ekki í hvað þú hefur séð.' }, { status: 503 });
  }
}

/** The board was looked at, up to `{ at }`: the newest thing it showed. */
export async function POST(req: NextRequest) {
  const session = await getCrewSession();
  if (!session) return NextResponse.json({ error: 'Skráðu þig inn til að merkja töfluna lesna.' }, { status: 401 });
  const at = (await jsonObject(req))?.at;
  if (typeof at !== 'string' || Number.isNaN(Date.parse(at))) return NextResponse.json({ error: 'Tíma vantar.' }, { status: 400 });
  try {
    return NextResponse.json({ seen: await markSeen(session.username, at), member: true });
  } catch (e) {
    console.error('POST board seen:', e);
    return NextResponse.json({ error: 'Ekki tókst að merkja töfluna lesna.' }, { status: 503 });
  }
}

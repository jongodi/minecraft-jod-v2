import { NextRequest, NextResponse } from 'next/server';
import { jsonObject } from '@/lib/http';
import { updateProfile, getCrewSession, isCrewUsername, sameUser, wallError } from '@/lib/crew';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ username: string; id: string }> };

/** Light a lantern under something on a friend's wall, or put it out again. Any signed-in member.
    The body says which (`{ lit: true }` or `{ lit: false }`), so a tab that has not seen a
    lantern lit on another device does what its button shows; without it, the lantern flips. */
export async function POST(req: NextRequest, { params }: Params) {
  const { username, id } = await params;
  if (!isCrewUsername(username)) return NextResponse.json({ error: 'Fannst ekki.' }, { status: 404 });
  const session = await getCrewSession();
  if (!session) return NextResponse.json({ error: 'Skráðu þig inn á veggnum þínum til að kveikja á lukt.' }, { status: 401 });
  const wanted = (await jsonObject(req))?.lit;

  let lanterns: string[] | null = null;
  try {
    await updateProfile(username, p => {
      /* the change may run again on a newer wall; only the last run's finding counts */
      lanterns = null;
      const entry = p.entries.find(e => e.id === id);
      if (!entry) return;
      const me = session.username;
      const lit = entry.lanterns.some(n => sameUser(n, me));
      const light = typeof wanted === 'boolean' ? wanted : !lit;
      if (light && !lit) entry.lanterns = [...entry.lanterns, me];
      if (!light && lit) entry.lanterns = entry.lanterns.filter(n => !sameUser(n, me));
      lanterns = entry.lanterns;
    });
  } catch (e) {
    return wallError(e, 'Ekki tókst að kveikja á luktinni.', 'POST lantern');
  }
  if (lanterns === null) return NextResponse.json({ error: 'Færslan fannst ekki.' }, { status: 404 });
  return NextResponse.json({ lanterns });
}

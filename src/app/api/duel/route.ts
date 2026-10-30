import { NextRequest, NextResponse } from 'next/server';
import { badJson, jsonObject, tooMany, tooManyWrites } from '@/lib/http';
import { getCrewSession, updateProfile, wallError } from '@/lib/crew';

export const dynamic = 'force-dynamic';

/* A draw quicker than this is not a human hand; the game itself calls anything
   under 200 a sheriff. */
const MIN_MS = 80;
const MAX_MS = 5000;

/** Post a draw from the campfire to the board. Only a better time replaces the old one. */
export async function POST(req: NextRequest) {
  const session = await getCrewSession();
  if (!session) return NextResponse.json({ error: 'Skráðu þig inn á veggnum þínum til að komast á töfluna.' }, { status: 401 });
  if (await tooManyWrites(session.username)) return tooMany();

  let body: { ms?: unknown };
  { const parsed = await jsonObject(req); if (!parsed) return badJson(); body = parsed; }
  const ms = typeof body.ms === 'number' && Number.isFinite(body.ms) ? Math.round(body.ms) : NaN;
  if (!(ms >= MIN_MS && ms <= MAX_MS)) return NextResponse.json({ error: 'Þessi tími er ekki trúverðugur.' }, { status: 400 });

  let best = ms;
  let improved = false;
  try {
    await updateProfile(session.username, p => {
      improved = false;   /* the change may run again on a newer wall */
      if (p.bestDrawMs === null || ms < p.bestDrawMs) { p.bestDrawMs = ms; improved = true; }
      best = p.bestDrawMs ?? ms;
    });
  } catch (e) {
    return wallError(e, 'Tíminn komst ekki á töfluna.', 'POST duel');
  }
  return NextResponse.json({ username: session.username, bestDrawMs: best, improved });
}

import { NextRequest, NextResponse } from 'next/server';
import { getCrewSession, updateProfile } from '@/lib/crew';

export const dynamic = 'force-dynamic';

/* A draw quicker than this is not a human hand; the game itself calls anything
   under 200 a sheriff. */
const MIN_MS = 80;
const MAX_MS = 5000;

/** Post a draw from the campfire to the board. Only a better time replaces the old one. */
export async function POST(req: NextRequest) {
  const session = await getCrewSession();
  if (!session) return NextResponse.json({ error: 'Skráðu þig inn á veggnum þínum til að komast á töfluna.' }, { status: 401 });

  let body: { ms?: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Ógilt JSON.' }, { status: 400 }); }
  const ms = typeof body.ms === 'number' && Number.isFinite(body.ms) ? Math.round(body.ms) : NaN;
  if (!(ms >= MIN_MS && ms <= MAX_MS)) return NextResponse.json({ error: 'Þessi tími er ekki trúverðugur.' }, { status: 400 });

  let best = ms;
  let improved = false;
  await updateProfile(session.username, p => {
    if (p.bestDrawMs === null || ms < p.bestDrawMs) { p.bestDrawMs = ms; improved = true; }
    best = p.bestDrawMs ?? ms;
  });
  return NextResponse.json({ username: session.username, bestDrawMs: best, improved });
}

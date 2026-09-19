import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getCrewToken, createCrewSession, deleteCrewSession, CREW_COOKIE, SESSION_TTL, isCrewUsername, canonicalUsername } from '@/lib/crew';
import { checkRateLimit } from '@/lib/rateLimit';
import { timingSafeEqual } from 'crypto';

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const { limited } = await checkRateLimit(ip, 'crew-auth');
  if (limited) {
    return NextResponse.json({ error: 'Of margar tilraunir. Reyndu aftur síðar.' }, { status: 429 });
  }

  const { username, token } = await req.json() as { username?: string; token?: string };
  if (!username || !token) {
    return NextResponse.json({ error: 'Innskráningarupplýsingar vantar.' }, { status: 400 });
  }

  const expected = isCrewUsername(username) ? getCrewToken(username) : undefined;
  if (
    !expected ||
    token.length !== expected.length ||
    !timingSafeEqual(Buffer.from(token), Buffer.from(expected))
  ) {
    return NextResponse.json({ error: 'Innskráningarupplýsingarnar eru ekki réttar.' }, { status: 401 });
  }

  const name = canonicalUsername(username);
  const sessionId = await createCrewSession(name);
  const res = NextResponse.json({ ok: true, username: name });
  /* a year: signing in is a one-time thing, and the link the admin hands out
     sets the same cookie with the same life */
  res.cookies.set(CREW_COOKIE, sessionId, {
    httpOnly: true,
    sameSite: 'lax',
    path:     '/',
    maxAge:   SESSION_TTL,
    secure:   process.env.NODE_ENV === 'production',
  });
  return res;
}

export async function DELETE() {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get(CREW_COOKIE)?.value;
    if (sessionId) await deleteCrewSession(sessionId);
  } catch { /* non-fatal */ }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(CREW_COOKIE, '', { maxAge: 0, path: '/' });
  return res;
}

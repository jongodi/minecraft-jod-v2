import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getCrewToken, createCrewSession, deleteCrewSession, CREW_COOKIE } from '@/lib/crew';
import { checkRateLimit } from '@/lib/rateLimit';
import { timingSafeEqual } from 'crypto';

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const { limited } = await checkRateLimit(ip, 'crew-auth');
  if (limited) {
    return NextResponse.json({ error: 'Too many attempts. Try again later.' }, { status: 429 });
  }

  const { username, token } = await req.json() as { username?: string; token?: string };
  if (!username || !token) {
    return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });
  }

  const expected = getCrewToken(username);
  if (
    !expected ||
    token.length !== expected.length ||
    !timingSafeEqual(Buffer.from(token), Buffer.from(expected))
  ) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  const sessionId = await createCrewSession(username);
  const res = NextResponse.json({ ok: true, username });
  res.cookies.set(CREW_COOKIE, sessionId, {
    httpOnly: true,
    sameSite: 'strict',
    path:     '/',
    maxAge:   60 * 60 * 24 * 30, // 30 days
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

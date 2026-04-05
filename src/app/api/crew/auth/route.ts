import { NextRequest, NextResponse } from 'next/server';
import { getCrewToken, CREW_COOKIE } from '@/lib/crew';

export async function POST(req: NextRequest) {
  const { username, token } = await req.json() as { username?: string; token?: string };
  if (!username || !token) {
    return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });
  }

  const expected = getCrewToken(username);
  if (!expected || expected !== token) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true, username });
  res.cookies.set(CREW_COOKIE, `${username}:${token}`, {
    httpOnly: true,
    sameSite: 'strict',
    path:     '/',
    maxAge:   60 * 60 * 24 * 30, // 30 days
    secure:   process.env.NODE_ENV === 'production',
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(CREW_COOKIE, '', { maxAge: 0, path: '/' });
  return res;
}

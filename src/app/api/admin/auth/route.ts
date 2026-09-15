import { NextRequest, NextResponse } from 'next/server';
import { isValidAdminToken, ADMIN_COOKIE } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rateLimit';

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const { limited } = await checkRateLimit(ip, 'admin-auth');
  if (limited) {
    return NextResponse.json({ error: 'Of margar tilraunir. Reyndu aftur síðar.' }, { status: 429 });
  }

  const { token } = await req.json() as { token?: string };

  if (!token || !isValidAdminToken(token)) {
    return NextResponse.json({ error: 'Aðgangslykillinn er ekki réttur.' }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: 'strict',
    path:     '/',
    // Expire after 7 days
    maxAge:   60 * 60 * 8,
    secure:   process.env.NODE_ENV === 'production',
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, '', { maxAge: 0, path: '/' });
  return res;
}

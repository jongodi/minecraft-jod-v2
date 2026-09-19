import { NextRequest, NextResponse } from 'next/server';
import { consumeInvite, createCrewSession, CREW_COOKIE, SESSION_TTL } from '@/lib/crew';
import { checkRateLimit } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

/** The one-time sign-in link the admin hands a member: /api/crew/invite?lykill=…
    Opening it signs this browser in for a year and sends it to the member's wall. */
export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const { limited } = await checkRateLimit(ip, 'crew-invite');
  if (limited) return NextResponse.json({ error: 'Of margar tilraunir. Reyndu aftur síðar.' }, { status: 429 });

  const key = req.nextUrl.searchParams.get('lykill') ?? '';
  const username = key ? await consumeInvite(key) : null;
  if (!username) {
    const url = new URL('/crew', req.url);
    url.searchParams.set('lykill', 'utrunninn');
    return NextResponse.redirect(url);
  }

  const sessionId = await createCrewSession(username);
  const res = NextResponse.redirect(new URL(`/crew/${username}?innskrad=1`, req.url));
  res.cookies.set(CREW_COOKIE, sessionId, {
    httpOnly: true,
    sameSite: 'lax',
    path:     '/',
    maxAge:   SESSION_TTL,
    secure:   process.env.NODE_ENV === 'production',
  });
  return res;
}

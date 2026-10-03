import { NextRequest, NextResponse, after } from 'next/server';
import { badJson, jsonObject } from '@/lib/http';
import { consumeInvite, createCrewSession, canonicalUsername, isCrewUsername, CREW_COOKIE, SESSION_TTL } from '@/lib/crew';
import { mailSignInLink } from '@/lib/crew-email';
import { canSendEmail } from '@/lib/email';
import { checkRateLimit, clearRateLimit } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

/** The sign-in link the admin hands a member, or the post brings them:
    /api/crew/invite?lykill=… Opening it spends one of its uses, signs this
    browser in for a year and sends it to the member's wall. */
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

  await clearRateLimit(ip, 'crew-invite');
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

/** "Send me a link": a member who is signed out asks for a sign-in link by
    post. It goes only to the address kept for them, so asking for someone
    else's does that someone no harm, and the answer is the same whether an
    address is kept or not. The letter is sent after the answer, so how long
    the answer takes does not tell either. A few an hour per member, so
    nobody's inbox can be filled. */
export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  if ((await checkRateLimit(ip, 'crew-mail-link')).limited) return NextResponse.json({ error: 'Of margar tilraunir. Reyndu aftur síðar.' }, { status: 429 });

  const body = await jsonObject(req);
  if (!body) return badJson();
  if (typeof body.username !== 'string' || !isCrewUsername(body.username)) return NextResponse.json({ error: 'Þessi félagi er ekki á listanum.' }, { status: 400 });
  if (!canSendEmail()) return NextResponse.json({ error: 'Vefurinn sendir ekki póst eins og er. Biddu stjórnandann um tengil.' }, { status: 503 });

  const username = canonicalUsername(body.username);
  if ((await checkRateLimit(username.toLowerCase(), 'crew-mail-link-member', 3, 60 * 60)).limited) {
    return NextResponse.json({ error: 'Nokkrir tenglar hafa þegar verið sendir á síðasta klukkutíma. Kíktu í pósthólfið, eða reyndu aftur síðar.' }, { status: 429 });
  }
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? req.nextUrl.origin;
  after(async () => {
    const mailed = await mailSignInLink(username, origin);
    if (!mailed.sent) console.warn(`[crew/invite] no link mailed to ${username}: ${mailed.reason}`);
  });
  return NextResponse.json({ ok: true });
}

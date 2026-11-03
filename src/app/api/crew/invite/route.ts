import { NextRequest, NextResponse, after } from 'next/server';
import { badJson, jsonObject } from '@/lib/http';
import { consumeInvite, peekInvite, createCrewSession, canonicalUsername, isCrewUsername, CREW_COOKIE, SESSION_TTL } from '@/lib/crew';
import { mailSignInLink } from '@/lib/crew-email';
import { canSendEmail, siteUrl } from '@/lib/email';
import { checkRateLimit, clearRateLimit, clientKey } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

/** The sign-in link the admin hands a member, or the post brings them:
    /api/crew/invite?lykill=… Opening it spends nothing: mail scanners and
    chat previews open links to look at them, and each look used to spend a
    use and sign a scanner in. The link opens the roll call with the member's
    name on a slip, and their own press there (the POST below) spends the use,
    signs this browser in for a year and sends them to their wall. */
export async function GET(req: NextRequest) {
  const ip = clientKey(req.headers);
  const { limited } = await checkRateLimit(ip, 'crew-invite');
  if (limited) return NextResponse.json({ error: 'Of margar tilraunir. Reyndu aftur síðar.' }, { status: 429 });

  const key = req.nextUrl.searchParams.get('lykill') ?? '';
  const username = key ? await peekInvite(key) : null;
  const url = new URL('/crew', req.url);
  if (!username) {
    url.searchParams.set('lykill', 'utrunninn');
    return NextResponse.redirect(url);
  }
  await clearRateLimit(ip, 'crew-invite');
  url.searchParams.set('lykill', key);
  url.searchParams.set('felagi', username);
  return NextResponse.redirect(url);
}

/** The member's own press on the slip: one use spent, this browser signed in for a year. */
async function signInByLink(req: NextRequest, key: string) {
  const ip = clientKey(req.headers);
  const { limited } = await checkRateLimit(ip, 'crew-invite');
  if (limited) return NextResponse.json({ error: 'Of margar tilraunir. Reyndu aftur síðar.' }, { status: 429 });
  const username = await consumeInvite(key);
  if (!username) return NextResponse.json({ error: 'Þessi innskráningartengill er útrunninn eða þegar notaður.' }, { status: 410 });
  await clearRateLimit(ip, 'crew-invite');
  const sessionId = await createCrewSession(username);
  const res = NextResponse.json({ ok: true, username, next: `/crew/${username}?innskrad=1` });
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
  const body = await jsonObject(req);
  if (!body) return badJson();
  /* { lykill } is the press on the slip a link opened; { username } asks for a link by post */
  if (typeof body.lykill === 'string') return signInByLink(req, body.lykill);

  const ip = clientKey(req.headers);
  if ((await checkRateLimit(ip, 'crew-mail-link')).limited) return NextResponse.json({ error: 'Of margar tilraunir. Reyndu aftur síðar.' }, { status: 429 });
  if (typeof body.username !== 'string' || !isCrewUsername(body.username)) return NextResponse.json({ error: 'Þessi félagi er ekki á listanum.' }, { status: 400 });
  if (!canSendEmail()) return NextResponse.json({ error: 'Vefurinn sendir ekki póst eins og er. Biddu stjórnandann um tengil.' }, { status: 503 });

  const username = canonicalUsername(body.username);
  /* a few an hour for a member from one address: counted for the member
     alone, anyone could spend them from anywhere and keep the member's own
     ask turned away all day; the address's own limit above caps the rest */
  if ((await checkRateLimit(`${ip}|${username.toLowerCase()}`, 'crew-mail-link-member', 3, 60 * 60)).limited) {
    return NextResponse.json({ error: 'Nokkrir tenglar hafa þegar verið sendir á síðasta klukkutíma. Kíktu í pósthólfið, eða reyndu aftur síðar.' }, { status: 429 });
  }
  /* as every letter reads it (a trailing slash dropped, an empty value ignored), else the address asked on */
  const origin = process.env.NEXT_PUBLIC_SITE_URL ? siteUrl() : req.nextUrl.origin;
  after(async () => {
    const mailed = await mailSignInLink(username, origin);
    if (!mailed.sent) console.warn(`[crew/invite] no link mailed to ${username}: ${mailed.reason}`);
  });
  return NextResponse.json({ ok: true });
}

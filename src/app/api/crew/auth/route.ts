import { NextRequest, NextResponse } from 'next/server';
import { badJson, jsonObject } from '@/lib/http';
import { cookies } from 'next/headers';
import { getCrewToken, createCrewSession, deleteCrewSession, CREW_COOKIE, SESSION_TTL, isCrewUsername, canonicalUsername } from '@/lib/crew';
import { checkRateLimit, clearRateLimit } from '@/lib/rateLimit';
import { getPasswordHash, verifyPassword } from '@/lib/crew-access';
import { timingSafeEqual } from 'crypto';

const tooMany = () => NextResponse.json({ error: 'Of margar tilraunir. Reyndu aftur síðar.' }, { status: 429 });

/* A member's password can be guessed at from many addresses at once, each
   under its own limit, so the tries at one member are counted too: twenty an
   hour, whoever is trying. A member turned away by it still has the link by post. */
const MEMBER_TRIES = 20;
const MEMBER_WINDOW = 60 * 60;

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const { limited } = await checkRateLimit(ip, 'crew-auth');
  if (limited) return tooMany();

  const body = await jsonObject(req);
  if (!body) return badJson();
  const { username, token } = body;
  if (typeof username !== 'string' || typeof token !== 'string' || !username || !token) {
    return NextResponse.json({ error: 'Innskráningarupplýsingar vantar.' }, { status: 400 });
  }

  /* the member's own password first, then the token from the environment as the fallback */
  const known = isCrewUsername(username);
  /* only names on the list are counted: a made-up one has nothing to guess, and would only fill the store with keys */
  const member = known ? canonicalUsername(username).toLowerCase() : null;
  if (member && (await checkRateLimit(member, 'crew-auth-user', MEMBER_TRIES, MEMBER_WINDOW)).limited) return tooMany();
  const byPassword = known && await verifyPassword(token, await getPasswordHash(username));
  const expected = known ? getCrewToken(username) : undefined;
  /* compared as bytes: a token with as many characters but more bytes (ð, þ)
     would otherwise make timingSafeEqual throw instead of simply not match */
  const given = Buffer.from(token), wanted = expected ? Buffer.from(expected) : null;
  const byToken = !!wanted && given.length === wanted.length && timingSafeEqual(given, wanted);
  if (!byPassword && !byToken) {
    return NextResponse.json({ error: 'Lykilorðið er ekki rétt.' }, { status: 401 });
  }

  await clearRateLimit(ip, 'crew-auth');
  if (member) await clearRateLimit(member, 'crew-auth-user');
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

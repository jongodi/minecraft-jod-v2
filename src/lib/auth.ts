import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const ADMIN_COOKIE = 'jod_admin_session';
export const CREW_COOKIE  = 'jod_crew_session';

/* How long the admin stays signed in. The cookie's own life says the same,
   but the browser's is advice: the session carries its own end, signed. */
export const ADMIN_SESSION_S = 60 * 60 * 8;

/** Two strings of the same length compared without an early exit, so how
    long it takes says nothing about where they differ. Works in every runtime. */
function sameString(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

const secret = () => {
  const s = process.env.ADMIN_TOKEN;
  return s && s.length >= 8 ? s : null;
};

export function isValidAdminToken(token: string): boolean {
  const expected = secret();
  return !!expected && sameString(token, expected);
}

/* The session is a signed note of when it ends, never the token itself: the
   cookie used to carry the token as it was, so one copied from a device or a
   log was the key to the panel for good, whatever the cookie's own life said.
   Signed with the token through the Web Crypto API, which the proxy's runtime
   and the routes' both have. */
const PURPOSE = 'jod-admin-session';
async function sign(exp: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret() ?? ''), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${PURPOSE}|${exp}`));
  /* base64url by hand: Buffer is Node's, and the proxy may not run there */
  return btoa(String.fromCharCode(...new Uint8Array(mac))).split('+').join('-').split('/').join('_').replace(/=+$/, '');
}

/** A fresh session for the panel: `<ends>.<signature>`, good for eight hours. */
export async function issueAdminSession(now = Date.now()): Promise<string> {
  const exp = (now + ADMIN_SESSION_S * 1000).toString(36);
  return `${exp}.${await sign(exp)}`;
}

/** Whether a session cookie is one this site issued, with the token it has
    now, and not yet past its end. */
export async function isValidAdminSession(session: string, now = Date.now()): Promise<boolean> {
  if (!secret() || !session || session.length > 128) return false;
  const [exp, sig] = session.split('.');
  if (!exp || !sig || !/^[0-9a-z]{1,12}$/.test(exp)) return false;
  const ends = parseInt(exp, 36);
  if (!Number.isFinite(ends) || ends <= now) return false;
  return sameString(sig, await sign(exp));
}

// Check if incoming request has a valid admin cookie (server-side)
export async function requireAdmin(): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get(ADMIN_COOKIE)?.value ?? '';
    return await isValidAdminSession(session);
  } catch {
    return false;
  }
}

export function unauthorizedResponse() {
  return NextResponse.json({ error: 'Þú þarft að skrá þig inn með réttum aðgangi.' }, { status: 401 });
}

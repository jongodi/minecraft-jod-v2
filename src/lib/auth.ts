import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const ADMIN_COOKIE = 'jod_admin_session';
export const CREW_COOKIE  = 'jod_crew_session';

export function isValidAdminToken(token: string): boolean {
  const expected = process.env.ADMIN_TOKEN;
  if (!expected || expected.length < 8) return false;
  if (token.length !== expected.length) return false;
  // XOR all chars without early exit — timing-safe, works in Edge Runtime
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) {
    mismatch |= token.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return mismatch === 0;
}

// Check if incoming request has a valid admin cookie (server-side)
export async function requireAdmin(): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get(ADMIN_COOKIE)?.value ?? '';
    return isValidAdminToken(session);
  } catch {
    return false;
  }
}

export function unauthorizedResponse() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

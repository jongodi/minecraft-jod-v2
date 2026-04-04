import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const ADMIN_COOKIE = 'jod_admin_session';
export const CREW_COOKIE  = 'jod_crew_session';

// Validate admin token from env and return true/false
export function isValidAdminToken(token: string): boolean {
  const expected = process.env.ADMIN_TOKEN;
  if (!expected || expected.length < 8) return false;
  return token === expected;
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

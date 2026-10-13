import { NextResponse } from 'next/server';
import { getCrewSession } from '@/lib/crew';
import { hasPassword } from '@/lib/crew-access';

export const dynamic = 'force-dynamic';

export async function GET() {
  /* a store that could not be read is not a member signed out: the page keeps who it had */
  const session = await getCrewSession({ strict: true }).catch(() => undefined);
  if (session === undefined) return NextResponse.json({ error: 'Náði ekki í innskráninguna.' }, { status: 503 });
  if (!session) {
    return NextResponse.json({ username: null }, { status: 200 });
  }
  return NextResponse.json({ username: session.username, hasPassword: await hasPassword(session.username) });
}

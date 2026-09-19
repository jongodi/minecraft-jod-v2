import { NextResponse } from 'next/server';
import { getCrewSession } from '@/lib/crew';
import { hasPassword } from '@/lib/crew-access';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getCrewSession();
  if (!session) {
    return NextResponse.json({ username: null }, { status: 200 });
  }
  return NextResponse.json({ username: session.username, hasPassword: await hasPassword(session.username) });
}

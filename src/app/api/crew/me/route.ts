import { NextResponse } from 'next/server';
import { getCrewSession } from '@/lib/crew';

export async function GET() {
  const session = await getCrewSession();
  if (!session) {
    return NextResponse.json({ username: null }, { status: 200 });
  }
  return NextResponse.json({ username: session.username });
}

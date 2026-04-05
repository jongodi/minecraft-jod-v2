import { NextRequest, NextResponse } from 'next/server';
import { readProfile, CREW_USERNAMES } from '@/lib/crew';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;
  const valid = CREW_USERNAMES.map(u => u.toLowerCase());
  if (!valid.includes(username.toLowerCase())) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const profile = await readProfile(username);
  return NextResponse.json(profile);
}

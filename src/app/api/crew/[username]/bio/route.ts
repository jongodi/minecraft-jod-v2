import { NextRequest, NextResponse } from 'next/server';
import { readProfile, writeProfile, getCrewSession } from '@/lib/crew';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const session = await getCrewSession();
  const { username } = await params;

  if (!session || session.username.toLowerCase() !== username.toLowerCase()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { bio } = await req.json() as { bio?: string };
  if (typeof bio !== 'string') {
    return NextResponse.json({ error: 'bio must be a string' }, { status: 400 });
  }

  const profile = await readProfile(username);
  profile.bio = bio.slice(0, 500); // max 500 chars
  await writeProfile(profile);
  return NextResponse.json({ ok: true });
}

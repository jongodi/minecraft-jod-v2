import { NextRequest, NextResponse } from 'next/server';
import { readProfile, writeProfile, getCrewSession } from '@/lib/crew';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ username: string; id: string }> }
) {
  const session = await getCrewSession();
  const { username, id } = await params;

  if (!session || session.username.toLowerCase() !== username.toLowerCase()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const profile = await readProfile(username);
  const before = profile.posts.length;
  profile.posts = profile.posts.filter(p => p.id !== id);
  if (profile.posts.length === before) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 });
  }
  await writeProfile(profile);
  return NextResponse.json({ ok: true });
}

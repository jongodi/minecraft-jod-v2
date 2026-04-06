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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ username: string; id: string }> }
) {
  const session = await getCrewSession();
  const { username, id } = await params;

  if (!session || session.username.toLowerCase() !== username.toLowerCase()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { text } = await req.json() as { text?: string };
  if (!text?.trim()) {
    return NextResponse.json({ error: 'Post text is required' }, { status: 400 });
  }
  if (text.length > 1000) {
    return NextResponse.json({ error: 'Post too long (max 1000 chars)' }, { status: 400 });
  }

  const profile = await readProfile(username);
  const post = profile.posts.find(p => p.id === id);
  if (!post) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 });
  }

  post.text = text.trim();
  await writeProfile(profile);
  return NextResponse.json(post);
}

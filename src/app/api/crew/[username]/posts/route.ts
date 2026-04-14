import { NextRequest, NextResponse } from 'next/server';
import { readProfile, writeProfile, getCrewSession, type CrewPost } from '@/lib/crew';
import { randomUUID } from 'crypto';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const session = await getCrewSession();
  const { username } = await params;

  if (!session || session.username.toLowerCase() !== username.toLowerCase()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { text } = await req.json() as { text?: string };
  if (!text?.trim()) return NextResponse.json({ error: 'text required' }, { status: 400 });

  const post: CrewPost = {
    id:        randomUUID(),
    text:      text.trim().slice(0, 280),
    createdAt: new Date().toISOString(),
  };

  try {
    const profile = await readProfile(username);
    profile.posts.unshift(post);
    if (profile.posts.length > 50) profile.posts = profile.posts.slice(0, 50);
    await writeProfile(profile);
    return NextResponse.json(post, { status: 201 });
  } catch (e) {
    console.error('POST /api/crew/[username]/posts error:', e);
    return NextResponse.json({ error: 'Failed to save post — storage error' }, { status: 500 });
  }
}

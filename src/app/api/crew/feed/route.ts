import { NextResponse } from 'next/server';
import { CREW_USERNAMES, readProfile } from '@/lib/crew';

export const dynamic = 'force-dynamic';

export interface FeedPost {
  id:        string;
  username:  string;
  text:      string;
  createdAt: string;
}

export async function GET() {
  const profiles = await Promise.all(CREW_USERNAMES.map(u => readProfile(u)));

  const posts: FeedPost[] = profiles.flatMap(p =>
    p.posts.map(post => ({
      id:        post.id,
      username:  p.username,
      text:      post.text,
      createdAt: post.createdAt,
    }))
  );

  // Sort newest first, cap at 30
  posts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return NextResponse.json(posts.slice(0, 30));
}

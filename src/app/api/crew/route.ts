import { NextResponse } from 'next/server';
import { CREW_USERNAMES, readProfile } from '@/lib/crew';

export const dynamic = 'force-dynamic';

export async function GET() {
  const profiles = await Promise.all(
    CREW_USERNAMES.map(async (username) => {
      const p = await readProfile(username);
      return {
        username:   p.username,
        bio:        p.bio,
        photoCount: p.photos.length,
        postCount:  p.posts.length,
        lastPost:   p.posts.at(-1)?.createdAt ?? null,
      };
    })
  );
  return NextResponse.json(profiles);
}

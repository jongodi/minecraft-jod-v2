import { NextRequest, NextResponse } from 'next/server';
import { CREW_USERNAMES, readProfile } from '@/lib/crew';
import { checkRateLimit } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const { limited } = await checkRateLimit(ip, 'crew-list', { max: 30, windowSeconds: 60 });
  if (limited) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
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

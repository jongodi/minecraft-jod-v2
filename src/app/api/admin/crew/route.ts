// Admin crew management API
// GET  — list all crew members with profile summaries
// DELETE ?username=xxx — clear a crew member's bio and posts (keep photos)

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, unauthorizedResponse } from '@/lib/auth';
import { CREW_USERNAMES } from '@/lib/crew-list';
import { readProfile, writeProfile } from '@/lib/crew';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!(await requireAdmin())) return unauthorizedResponse();

  const summaries = await Promise.all(
    CREW_USERNAMES.map(async username => {
      const profile = await readProfile(username);
      const tokenKey = `CREW_TOKEN_${username.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`;
      return {
        username,
        bio:         profile.bio,
        postCount:   profile.posts.length,
        photoCount:  profile.photos.length,
        tokenKey,
        hasToken:    !!process.env[tokenKey],
      };
    })
  );
  return NextResponse.json(summaries);
}

export async function DELETE(req: NextRequest) {
  if (!(await requireAdmin())) return unauthorizedResponse();

  const username = req.nextUrl.searchParams.get('username');
  if (!username || !CREW_USERNAMES.map(u => u.toLowerCase()).includes(username.toLowerCase())) {
    return NextResponse.json({ error: 'Invalid username' }, { status: 400 });
  }

  const profile = await readProfile(username);
  await writeProfile({ ...profile, bio: '', posts: [] });
  return NextResponse.json({ ok: true });
}

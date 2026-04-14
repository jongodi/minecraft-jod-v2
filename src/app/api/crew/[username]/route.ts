import { NextRequest, NextResponse } from 'next/server';
import { readProfile, CREW_USERNAMES } from '@/lib/crew';
import { checkRateLimit } from '@/lib/rateLimit';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const { limited } = await checkRateLimit(ip, 'crew-profile', { max: 40, windowSeconds: 60 });
  if (limited) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

  const { username } = await params;
  const valid = CREW_USERNAMES.map(u => u.toLowerCase());
  if (!valid.includes(username.toLowerCase())) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const profile = await readProfile(username);
  return NextResponse.json(profile);
}

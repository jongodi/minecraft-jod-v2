import { NextRequest, NextResponse } from 'next/server';
import { readProfile, updateProfile, requireOwner, isCrewUsername, allPhotos, cleanText, LIMITS } from '@/lib/crew';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ username: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { username } = await params;
  if (!isCrewUsername(username)) return NextResponse.json({ error: 'Fannst ekki.' }, { status: 404 });
  return NextResponse.json(await readProfile(username), { headers: { 'Cache-Control': 'no-store' } });
}

/** The poster itself: the bio and which print stands behind it. Owner only. */
export async function PATCH(req: NextRequest, { params }: Params) {
  const { username } = await params;
  if (!isCrewUsername(username)) return NextResponse.json({ error: 'Fannst ekki.' }, { status: 404 });
  if (!(await requireOwner(username))) return NextResponse.json({ error: 'Þú þarft að skrá þig inn með réttum aðgangi.' }, { status: 401 });

  let body: { bio?: unknown; coverPhotoId?: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Ógilt JSON.' }, { status: 400 }); }

  if (body.bio !== undefined && typeof body.bio !== 'string') return NextResponse.json({ error: 'Kynningin verður að vera texti.' }, { status: 400 });
  if (body.coverPhotoId !== undefined && body.coverPhotoId !== null && typeof body.coverPhotoId !== 'string') return NextResponse.json({ error: 'Ógild mynd.' }, { status: 400 });

  try {
    const profile = await updateProfile(username, p => {
      if (typeof body.bio === 'string') p.bio = cleanText(body.bio, LIMITS.bio);
      if (body.coverPhotoId === null) p.coverPhotoId = null;
      else if (typeof body.coverPhotoId === 'string') {
        if (!allPhotos(p).some(ph => ph.id === body.coverPhotoId)) throw new Error('Myndin fannst ekki á veggnum.');
        p.coverPhotoId = body.coverPhotoId;
      }
    });
    return NextResponse.json(profile);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Ekki tókst að vista.' }, { status: 400 });
  }
}

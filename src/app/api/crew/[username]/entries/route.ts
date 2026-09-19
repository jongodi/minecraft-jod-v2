import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { updateProfile, requireOwner, isCrewUsername, cleanText, LIMITS, type CrewEntry } from '@/lib/crew';
import { photoFromDraft, type PhotoDraft } from '@/lib/crew-photos';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ username: string }> };

/** Pin something to the wall: a note, prints, or both, with a place if it has one. */
export async function POST(req: NextRequest, { params }: Params) {
  const { username } = await params;
  if (!isCrewUsername(username)) return NextResponse.json({ error: 'Fannst ekki.' }, { status: 404 });
  if (!(await requireOwner(username))) return NextResponse.json({ error: 'Þú þarft að skrá þig inn með réttum aðgangi.' }, { status: 401 });

  let body: { text?: unknown; photos?: unknown; placeId?: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Ógilt JSON.' }, { status: 400 }); }

  const text = cleanText(body.text, LIMITS.text);
  const drafts = Array.isArray(body.photos) ? (body.photos as PhotoDraft[]).slice(0, LIMITS.photosPer) : [];
  const photos = drafts.map(d => photoFromDraft(username, d));
  if (photos.some(p => p === null)) return NextResponse.json({ error: 'Ein myndanna er ekki úr þinni möppu.' }, { status: 400 });
  const kept = photos.filter((p): p is NonNullable<typeof p> => p !== null);
  if (!text && kept.length === 0) return NextResponse.json({ error: 'Skrifaðu eitthvað eða veldu mynd.' }, { status: 400 });

  const entry: CrewEntry = {
    id:        randomUUID(),
    text,
    photos:    kept,
    placeId:   typeof body.placeId === 'number' && Number.isFinite(body.placeId) ? Math.floor(body.placeId) : null,
    createdAt: new Date().toISOString(),
    lanterns:  [],
    replies:   [],
  };

  try {
    await updateProfile(username, p => { p.entries.unshift(entry); });
    return NextResponse.json(entry, { status: 201 });
  } catch (e) {
    console.error('POST entries:', e);
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Ekki tókst að festa þetta upp.' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { badJson, jsonObject } from '@/lib/http';
import { randomUUID } from 'crypto';
import { updateProfile, requireOwner, isCrewUsername, cleanText, LIMITS, type CrewEntry } from '@/lib/crew';
import { photoFromDraft, type PhotoDraft } from '@/lib/crew-photos';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ username: string }> };

/** The wall turned the entry away; the member can do something about it. */
class Refusal extends Error {}

/** Pin something to the wall: a note, prints, or both, with a place if it has one. */
export async function POST(req: NextRequest, { params }: Params) {
  const { username } = await params;
  if (!isCrewUsername(username)) return NextResponse.json({ error: 'Fannst ekki.' }, { status: 404 });
  if (!(await requireOwner(username))) return NextResponse.json({ error: 'Þú þarft að skrá þig inn með réttum aðgangi.' }, { status: 401 });

  let body: { text?: unknown; photos?: unknown; placeId?: unknown };
  { const parsed = await jsonObject(req); if (!parsed) return badJson(); body = parsed; }

  const text = cleanText(body.text, LIMITS.text);
  const drafts = Array.isArray(body.photos) ? (body.photos as PhotoDraft[]).slice(0, LIMITS.photosPer) : [];
  const photos = drafts.map(d => photoFromDraft(username, d));
  if (photos.some(p => p === null)) return NextResponse.json({ error: 'Ein myndanna er ekki úr þinni möppu.' }, { status: 400 });
  const kept = photos.filter((p): p is NonNullable<typeof p> => p !== null);
  if (new Set(kept.map(p => p.id)).size !== kept.length) return NextResponse.json({ error: 'Sama myndin kemur tvisvar fyrir.' }, { status: 400 });
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
    await updateProfile(username, p => {
      /* a print hangs in one place only: taking one entry down deletes its files */
      const onWall = new Set(p.entries.flatMap(e => e.photos.map(ph => ph.id)));
      if (entry.photos.some(ph => onWall.has(ph.id))) throw new Refusal('Þessi mynd hangir þegar á veggnum.');
      /* a full wall says so, rather than quietly dropping its oldest entry and prints */
      if (p.entries.length >= LIMITS.entries) throw new Refusal(`Veggurinn er fullur (${LIMITS.entries} færslur). Taktu eitthvað gamalt niður fyrst.`);
      p.entries.unshift(entry);
    });
    return NextResponse.json(entry, { status: 201 });
  } catch (e) {
    if (e instanceof Refusal) return NextResponse.json({ error: e.message }, { status: 409 });
    console.error('POST entries:', e);
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Ekki tókst að festa þetta upp.' }, { status: 500 });
  }
}

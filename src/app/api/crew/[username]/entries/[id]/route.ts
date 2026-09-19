import { NextRequest, NextResponse } from 'next/server';
import { updateProfile, readProfile, requireOwner, isCrewUsername, cleanText, LIMITS, type CrewEntry } from '@/lib/crew';
import { photosNotIn, removePhotos } from '@/lib/crew-photos';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ username: string; id: string }> };
const unauthorized = () => NextResponse.json({ error: 'Þú þarft að skrá þig inn með réttum aðgangi.' }, { status: 401 });

/** Change a note, its captions, its place, or take some of its prints down. */
export async function PATCH(req: NextRequest, { params }: Params) {
  const { username, id } = await params;
  if (!isCrewUsername(username)) return NextResponse.json({ error: 'Fannst ekki.' }, { status: 404 });
  if (!(await requireOwner(username))) return unauthorized();

  let body: { text?: unknown; placeId?: unknown; photos?: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Ógilt JSON.' }, { status: 400 }); }

  let updated: CrewEntry | null = null;
  let dropped: CrewEntry['photos'] = [];
  try {
    await updateProfile(username, p => {
      const entry = p.entries.find(e => e.id === id);
      if (!entry) return;
      if (typeof body.text === 'string') entry.text = cleanText(body.text, LIMITS.text);
      if (body.placeId === null) entry.placeId = null;
      else if (typeof body.placeId === 'number' && Number.isFinite(body.placeId)) entry.placeId = Math.floor(body.placeId);
      if (Array.isArray(body.photos)) {
        /* the prints that stay, in the order given, each with its caption */
        const keep = (body.photos as Array<{ id?: unknown; caption?: unknown }>)
          .map(d => {
            const ph = entry.photos.find(x => x.id === d.id);
            return ph ? { ...ph, caption: typeof d.caption === 'string' ? cleanText(d.caption, LIMITS.caption) : ph.caption } : null;
          })
          .filter((x): x is NonNullable<typeof x> => x !== null);
        dropped = photosNotIn(entry, keep);
        entry.photos = keep;
        if (p.coverPhotoId && dropped.some(d => d.id === p.coverPhotoId)) p.coverPhotoId = null;
      }
      if (!entry.text.trim() && entry.photos.length === 0) throw new Error('Færslan má ekki vera tóm; eyddu henni frekar.');
      updated = entry;
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Ekki tókst að vista.' }, { status: 400 });
  }
  if (!updated) return NextResponse.json({ error: 'Færslan fannst ekki.' }, { status: 404 });
  await removePhotos(dropped);
  return NextResponse.json(updated);
}

/** Take the whole thing down, prints and all. */
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { username, id } = await params;
  if (!isCrewUsername(username)) return NextResponse.json({ error: 'Fannst ekki.' }, { status: 404 });
  if (!(await requireOwner(username))) return unauthorized();

  const before = await readProfile(username);
  const entry = before.entries.find(e => e.id === id);
  if (!entry) return NextResponse.json({ error: 'Færslan fannst ekki.' }, { status: 404 });

  await updateProfile(username, p => {
    p.entries = p.entries.filter(e => e.id !== id);
    if (p.coverPhotoId && entry.photos.some(ph => ph.id === p.coverPhotoId)) p.coverPhotoId = null;
  });
  await removePhotos(entry.photos);
  return NextResponse.json({ ok: true });
}

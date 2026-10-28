import { NextRequest, NextResponse, after } from 'next/server';
import { badJson, jsonObject, tooMany, tooManyWrites } from '@/lib/http';
import { randomUUID } from 'crypto';
import { updateProfile, requireOwner, isCrewUsername, cleanText, LIMITS, Refusal, wallError, type CrewBounty, type CrewEntry, type CrewPoll } from '@/lib/crew';
import { canSendEmail } from '@/lib/email';
import { photoFromDraft, type PhotoDraft } from '@/lib/crew-photos';
import { mapPlaceIds, UNKNOWN_PLACE } from '@/lib/crew-places';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ username: string }> };

/** What a call for something asks (`{ reward }`), or what a question offers
    (`{ choices }`), from the form; a string when it is wrong, to be said as it is. */
function callOf(body: { bounty?: unknown; poll?: unknown }, text: string): { bounty?: CrewBounty; poll?: CrewPoll } | string {
  const b = body.bounty as { reward?: unknown } | null | undefined;
  const q = body.poll as { choices?: unknown } | null | undefined;
  if (b && q) return 'Annaðhvort ósk eða spurning, ekki hvort tveggja.';
  if (b) {
    const reward = cleanText(b.reward, LIMITS.reward).replace(/\s+/g, ' ');
    if (!text) return 'Segðu hvað vantar.';
    if (!reward) return 'Hver eru verðlaunin?';
    return { bounty: { reward, takenBy: null, doneAt: null } };
  }
  if (q) {
    const texts = (Array.isArray(q.choices) ? q.choices : []).map(c => cleanText(c, LIMITS.choice).replace(/\s+/g, ' ')).filter(Boolean);
    if (!text) return 'Hver er spurningin?';
    if (new Set(texts.map(t => t.toLocaleLowerCase('is-IS'))).size !== texts.length) return 'Sami svarkosturinn kemur tvisvar fyrir.';
    if (texts.length < LIMITS.choicesMin || texts.length > LIMITS.choicesMax) return `Spurning þarf ${LIMITS.choicesMin} til ${LIMITS.choicesMax} svarkosti.`;
    return { poll: { closed: false, choices: texts.map((t, i) => ({ id: String.fromCharCode(97 + i), text: t, votes: [] })) } };
  }
  return {};
}

/** Pin something to the wall: a note, prints, or both, with a place if it
    has one; or a call for something with its reward, or a question with its
    answers. Whoever it calls by name (@nafn) gets a letter. */
export async function POST(req: NextRequest, { params }: Params) {
  const { username } = await params;
  if (!isCrewUsername(username)) return NextResponse.json({ error: 'Fannst ekki.' }, { status: 404 });
  const session = await requireOwner(username);
  if (!session) return NextResponse.json({ error: 'Þú þarft að skrá þig inn með réttum aðgangi.' }, { status: 401 });
  if (await tooManyWrites(session.username)) return tooMany();

  let body: { text?: unknown; photos?: unknown; placeId?: unknown; bounty?: unknown; poll?: unknown };
  { const parsed = await jsonObject(req); if (!parsed) return badJson(); body = parsed; }

  const text = cleanText(body.text, LIMITS.text);
  const drafts = Array.isArray(body.photos) ? (body.photos as PhotoDraft[]).slice(0, LIMITS.photosPer) : [];
  const photos = drafts.map(d => photoFromDraft(username, d));
  if (photos.some(p => p === null)) return NextResponse.json({ error: 'Ein myndanna er ekki úr þinni möppu.' }, { status: 400 });
  const kept = photos.filter((p): p is NonNullable<typeof p> => p !== null);
  if (new Set(kept.map(p => p.id)).size !== kept.length) return NextResponse.json({ error: 'Sama myndin kemur tvisvar fyrir.' }, { status: 400 });
  if (!text && kept.length === 0 && !body.bounty && !body.poll) return NextResponse.json({ error: 'Skrifaðu eitthvað eða veldu mynd.' }, { status: 400 });
  const call = callOf(body, text);
  if (typeof call === 'string') return NextResponse.json({ error: call }, { status: 400 });

  /* a place is one on the map: a made-up one would be kept and counted under a place nobody can open */
  const placeId = typeof body.placeId === 'number' && Number.isFinite(body.placeId) ? Math.floor(body.placeId) : null;
  const places = placeId === null ? null : await mapPlaceIds();
  if (placeId !== null && places && !places.has(placeId)) return NextResponse.json({ error: UNKNOWN_PLACE }, { status: 400 });

  const entry: CrewEntry = {
    id:        randomUUID(),
    text,
    photos:    kept,
    placeId,
    createdAt: new Date().toISOString(),
    lanterns:  [],
    replies:   [],
    ...call,
  };

  try {
    await updateProfile(username, p => {
      /* a print hangs in one place only: taking one entry down deletes its files */
      const onWall = new Set(p.entries.flatMap(e => e.photos.map(ph => ph.id)));
      if (entry.photos.some(ph => onWall.has(ph.id))) throw new Refusal('Þessi mynd hangir þegar á veggnum.', 409);
      /* a full wall says so, rather than quietly dropping its oldest entry and prints */
      if (p.entries.length >= LIMITS.entries) throw new Refusal(`Veggurinn er fullur (${LIMITS.entries} færslur). Taktu eitthvað gamalt niður fyrst.`, 409);
      p.entries.unshift(entry);
    });
    /* after the answer, so a slow post office never holds up the pin */
    if (canSendEmail() && text.includes('@')) {
      after(async () => {
        try { const { mailMentions } = await import('@/lib/mention-mail'); await mailMentions({ by: session.username, owner: session.username, entryId: entry.id, text, reply: false }); }
        catch (e) { console.error('[entries] the letters did not go:', e instanceof Error ? e.message : e); }
      });
    }
    return NextResponse.json(entry, { status: 201 });
  } catch (e) {
    return wallError(e, 'Ekki tókst að festa þetta upp.', 'POST entries');
  }
}

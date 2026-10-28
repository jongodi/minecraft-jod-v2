import { NextRequest, NextResponse, after } from 'next/server';
import { canSendEmail } from '@/lib/email';
import { badJson, jsonObject, tooMany, tooManyWrites } from '@/lib/http';
import { randomUUID } from 'crypto';
import { updateProfile, getCrewSession, isCrewUsername, cleanText, LIMITS, wallError, type CrewReply } from '@/lib/crew';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ username: string; id: string }> };

/** A short reply under something on a wall. Any signed-in member. Whoever it calls by name (@nafn) gets a letter. */
export async function POST(req: NextRequest, { params }: Params) {
  const { username, id } = await params;
  if (!isCrewUsername(username)) return NextResponse.json({ error: 'Fannst ekki.' }, { status: 404 });
  const session = await getCrewSession();
  if (!session) return NextResponse.json({ error: 'Skráðu þig inn á veggnum þínum til að svara.' }, { status: 401 });
  if (await tooManyWrites(session.username)) return tooMany();

  let body: { text?: unknown };
  { const parsed = await jsonObject(req); if (!parsed) return badJson(); body = parsed; }
  const text = cleanText(body.text, LIMITS.reply);
  if (!text) return NextResponse.json({ error: 'Texta vantar.' }, { status: 400 });

  const reply: CrewReply = { id: randomUUID(), username: session.username, text, createdAt: new Date().toISOString() };
  let found = false;
  let full = false;
  try {
    await updateProfile(username, p => {
      /* the change may run again on a newer wall; only the last run's finding counts */
      found = false;
      full = false;
      const entry = p.entries.find(e => e.id === id);
      if (!entry) return;
      found = true;
      /* a sign holds so many replies: one more is turned away rather than the
         oldest taken down to make room, which let a loop of replies clear a
         thread of everyone else's */
      if (entry.replies.length >= LIMITS.replies) { full = true; return; }
      entry.replies.push(reply);
    });
  } catch (e) {
    return wallError(e, 'Svarið komst ekki upp.', 'POST reply');
  }
  if (!found) return NextResponse.json({ error: 'Færslan fannst ekki.' }, { status: 404 });
  if (full) return NextResponse.json({ error: 'Þessi miði er fullur af svörum.' }, { status: 409 });
  if (canSendEmail() && text.includes('@')) {
    after(async () => {
      try { const { mailMentions } = await import('@/lib/mention-mail'); await mailMentions({ by: session.username, owner: username, entryId: id, text, reply: true }); }
      catch (e) { console.error('[replies] the letters did not go:', e instanceof Error ? e.message : e); }
    });
  }
  return NextResponse.json(reply, { status: 201 });
}

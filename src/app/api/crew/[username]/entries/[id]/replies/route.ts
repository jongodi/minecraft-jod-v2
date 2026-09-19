import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { updateProfile, getCrewSession, isCrewUsername, cleanText, LIMITS, type CrewReply } from '@/lib/crew';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ username: string; id: string }> };

/** A short reply under something on a wall. Any signed-in member. */
export async function POST(req: NextRequest, { params }: Params) {
  const { username, id } = await params;
  if (!isCrewUsername(username)) return NextResponse.json({ error: 'Fannst ekki.' }, { status: 404 });
  const session = await getCrewSession();
  if (!session) return NextResponse.json({ error: 'Skráðu þig inn á veggnum þínum til að svara.' }, { status: 401 });

  let body: { text?: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Ógilt JSON.' }, { status: 400 }); }
  const text = cleanText(body.text, LIMITS.reply);
  if (!text) return NextResponse.json({ error: 'Texta vantar.' }, { status: 400 });

  const reply: CrewReply = { id: randomUUID(), username: session.username, text, createdAt: new Date().toISOString() };
  let found = false;
  await updateProfile(username, p => {
    const entry = p.entries.find(e => e.id === id);
    if (!entry) return;
    found = true;
    entry.replies.push(reply);
    if (entry.replies.length > LIMITS.replies) entry.replies = entry.replies.slice(-LIMITS.replies);
  });
  if (!found) return NextResponse.json({ error: 'Færslan fannst ekki.' }, { status: 404 });
  return NextResponse.json(reply, { status: 201 });
}

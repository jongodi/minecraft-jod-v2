import { NextRequest, NextResponse } from 'next/server';
import { updateProfile, getCrewSession, isCrewUsername, sameUser } from '@/lib/crew';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ username: string; id: string; rid: string }> };

/** Whoever wrote the reply, or whoever owns the wall, may take it down. */
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { username, id, rid } = await params;
  if (!isCrewUsername(username)) return NextResponse.json({ error: 'Fannst ekki.' }, { status: 404 });
  const session = await getCrewSession();
  if (!session) return NextResponse.json({ error: 'Þú þarft að skrá þig inn.' }, { status: 401 });

  let status: 'gone' | 'forbidden' | 'missing' = 'missing';
  await updateProfile(username, p => {
    const entry = p.entries.find(e => e.id === id);
    const reply = entry?.replies.find(r => r.id === rid);
    if (!entry || !reply) return;
    if (!sameUser(session.username, reply.username) && !sameUser(session.username, username)) { status = 'forbidden'; return; }
    entry.replies = entry.replies.filter(r => r.id !== rid);
    status = 'gone';
  });
  if (status === 'missing')   return NextResponse.json({ error: 'Svarið fannst ekki.' }, { status: 404 });
  if (status === 'forbidden') return NextResponse.json({ error: 'Þetta svar er ekki þitt.' }, { status: 403 });
  return NextResponse.json({ ok: true });
}

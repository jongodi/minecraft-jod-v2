import { NextRequest, NextResponse } from 'next/server';
import { updateProfile, getCrewSession, isCrewUsername } from '@/lib/crew';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ username: string; id: string }> };

/** Light a lantern under something on a friend's wall, or put it out again. Any signed-in member. */
export async function POST(_req: NextRequest, { params }: Params) {
  const { username, id } = await params;
  if (!isCrewUsername(username)) return NextResponse.json({ error: 'Fannst ekki.' }, { status: 404 });
  const session = await getCrewSession();
  if (!session) return NextResponse.json({ error: 'Skráðu þig inn á veggnum þínum til að kveikja á lukt.' }, { status: 401 });

  let lanterns: string[] | null = null;
  await updateProfile(username, p => {
    const entry = p.entries.find(e => e.id === id);
    if (!entry) return;
    const me = session.username;
    entry.lanterns = entry.lanterns.some(n => n.toLowerCase() === me.toLowerCase())
      ? entry.lanterns.filter(n => n.toLowerCase() !== me.toLowerCase())
      : [...entry.lanterns, me];
    lanterns = entry.lanterns;
  });
  if (lanterns === null) return NextResponse.json({ error: 'Færslan fannst ekki.' }, { status: 404 });
  return NextResponse.json({ lanterns });
}

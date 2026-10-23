import { NextRequest, NextResponse } from 'next/server';
import { badJson, jsonObject } from '@/lib/http';
import { updateProfile, getCrewSession, isCrewUsername, wallError } from '@/lib/crew';
import { gaveIt, give, isItem, type Reactions } from '@/lib/reactions';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ username: string; id: string }> };

/** Give an item to something on a wall, or take it back (src/lib/reactions.ts).
    Any signed-in member, on any wall, their own too, as with the lantern.
    The body names the item and says which (`{ item: 'cake', given: true }`),
    so a tab that has not seen the item given from another device does what
    its slot shows; without `given`, the item flips. Answers with everything
    given to it as it now stands. */
export async function POST(req: NextRequest, { params }: Params) {
  const { username, id } = await params;
  if (!isCrewUsername(username)) return NextResponse.json({ error: 'Fannst ekki.' }, { status: 404 });
  const session = await getCrewSession();
  if (!session) return NextResponse.json({ error: 'Skráðu þig inn til að gefa hlut.' }, { status: 401 });
  const body = await jsonObject(req);
  if (!body) return badJson();
  if (!isItem(body.item)) return NextResponse.json({ error: 'Enginn slíkur hlutur.' }, { status: 400 });
  const item = body.item;
  const wanted = typeof body.given === 'boolean' ? body.given : null;

  let reactions: Reactions | null = null;
  try {
    await updateProfile(username, p => {
      /* the change may run again on a newer wall; only the last run's finding counts */
      reactions = null;
      const entry = p.entries.find(e => e.id === id);
      if (!entry) return;
      const me = session.username;
      const next = give(entry.reactions, item, me, wanted ?? !gaveIt(entry.reactions, item, me));
      /* stored only while something is given, so a sign nobody gave anything stays as it was */
      if (Object.keys(next).length) entry.reactions = next;
      else delete entry.reactions;
      reactions = next;
    });
  } catch (e) {
    return wallError(e, 'Ekki tókst að gefa hlutinn.', 'POST react');
  }
  if (reactions === null) return NextResponse.json({ error: 'Færslan fannst ekki.' }, { status: 404 });
  return NextResponse.json({ reactions });
}

import { NextRequest, NextResponse } from 'next/server';
import { badJson, jsonObject, tooMany, tooManyWrites } from '@/lib/http';
import { updateProfile, getCrewSession, isCrewUsername, sameUser, Refusal, wallError, type CrewBounty } from '@/lib/crew';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ username: string; id: string }> };
type Action = 'take' | 'drop' | 'release' | 'done' | 'reopen';
const ACTIONS: Action[] = ['take', 'drop', 'release', 'done', 'reopen'];

/** A call for something on a wall (Óskast). One of the crew takes it on
    (`take`) or lets it go again (`drop`); the one who posted it calls it
    done (`done`), which credits whoever took it, frees it from one who took
    it and never came back (`release`), or opens it again (`reopen`).
    Answers with the call as it now stands. */
export async function POST(req: NextRequest, { params }: Params) {
  const { username, id } = await params;
  if (!isCrewUsername(username)) return NextResponse.json({ error: 'Fannst ekki.' }, { status: 404 });
  const session = await getCrewSession();
  if (!session) return NextResponse.json({ error: 'Skráðu þig inn til að taka þetta að þér.' }, { status: 401 });
  if (await tooManyWrites(session.username)) return tooMany();
  const body = await jsonObject(req);
  if (!body) return badJson();
  const action = ACTIONS.find(a => a === body.action);
  if (!action) return NextResponse.json({ error: 'Hvað á að gera?' }, { status: 400 });

  const me = session.username;
  const owner = sameUser(me, username);
  let bounty: CrewBounty | null = null;
  try {
    await updateProfile(username, p => {
      /* the change may run again on a newer wall; only the last run's finding counts */
      bounty = null;
      const entry = p.entries.find(e => e.id === id);
      if (!entry?.bounty) return;
      const b = entry.bounty;
      if (action === 'take') {
        if (owner) throw new Refusal('Þú getur ekki tekið þína eigin ósk að þér.', 403);
        if (b.doneAt) throw new Refusal('Þetta er þegar komið í höfn.', 409);
        if (b.takenBy && !sameUser(b.takenBy, me)) throw new Refusal(`${b.takenBy} hefur þegar tekið þetta að sér.`, 409);
        entry.bounty = { ...b, takenBy: me };
      } else if (action === 'drop') {
        if (!b.takenBy || !sameUser(b.takenBy, me)) throw new Refusal('Þú ert ekki með þetta.', 403);
        if (b.doneAt) throw new Refusal('Þetta er þegar komið í höfn.', 409);
        entry.bounty = { ...b, takenBy: null };
      } else if (action === 'release') {
        if (!owner) throw new Refusal('Aðeins sá sem setti óskina upp getur þetta.', 403);
        if (b.doneAt) throw new Refusal('Þetta er þegar komið í höfn.', 409);
        entry.bounty = { ...b, takenBy: null };
      } else {
        if (!owner) throw new Refusal('Aðeins sá sem setti óskina upp getur þetta.', 403);
        entry.bounty = { ...b, doneAt: action === 'done' ? b.doneAt ?? new Date().toISOString() : null };
      }
      bounty = entry.bounty;
    });
  } catch (e) {
    return wallError(e, 'Ekki tókst að breyta óskinni.', 'POST bounty');
  }
  if (!bounty) return NextResponse.json({ error: 'Óskin fannst ekki.' }, { status: 404 });
  return NextResponse.json({ bounty });
}

import { NextRequest, NextResponse } from 'next/server';
import { badJson, jsonObject, tooMany, tooManyWrites } from '@/lib/http';
import { updateProfile, getCrewSession, isCrewUsername, sameUser, Refusal, wallError, type CrewPoll } from '@/lib/crew';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ username: string; id: string }> };

/** A question on a wall. Any signed-in member chooses one answer
    (`{ choice: id }`), changes it, or takes it back (`{ choice: null }`);
    the one who asked closes it or opens it again (`{ closed: true|false }`).
    Answers with the question as it now stands. */
export async function POST(req: NextRequest, { params }: Params) {
  const { username, id } = await params;
  if (!isCrewUsername(username)) return NextResponse.json({ error: 'Fannst ekki.' }, { status: 404 });
  const session = await getCrewSession();
  if (!session) return NextResponse.json({ error: 'Skráðu þig inn til að svara.' }, { status: 401 });
  if (await tooManyWrites(session.username)) return tooMany();
  const body = await jsonObject(req);
  if (!body) return badJson();
  const closing = typeof body.closed === 'boolean';
  const choice = body.choice === null ? null : typeof body.choice === 'string' ? body.choice : undefined;
  if (!closing && choice === undefined) return NextResponse.json({ error: 'Svar vantar.' }, { status: 400 });

  const me = session.username;
  let poll: CrewPoll | null = null;
  try {
    await updateProfile(username, p => {
      /* the change may run again on a newer wall; only the last run's finding counts */
      poll = null;
      const entry = p.entries.find(e => e.id === id);
      if (!entry?.poll) return;
      if (closing) {
        if (!sameUser(me, username)) throw new Refusal('Aðeins sá sem spurði getur lokað spurningunni.', 403);
        entry.poll = { ...entry.poll, closed: body.closed === true };
      } else {
        if (entry.poll.closed) throw new Refusal('Búið er að loka fyrir svör.', 409);
        if (choice !== null && !entry.poll.choices.some(c => c.id === choice)) throw new Refusal('Svarið fannst ekki.');
        entry.poll = {
          ...entry.poll,
          choices: entry.poll.choices.map(c => {
            const rest = c.votes.filter(v => !sameUser(v, me));
            return { ...c, votes: c.id === choice ? [...rest, me] : rest };
          }),
        };
      }
      poll = entry.poll;
    });
  } catch (e) {
    return wallError(e, 'Ekki tókst að svara.', 'POST vote');
  }
  if (!poll) return NextResponse.json({ error: 'Spurningin fannst ekki.' }, { status: 404 });
  return NextResponse.json({ poll });
}

import { NextRequest, NextResponse } from 'next/server';
import { badJson, jsonObject } from '@/lib/http';
import { requireOwner, isCrewUsername } from '@/lib/crew';
import { hashPassword, passwordProblem, setPasswordHash } from '@/lib/crew-access';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ username: string }> };

/** A member's own password, chosen on their wall once they are in. With it
    they sign in on any other device under "Þetta er ég"; without it they
    need a link from the admin each time. */
export async function PUT(req: NextRequest, { params }: Params) {
  const { username } = await params;
  if (!isCrewUsername(username)) return NextResponse.json({ error: 'Fannst ekki.' }, { status: 404 });
  if (!(await requireOwner(username))) return NextResponse.json({ error: 'Þú þarft að skrá þig inn með réttum aðgangi.' }, { status: 401 });

  let body: { password?: unknown };
  { const parsed = await jsonObject(req); if (!parsed) return badJson(); body = parsed; }
  const problem = passwordProblem(body.password);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });

  await setPasswordHash(username, await hashPassword(body.password as string));
  return NextResponse.json({ ok: true, hasPassword: true });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { username } = await params;
  if (!isCrewUsername(username)) return NextResponse.json({ error: 'Fannst ekki.' }, { status: 404 });
  if (!(await requireOwner(username))) return NextResponse.json({ error: 'Þú þarft að skrá þig inn með réttum aðgangi.' }, { status: 401 });
  await setPasswordHash(username, null);
  return NextResponse.json({ ok: true, hasPassword: false });
}

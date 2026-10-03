import { NextRequest, NextResponse } from 'next/server';
import { badJson, jsonObject } from '@/lib/http';
import { requireOwner, isCrewUsername } from '@/lib/crew';
import { getEmail, setEmail } from '@/lib/crew-email';
import { emailProblem } from '@/lib/email';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ username: string }> };

const NOT_YOU = () => NextResponse.json({ error: 'Þú þarft að skrá þig inn með réttum aðgangi.' }, { status: 401 });
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

/** A member's own email address, seen and set on their wall only: where a
    sign-in link goes when they ask for one, and word of the play nights
    unless they turn it off. */
export async function GET(_req: NextRequest, { params }: Params) {
  const { username } = await params;
  if (!isCrewUsername(username)) return NextResponse.json({ error: 'Fannst ekki.' }, { status: 404 });
  if (!(await requireOwner(username))) return NOT_YOU();
  return json({ email: await getEmail(username) });
}

export async function PUT(req: NextRequest, { params }: Params) {
  const { username } = await params;
  if (!isCrewUsername(username)) return NextResponse.json({ error: 'Fannst ekki.' }, { status: 404 });
  if (!(await requireOwner(username))) return NOT_YOU();

  let body: { email?: unknown; nights?: unknown };
  { const parsed = await jsonObject(req); if (!parsed) return badJson(); body = parsed; }
  const problem = emailProblem(body.email);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });

  await setEmail(username, { address: body.email as string, nights: body.nights !== false });
  return json({ email: await getEmail(username) });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { username } = await params;
  if (!isCrewUsername(username)) return NextResponse.json({ error: 'Fannst ekki.' }, { status: 404 });
  if (!(await requireOwner(username))) return NOT_YOU();
  await setEmail(username, null);
  return json({ email: null });
}

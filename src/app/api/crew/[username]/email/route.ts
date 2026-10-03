import { NextRequest, NextResponse } from 'next/server';
import { badJson, jsonObject } from '@/lib/http';
import { requireOwner, isCrewUsername } from '@/lib/crew';
import { getEmail, getName, updateContact } from '@/lib/crew-email';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ username: string }> };

const NOT_YOU = () => NextResponse.json({ error: 'Þú þarft að skrá þig inn með réttum aðgangi.' }, { status: 401 });
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

/** A member's own name and email address, seen and set on their wall only:
    the address is where a sign-in link goes when they ask for one, and word
    of the play nights unless they turn it off; the name is what the letters
    call them, instead of their Minecraft name. */
export async function GET(_req: NextRequest, { params }: Params) {
  const { username } = await params;
  if (!isCrewUsername(username)) return NextResponse.json({ error: 'Fannst ekki.' }, { status: 404 });
  if (!(await requireOwner(username))) return NOT_YOU();
  return json({ email: await getEmail(username), name: await getName(username) });
}

/** `{ name, email, nights }`; an empty name or address clears it. */
export async function PUT(req: NextRequest, { params }: Params) {
  const { username } = await params;
  if (!isCrewUsername(username)) return NextResponse.json({ error: 'Fannst ekki.' }, { status: 404 });
  if (!(await requireOwner(username))) return NOT_YOU();

  const body = await jsonObject(req);
  if (!body) return badJson();
  const problem = await updateContact(username, body);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });
  return json({ email: await getEmail(username), name: await getName(username) });
}

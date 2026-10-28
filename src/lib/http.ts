import { NextResponse } from 'next/server';

/** A request's JSON body, if it is an object. Malformed JSON, an empty body,
    `null`, a bare value or an array all come back as null, so a route answers
    them with a 400 instead of throwing on the first field it reads. */
export async function jsonObject(req: Request): Promise<Record<string, unknown> | null> {
  const body: unknown = await req.json().catch(() => null);
  return body !== null && typeof body === 'object' && !Array.isArray(body) ? (body as Record<string, unknown>) : null;
}

export const badJson = () => NextResponse.json({ error: 'Ógilt JSON.' }, { status: 400 });

/** A member's writes (a sign, a reply, a lantern, a vote, a fire, a duel's
    time), counted a minute at a time: more than a brisk hand reaches, and
    what a loop would get through before the walls were swept. */
export async function tooManyWrites(username: string): Promise<boolean> {
  const { checkRateLimit } = await import('./rateLimit');
  return (await checkRateLimit(username.toLowerCase(), 'crew-write', WRITES_A_MINUTE, 60)).limited;
}
const WRITES_A_MINUTE = 40;
export const tooMany = () => NextResponse.json({ error: 'Of margt í einu. Andaðu rólega og reyndu aftur eftir smástund.' }, { status: 429 });

import { NextResponse } from 'next/server';

/** A request's JSON body, if it is an object. Malformed JSON, an empty body,
    `null`, a bare value or an array all come back as null, so a route answers
    them with a 400 instead of throwing on the first field it reads. */
export async function jsonObject(req: Request): Promise<Record<string, unknown> | null> {
  const body: unknown = await req.json().catch(() => null);
  return body !== null && typeof body === 'object' && !Array.isArray(body) ? (body as Record<string, unknown>) : null;
}

export const badJson = () => NextResponse.json({ error: 'Ógilt JSON.' }, { status: 400 });

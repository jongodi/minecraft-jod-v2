import { NextResponse, after } from 'next/server';
import { getStatus, keepFor, noteCrewSeen } from '@/lib/server-status';

export type { StatusResponse } from '@/lib/server-status';

/* The server's status (src/lib/server-status.ts): one answer shared by every
   visitor for as long as it is good for, at the CDN as in memory. */
export async function GET() {
  const body = await getStatus();
  /* noting who came to a play night is the store's business, after the answer has gone */
  after(() => noteCrewSeen(body));
  const keep = Math.round(keepFor(body) / 1000);
  const cache = body.source === 'error' ? `s-maxage=${keep}` : `s-maxage=${keep}, stale-while-revalidate=60`;
  return NextResponse.json(body, { headers: { 'Cache-Control': cache } });
}

import { NextResponse } from 'next/server';
import { crewSummaries } from '@/lib/crew-summary';

export const dynamic = 'force-dynamic';

/** One line per member for the roll call and the room (src/lib/crew-summary.ts). */
export type { CrewSummary } from '@/lib/crew-summary';

export async function GET() {
  const rows = await crewSummaries();
  return NextResponse.json(rows, { headers: { 'Cache-Control': 'no-store' } });
}

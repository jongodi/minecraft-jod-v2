import { NextResponse } from 'next/server';
import { getStatus } from '@/lib/status/server';

export const dynamic = 'force-dynamic';

/** What the page polls once a minute. The upstream fetch is cached 30 s. */
export async function GET() {
  const status = await getStatus();
  return NextResponse.json(status, { headers: { 'Cache-Control': 'no-store' } });
}

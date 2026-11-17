import { NextResponse } from 'next/server';
import { requireAdmin, unauthorizedResponse } from '@/lib/auth';
import { readStatus, waitingOnServer, type FramkollunStatus } from '@/lib/myndavel-status';

export const dynamic = 'force-dynamic';

export interface MyndavelView {
  /** whether the site takes photos at all (MYNDAVEL_INGEST_SECRET is set) */
  connected: boolean;
  status: FramkollunStatus | null;
  /** photos in the plugin's queue on the game server; null when exaroton could not say */
  waiting: number | null;
  now: string;
}

/** The Myndavél's chain as the admin panel shows it. */
export async function GET() {
  if (!(await requireAdmin())) return unauthorizedResponse();
  const [status, waiting] = await Promise.all([readStatus().catch(() => null), waitingOnServer()]);
  return NextResponse.json({
    connected: !!process.env.MYNDAVEL_INGEST_SECRET?.trim(), status, waiting, now: new Date().toISOString(),
  } satisfies MyndavelView);
}

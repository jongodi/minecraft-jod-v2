import { NextRequest, NextResponse } from 'next/server';
import {
  checkAllPackUpdates,
  cacheUpdateResults,
  getCachedUpdateResults,
  type DatapackUpdateResult,
} from '@/lib/datapack-updates';
import { checkRateLimit } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

// Re-export the type so existing imports from this route still work
export type { DatapackUpdateResult };

export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const { limited } = await checkRateLimit(ip, 'check-updates', { max: 10, windowSeconds: 300 });
  if (limited) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

  const force = req.nextUrl.searchParams.get('force') === '1';

  // Serve from Redis cache when available (populated by the cron job)
  if (!force) {
    const cached = await getCachedUpdateResults();
    if (cached) return NextResponse.json(cached);
  }

  // Cache miss (or forced refresh) — run live checks
  const results = await checkAllPackUpdates();

  // Persist to Redis so subsequent requests are instant
  void cacheUpdateResults(results);

  return NextResponse.json(results);
}

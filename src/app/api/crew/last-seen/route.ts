import { NextRequest, NextResponse } from 'next/server';
import { CREW_USERNAMES } from '@/lib/crew-list';
import { checkRateLimit } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const { limited } = await checkRateLimit(ip, 'crew-last-seen', { max: 60, windowSeconds: 60 });
  if (limited) return NextResponse.json({}, { status: 429 });
  if (!process.env.REDIS_URL) {
    return NextResponse.json({});
  }
  try {
    const { getRedis } = await import('@/lib/redis');
    const redis = getRedis();
    const keys = CREW_USERNAMES.map(u => `crew:lastseen:${u.toLowerCase()}`);
    const values = await redis.mget(...keys);
    const result: Record<string, string> = {};
    CREW_USERNAMES.forEach((u, i) => {
      if (values[i]) result[u.toLowerCase()] = values[i] as string;
    });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({});
  }
}

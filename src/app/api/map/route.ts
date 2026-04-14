import { NextRequest, NextResponse } from 'next/server';
import { readMap } from '@/lib/map';
import { trackHit } from '@/lib/analytics';
import { checkRateLimit } from '@/lib/rateLimit';

export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const { limited } = await checkRateLimit(ip, 'map', { max: 30, windowSeconds: 60 });
  if (limited) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

  void trackHit('map');
  const cfg = await readMap();
  return NextResponse.json(cfg);
}

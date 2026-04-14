// Public gallery API — returns only active photos, sorted by order
import { NextRequest, NextResponse } from 'next/server';
import { readGallery } from '@/lib/gallery';
import { trackHit } from '@/lib/analytics';
import { checkRateLimit } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const { limited } = await checkRateLimit(ip, 'gallery', { max: 30, windowSeconds: 60 });
  if (limited) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

  void trackHit('gallery');
  const all    = await readGallery();
  const active = all
    .filter(p => p.active)
    .sort((a, b) => a.order - b.order);
  return NextResponse.json(active);
}

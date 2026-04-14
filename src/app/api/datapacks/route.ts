// Public endpoint — returns all datapacks (static + custom) with Redis version overrides.
// Used by DatapacksSection on the public site.
import { NextRequest, NextResponse } from 'next/server';
import { getAllPacks } from '@/lib/custom-datapacks';
import { checkRateLimit } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

async function getVersionOverrides(): Promise<Record<number, string>> {
  if (!process.env.REDIS_URL) return {};
  try {
    const { rGet } = await import('@/lib/redis');
    return (await rGet<Record<number, string>>('datapacks:versions')) ?? {};
  } catch { return {}; }
}

export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const { limited } = await checkRateLimit(ip, 'datapacks', { max: 30, windowSeconds: 60 });
  if (limited) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

  const [all, overrides] = await Promise.all([getAllPacks(), getVersionOverrides()]);
  return NextResponse.json(
    all.map(p => ({ ...p, currentVersion: overrides[p.id] ?? p.currentVersion ?? null })),
    { headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=30' } }
  );
}

// Public endpoint — returns all datapacks (static + custom) with Redis version overrides.
// Used by DatapacksSection on the public site.
import { NextResponse } from 'next/server';
import { getAllPacks } from '@/lib/custom-datapacks';

export const dynamic = 'force-dynamic';

async function getVersionOverrides(): Promise<Record<number, string>> {
  if (!process.env.REDIS_URL) return {};
  try {
    const { rGet } = await import('@/lib/redis');
    return (await rGet<Record<number, string>>('datapacks:versions')) ?? {};
  } catch { return {}; }
}

export async function GET() {
  const [all, overrides] = await Promise.all([getAllPacks(), getVersionOverrides()]);
  return NextResponse.json(
    all.map(p => ({ ...p, currentVersion: overrides[p.id] ?? p.currentVersion ?? null })),
    { headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=30' } }
  );
}

// Public: the packs shown on the site, in shelf order, with installed versions applied.
import { NextResponse } from 'next/server';
import { getPublicPacks, toPublicPack } from '@/lib/datapacks-store';

export const dynamic = 'force-dynamic';

export async function GET() {
  const packs = await getPublicPacks();
  return NextResponse.json(packs.map(toPublicPack), { headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=30' } });
}

// Public gallery API — returns only active photos, sorted by order
import { NextResponse } from 'next/server';
import { readGallery } from '@/lib/gallery';

export const dynamic = 'force-dynamic';

export async function GET() {
  const all    = await readGallery();
  const active = all
    .filter(p => p.active)
    .sort((a, b) => a.order - b.order);
  return NextResponse.json(active);
}

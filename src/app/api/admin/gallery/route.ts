// Admin gallery — returns ALL photos (including inactive), for the admin panel,
// each with the id of the map pin it is linked to (or null)
import { NextResponse } from 'next/server';
import { readGallery } from '@/lib/gallery';
import { readMap, locationForPhoto } from '@/lib/map';
import { requireAdmin, unauthorizedResponse } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!(await requireAdmin())) return unauthorizedResponse();
  const [all, map] = await Promise.all([readGallery(), readMap()]);
  const photos = all
    .sort((a, b) => a.order - b.order)
    .map(p => ({ ...p, locationId: locationForPhoto(map, p.id)?.id ?? null }));
  return NextResponse.json(photos, { headers: { 'Cache-Control': 'no-store' } });
}

// Admin gallery
//   GET  → ALL photos (including inactive), each with the id of the map pin it is linked to (or null)
//   POST → register a photo the browser has already uploaded straight to Vercel Blob
import { NextRequest, NextResponse } from 'next/server';
import { readGallery, addGalleryPhoto } from '@/lib/gallery';
import { readMap, locationForPhoto, linkPhotoToLocation } from '@/lib/map';
import { requireAdmin, unauthorizedResponse } from '@/lib/auth';
import { detectBlobAccess, displayUrlFor, hasBlob, isBlobHost } from '@/lib/blob-store';

export const dynamic = 'force-dynamic';

const GALLERY_PATH = /^gallery\/([0-9a-f-]{36})\.(png|jpe?g|webp|gif|avif)$/;

export async function GET() {
  if (!(await requireAdmin())) return unauthorizedResponse();
  const [all, map] = await Promise.all([readGallery(), readMap()]);
  const photos = all
    .sort((a, b) => a.order - b.order)
    .map(p => ({ ...p, locationId: locationForPhoto(map, p.id)?.id ?? null }));
  return NextResponse.json(photos, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return unauthorizedResponse();
  if (!hasBlob()) return NextResponse.json({ error: 'Blob-geymsla er ekki stillt.' }, { status: 400 });

  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  const url      = typeof body?.url === 'string' ? body.url : '';
  const pathname = typeof body?.pathname === 'string' ? body.pathname : '';
  const title    = typeof body?.title === 'string' ? body.title : '';
  const sublabel = typeof body?.sublabel === 'string' ? body.sublabel : '';
  const locationId = typeof body?.locationId === 'number' && Number.isFinite(body.locationId) ? Math.floor(body.locationId) : null;

  const m = GALLERY_PATH.exec(pathname);
  if (!m || !isBlobHost(url) || !new URL(url).pathname.endsWith('/' + pathname)) {
    return NextResponse.json({ error: 'Ógild myndaslóð.' }, { status: 400 });
  }
  const id = m[1];
  if ((await readGallery()).some(p => p.id === id)) return NextResponse.json({ error: 'Myndin er þegar skráð.' }, { status: 409 });

  const access  = await detectBlobAccess();
  const fileUrl = displayUrlFor({ url, pathname }, access);
  const photo   = await addGalleryPhoto({ id, fileUrl, title, sublabel });
  const linkedLocationId = locationId !== null ? await linkPhotoToLocation(id, locationId) : null;
  return NextResponse.json({ ...photo, locationId: linkedLocationId }, { status: 201 });
}

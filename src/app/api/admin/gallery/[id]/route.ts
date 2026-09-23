import { NextRequest, NextResponse } from 'next/server';
import { badJson, jsonObject } from '@/lib/http';
import { readGallery, writeGallery } from '@/lib/gallery';
import { linkPhotoToLocation, unlinkPhoto } from '@/lib/map';
import { requireAdmin, unauthorizedResponse } from '@/lib/auth';
import { deleteStoredImage } from '@/lib/blob-store';

export const dynamic = 'force-dynamic';

// PATCH — update title, sublabel, active, order, or the map pin the photo is linked to
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin())) return unauthorizedResponse();
  const { id } = await params;
  const body = await jsonObject(req);
  if (!body) return badJson();

  const gallery = await readGallery();
  const idx = gallery.findIndex(p => p.id === id);
  if (idx === -1) return NextResponse.json({ error: 'Fannst ekki.' }, { status: 404 });

  const { title, sublabel, active, order, locationId } = body;
  gallery[idx] = {
    ...gallery[idx],
    ...(typeof title === 'string'    && { title:    title.trim().slice(0, 100) }),
    ...(typeof sublabel === 'string' && { sublabel: sublabel.trim().slice(0, 100) }),
    ...(typeof active === 'boolean'  && { active }),
    ...(typeof order === 'number' && Number.isFinite(order) && { order: Math.floor(order) }),
  };
  await writeGallery(gallery);

  // `locationId`: number = link the photo to that pin (and to no other), null = unlink everywhere.
  let linkedLocationId: number | null | undefined;
  if (locationId === null || (typeof locationId === 'number' && Number.isFinite(locationId))) {
    linkedLocationId = await linkPhotoToLocation(id, locationId === null ? null : Math.floor(locationId));
  }

  return NextResponse.json({ ...gallery[idx], ...(linkedLocationId !== undefined && { locationId: linkedLocationId }) });
}

// DELETE — remove photo from the gallery, from any map pin, and from storage
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin())) return unauthorizedResponse();
  const { id } = await params;

  const gallery = await readGallery();
  const photo = gallery.find(p => p.id === id);
  if (!photo) return NextResponse.json({ error: 'Fannst ekki.' }, { status: 404 });

  const remaining = gallery.filter(p => p.id !== id);
  await writeGallery(remaining);
  try { await unlinkPhoto(id); } catch (e) { console.error('unlinkPhoto error:', e); }

  // Remove the file itself: from Blob or from /public/screenshots
  await deleteStoredImage(photo.filename);

  return NextResponse.json({ ok: true });
}

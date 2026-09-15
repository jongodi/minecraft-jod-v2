import { NextRequest, NextResponse } from 'next/server';
import { readGallery, writeGallery, hasBlob, type GalleryPhoto } from '@/lib/gallery';
import { linkPhotoToLocation } from '@/lib/map';
import { requireAdmin, unauthorizedResponse } from '@/lib/auth';
import { promises as fs } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';

const ALLOWED_EXT = new Set(['png', 'jpg', 'jpeg', 'webp', 'gif', 'avif']);

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return unauthorizedResponse();

  const formData = await req.formData();
  const file     = formData.get('file')     as File | null;
  const title    = ((formData.get('title')    as string | null) ?? '').trim().slice(0, 100) || 'Ný mynd úr leiknum';
  const sublabel = ((formData.get('sublabel') as string | null) ?? '').trim().slice(0, 100);
  // Optional: link the new photo to a map pin straight away
  const locRaw     = formData.get('locationId');
  const locationId = typeof locRaw === 'string' && /^\d+$/.test(locRaw) ? Number(locRaw) : null;

  if (!file) return NextResponse.json({ error: 'Engin skrá valin.' }, { status: 400 });
  if (!file.type.startsWith('image/')) return NextResponse.json({ error: 'Aðeins er hægt að hlaða upp myndum.' }, { status: 400 });
  if (file.size > 10 * 1024 * 1024)   return NextResponse.json({ error: 'Skráin er of stór (hámark 10 MB).' }, { status: 400 });

  const rawExt = file.name.split('.').pop()?.toLowerCase() ?? '';
  const ext = ALLOWED_EXT.has(rawExt) ? rawExt : 'png';
  const id  = randomUUID();
  let fileUrl: string;

  if (hasBlob()) {
    const { put } = await import('@vercel/blob');
    const blob = await put(`gallery/${id}.${ext}`, file, { access: 'public' });
    fileUrl = blob.url;
  } else {
    // Filesystem fallback (local dev)
    const filename = `upload-${id}.${ext}`;
    const savePath = path.join(process.cwd(), 'public', 'screenshots', filename);
    await fs.mkdir(path.dirname(savePath), { recursive: true });
    await fs.writeFile(savePath, Buffer.from(await file.arrayBuffer()));
    fileUrl = `/screenshots/${filename}`;
  }

  const gallery = await readGallery();
  const maxOrder = gallery.reduce((m, p) => Math.max(m, p.order), 0);

  const newPhoto: GalleryPhoto = {
    id:       id,
    filename: fileUrl,
    title,
    sublabel,
    gradient: 'linear-gradient(160deg, #1a1a1a 0%, #2a2a2a 100%)',
    active:   true,
    order:    maxOrder + 1,
  };

  gallery.push(newPhoto);
  await writeGallery(gallery);

  let linkedLocationId: number | null = null;
  if (locationId !== null) linkedLocationId = await linkPhotoToLocation(id, locationId);

  return NextResponse.json({ ...newPhoto, locationId: linkedLocationId }, { status: 201 });
}

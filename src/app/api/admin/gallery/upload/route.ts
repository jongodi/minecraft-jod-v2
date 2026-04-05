import { NextRequest, NextResponse } from 'next/server';
import { readGallery, writeGallery, type GalleryPhoto } from '@/lib/gallery';
import { requireAdmin, unauthorizedResponse } from '@/lib/auth';
import { promises as fs } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return unauthorizedResponse();

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  const title    = (formData.get('title')    as string | null) ?? 'NEW SCREENSHOT';
  const sublabel = (formData.get('sublabel') as string | null) ?? '';

  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

  // Validate file type
  if (!file.type.startsWith('image/')) {
    return NextResponse.json({ error: 'Only image files are allowed' }, { status: 400 });
  }

  // Max 10 MB
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: 'File too large (max 10 MB)' }, { status: 400 });
  }

  const ext      = file.name.split('.').pop()?.toLowerCase() ?? 'png';
  const filename = `upload-${randomUUID()}.${ext}`;
  const savePath = path.join(process.cwd(), 'public', 'screenshots', filename);

  // Ensure directory exists
  await fs.mkdir(path.dirname(savePath), { recursive: true });

  // Write file
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(savePath, buffer);

  const gallery = await readGallery();
  const maxOrder = gallery.reduce((m, p) => Math.max(m, p.order), 0);

  const newPhoto: GalleryPhoto = {
    id:       randomUUID(),
    filename: `/screenshots/${filename}`,
    title:    title.toUpperCase(),
    sublabel: sublabel.toUpperCase(),
    gradient: 'linear-gradient(160deg, #1a1a1a 0%, #2a2a2a 100%)',
    active:   true,
    order:    maxOrder + 1,
  };

  gallery.push(newPhoto);
  await writeGallery(gallery);

  return NextResponse.json(newPhoto, { status: 201 });
}

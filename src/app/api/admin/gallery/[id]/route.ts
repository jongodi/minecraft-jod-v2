import { NextRequest, NextResponse } from 'next/server';
import { readGallery, writeGallery } from '@/lib/gallery';
import { requireAdmin, unauthorizedResponse } from '@/lib/auth';
import { promises as fs } from 'fs';
import path from 'path';

// PATCH — update title, sublabel, active, or order
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin())) return unauthorizedResponse();
  const { id } = await params;
  const body = await req.json() as Partial<{ title: string; sublabel: string; active: boolean; order: number }>;

  const gallery = await readGallery();
  const idx = gallery.findIndex(p => p.id === id);
  if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  gallery[idx] = { ...gallery[idx], ...body };
  await writeGallery(gallery);
  return NextResponse.json(gallery[idx]);
}

// DELETE — remove photo from gallery.json and optionally from disk
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin())) return unauthorizedResponse();
  const { id } = await params;

  const gallery = await readGallery();
  const photo = gallery.find(p => p.id === id);
  if (!photo) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const remaining = gallery.filter(p => p.id !== id);
  await writeGallery(remaining);

  // Remove the actual file if it's in /public/screenshots/
  try {
    const absPath = path.join(process.cwd(), 'public', photo.filename.replace(/^\//, ''));
    await fs.unlink(absPath);
  } catch {
    // File may not exist — not a fatal error
  }

  return NextResponse.json({ ok: true });
}

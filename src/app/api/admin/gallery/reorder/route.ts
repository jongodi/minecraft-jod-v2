import { NextRequest, NextResponse } from 'next/server';
import { readGallery, writeGallery } from '@/lib/gallery';
import { requireAdmin, unauthorizedResponse } from '@/lib/auth';

// POST body: { ids: string[] } — ordered array of photo IDs
export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return unauthorizedResponse();

  const { ids } = await req.json() as { ids?: string[] };
  if (!Array.isArray(ids)) {
    return NextResponse.json({ error: 'ids must be an array' }, { status: 400 });
  }

  const gallery = await readGallery();
  const photoMap = Object.fromEntries(gallery.map(p => [p.id, p]));

  // Apply new order to the specified IDs
  for (let i = 0; i < ids.length; i++) {
    if (photoMap[ids[i]]) {
      photoMap[ids[i]].order = i + 1;
    }
  }

  await writeGallery(Object.values(photoMap));
  return NextResponse.json({ ok: true });
}

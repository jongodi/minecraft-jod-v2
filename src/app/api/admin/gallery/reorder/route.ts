import { NextRequest, NextResponse } from 'next/server';
import { readGallery, writeGallery } from '@/lib/gallery';
import { requireAdmin, unauthorizedResponse } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// POST body: { ids: string[] } — complete ordered array of all photo IDs
export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return unauthorizedResponse();

  const { ids } = await req.json() as { ids?: string[] };
  if (!Array.isArray(ids)) {
    return NextResponse.json({ error: 'ids must be an array' }, { status: 400 });
  }

  const gallery = await readGallery();

  // Validate: submitted IDs must be a complete, non-duplicate set matching all photos
  if (new Set(ids).size !== ids.length) {
    return NextResponse.json({ error: 'ids contains duplicates' }, { status: 400 });
  }
  const existingIds = new Set(gallery.map(p => p.id));
  const missing = gallery.filter(p => !ids.includes(p.id)).map(p => p.id);
  if (missing.length > 0) {
    return NextResponse.json({ error: `Missing photo ids: ${missing.join(', ')}` }, { status: 400 });
  }
  const unknown = ids.filter(id => !existingIds.has(id));
  if (unknown.length > 0) {
    return NextResponse.json({ error: `Unknown photo ids: ${unknown.join(', ')}` }, { status: 400 });
  }

  const photoMap = Object.fromEntries(gallery.map(p => [p.id, p]));
  for (let i = 0; i < ids.length; i++) {
    photoMap[ids[i]].order = i + 1;
  }

  await writeGallery(Object.values(photoMap));
  return NextResponse.json({ ok: true });
}

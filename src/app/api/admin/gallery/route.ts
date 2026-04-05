// Admin gallery — returns ALL photos (including inactive), for the admin panel
import { NextResponse } from 'next/server';
import { readGallery } from '@/lib/gallery';
import { requireAdmin, unauthorizedResponse } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!(await requireAdmin())) return unauthorizedResponse();
  const all = await readGallery();
  return NextResponse.json(all.sort((a, b) => a.order - b.order));
}

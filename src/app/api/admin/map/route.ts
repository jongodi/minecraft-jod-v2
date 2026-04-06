import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, unauthorizedResponse } from '@/lib/auth';
import { readMap, writeMap, type MapConfig } from '@/lib/map';

export async function GET() {
  if (!(await requireAdmin())) return unauthorizedResponse();
  const cfg = await readMap();
  return NextResponse.json(cfg);
}

export async function PUT(req: NextRequest) {
  if (!(await requireAdmin())) return unauthorizedResponse();
  const body = await req.json() as Partial<MapConfig>;
  if (!Array.isArray(body.locations) || !Array.isArray(body.zones)) {
    return NextResponse.json({ error: 'locations and zones arrays required' }, { status: 400 });
  }
  await writeMap({ locations: body.locations, zones: body.zones });
  return NextResponse.json({ ok: true });
}

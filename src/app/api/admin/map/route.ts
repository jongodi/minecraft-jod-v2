import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, unauthorizedResponse } from '@/lib/auth';
import { readMap, writeMap, sanitizeMapConfig } from '@/lib/map';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!(await requireAdmin())) return unauthorizedResponse();
  const cfg = await readMap();
  return NextResponse.json(cfg, { headers: { 'Cache-Control': 'no-store' } });
}

export async function PUT(req: NextRequest) {
  if (!(await requireAdmin())) return unauthorizedResponse();
  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Ógilt JSON.' }, { status: 400 }); }

  const result = sanitizeMapConfig(body);
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: 400 });

  try {
    await writeMap(result.config);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Ekki tókst að vista kortið.' }, { status: 500 });
  }
  return NextResponse.json({ ok: true, config: await readMap() });
}

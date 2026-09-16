import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, unauthorizedResponse } from '@/lib/auth';
import { getPacksView, saveSettings, type PackSettings } from '@/lib/datapacks-store';
import { errorMessage } from '@/lib/icelandic';

export const dynamic = 'force-dynamic';

// GET — every pack (seed and custom) with settings applied
export async function GET() {
  if (!(await requireAdmin())) return unauthorizedResponse();
  return NextResponse.json(await getPacksView(), { headers: { 'Cache-Control': 'no-store' } });
}

// PUT — merge per-pack settings; body: { settings: { [id]: { version?, hidden?, glyph?, order? } } }
// The old shape { versions: { [id]: string } } is still accepted.
export async function PUT(req: NextRequest) {
  if (!(await requireAdmin())) return unauthorizedResponse();
  const body = await req.json().catch(() => null) as { settings?: Record<string, Partial<PackSettings>>; versions?: Record<string, string> } | null;
  const patch: Record<number, Partial<Record<keyof PackSettings, unknown>>> = {};
  if (body?.settings && typeof body.settings === 'object') {
    for (const [id, s] of Object.entries(body.settings)) patch[Number(id)] = s;
  } else if (body?.versions && typeof body.versions === 'object') {
    for (const [id, v] of Object.entries(body.versions)) patch[Number(id)] = { version: v };
  } else {
    return NextResponse.json({ error: 'Stillingar vantar.' }, { status: 400 });
  }
  try {
    await saveSettings(patch);
    return NextResponse.json({ ok: true, packs: await getPacksView() });
  } catch (err) {
    return NextResponse.json({ error: errorMessage(err, 'Ekki tókst að vista.') }, { status: 500 });
  }
}

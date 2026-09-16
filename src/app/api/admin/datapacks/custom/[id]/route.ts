import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, unauthorizedResponse } from '@/lib/auth';
import { CUSTOM_ID_START, deleteCustomPack, getPacksView, saveSettings, updateCustomPack } from '@/lib/datapacks-store';
import { parsePackBody } from '../fields';
import { errorMessage } from '@/lib/icelandic';

export const dynamic = 'force-dynamic';

function customId(id: string): number | null {
  const n = Number(id);
  return Number.isInteger(n) && n >= CUSTOM_ID_START ? n : null;
}

// PUT — edit a custom pack's fields (and glyph or hidden, which live in settings)
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return unauthorizedResponse();
  const id = customId((await params).id);
  if (id === null) return NextResponse.json({ error: 'Aðeins er hægt að breyta eigin pökkum.' }, { status: 400 });
  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  const parsed = parsePackBody(body ?? {}, { requireAll: false });
  if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
  try {
    const pack = await updateCustomPack(id, parsed.fields);
    if (!pack) return NextResponse.json({ error: 'Pakkinn fannst ekki.' }, { status: 404 });
    if (parsed.settings) await saveSettings({ [id]: parsed.settings });
    return NextResponse.json({ pack, packs: await getPacksView() });
  } catch (err) {
    return NextResponse.json({ error: errorMessage(err, 'Ekki tókst að vista.') }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return unauthorizedResponse();
  const id = customId((await params).id);
  if (id === null) return NextResponse.json({ error: 'Aðeins er hægt að eyða eigin pökkum.' }, { status: 400 });
  try {
    await deleteCustomPack(id);
    return NextResponse.json({ ok: true, packs: await getPacksView() });
  } catch (err) {
    return NextResponse.json({ error: errorMessage(err, 'Ekki tókst að eyða.') }, { status: 500 });
  }
}

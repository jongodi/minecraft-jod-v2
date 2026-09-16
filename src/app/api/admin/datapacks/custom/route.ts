import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, unauthorizedResponse } from '@/lib/auth';
import { addCustomPack, getCustomPacks, getPacksView, saveSettings } from '@/lib/datapacks-store';
import { parsePackBody } from './fields';
import { errorMessage } from '@/lib/icelandic';

export const dynamic = 'force-dynamic';

// GET — the custom packs only
export async function GET() {
  if (!(await requireAdmin())) return unauthorizedResponse();
  return NextResponse.json(await getCustomPacks());
}

// POST — create a custom pack. Body: pack fields plus optional { glyph, hidden }.
export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return unauthorizedResponse();
  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  const parsed = parsePackBody(body ?? {}, { requireAll: true });
  if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
  try {
    const pack = await addCustomPack(parsed.fields as Parameters<typeof addCustomPack>[0]);
    if (parsed.settings) await saveSettings({ [pack.id]: parsed.settings });
    return NextResponse.json({ pack, packs: await getPacksView() }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: errorMessage(err, 'Ekki tókst að vista.') }, { status: 500 });
  }
}

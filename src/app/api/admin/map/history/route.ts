import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, unauthorizedResponse } from '@/lib/auth';
import { readMap, writeMap, sanitizeMapConfig } from '@/lib/map';
import { readHistory, type MapVersionInfo } from '@/lib/map-history';
import { errorMessage } from '@/lib/icelandic';

/* The map's history, for the admin panel: GET lists the last saves (newest
   first) with what each changed; POST { id } restores one, saved as a new
   version so the restore can be undone the same way. */

export const dynamic = 'force-dynamic';

const NO_REDIS = 'Saga kortsins er aðeins geymd þegar Redis er tengt (REDIS_URL).';

export async function GET() {
  if (!(await requireAdmin())) return unauthorizedResponse();
  if (!process.env.REDIS_URL) return NextResponse.json({ error: NO_REDIS }, { status: 503 });
  try {
    const versions: MapVersionInfo[] = (await readHistory()).map(({ id, at, summary }) => ({ id, at, summary }));
    return NextResponse.json({ versions }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    return NextResponse.json({ error: errorMessage(e) }, { status: 500 });
  }
}

const when = (iso: string) => new Date(iso).toLocaleString('is-IS', {
  day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Atlantic/Reykjavik',
});

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return unauthorizedResponse();
  if (!process.env.REDIS_URL) return NextResponse.json({ error: NO_REDIS }, { status: 503 });
  const body = await req.json().catch(() => null) as { id?: unknown } | null;
  if (typeof body?.id !== 'string') return NextResponse.json({ error: 'Útgáfu vantar.' }, { status: 400 });

  try {
    const version = (await readHistory()).find(v => v.id === body.id);
    if (!version) return NextResponse.json({ error: 'Útgáfan fannst ekki í sögunni.' }, { status: 404 });
    /* checked like any save, so an old version never brings back something the editor would refuse */
    const result = sanitizeMapConfig(version.config);
    if ('error' in result) return NextResponse.json({ error: result.error }, { status: 400 });
    await writeMap(result.config, `Endurheimt frá ${when(version.at)}`);
    return NextResponse.json({ ok: true, config: await readMap() });
  } catch (e) {
    return NextResponse.json({ error: errorMessage(e) }, { status: 500 });
  }
}

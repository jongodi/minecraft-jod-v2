import { NextRequest, NextResponse } from 'next/server';
import { signedBy } from '@/lib/myndavel';
import { normalizeStatus, saveStatus } from '@/lib/myndavel-status';

export const dynamic = 'force-dynamic';

const MAX_BODY = 16 * 1024;

/** Framköllun's word on how it is doing, every few minutes: kept for the
    admin panel. Signed with MYNDAVEL_INGEST_SECRET, as a photo is. */
export async function POST(req: NextRequest) {
  const secret = process.env.MYNDAVEL_INGEST_SECRET?.trim();
  if (!secret) return NextResponse.json({ error: 'Myndavélin er ekki tengd vefnum.' }, { status: 503 });
  if (Number(req.headers.get('content-length') ?? 0) > MAX_BODY) return NextResponse.json({ error: 'Of stór sending.' }, { status: 413 });
  const body = await req.text();
  if (body.length > MAX_BODY) return NextResponse.json({ error: 'Of stór sending.' }, { status: 413 });
  if (!signedBy(secret, req.headers.get('x-myndavel-time'), req.headers.get('x-myndavel-signature'), body)) {
    return NextResponse.json({ error: 'Ógild undirskrift.' }, { status: 401 });
  }
  let raw: unknown;
  try { raw = JSON.parse(body); } catch { return NextResponse.json({ error: 'Ógilt JSON.' }, { status: 400 }); }
  try {
    await saveStatus(normalizeStatus(raw));
  } catch (e) {
    console.error('[myndavel] the status could not be kept:', e instanceof Error ? e.message : e);
    return NextResponse.json({ error: 'Ekki tókst að geyma stöðuna.' }, { status: 503 });
  }
  return NextResponse.json({ ok: true });
}

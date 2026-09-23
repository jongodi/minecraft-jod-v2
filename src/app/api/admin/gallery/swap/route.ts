// Admin: move the bundled screenshots in the gallery between .png and .webp.
//   GET  → what each direction would do, changing nothing
//   POST → apply one direction, writing only the entries whose target was found
import { NextRequest, NextResponse } from 'next/server';
import { readGalleryRaw, writeGallery } from '@/lib/gallery';
import { planSwap, applySwap, type Ext } from '@/lib/gallery-swap';
import { requireAdmin, unauthorizedResponse } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!(await requireAdmin())) return unauthorizedResponse();

  const gallery = await readGalleryRaw();
  const origin  = req.nextUrl.origin;
  const [toWebp, toPng] = await Promise.all([
    planSwap(gallery, 'png', 'webp', origin),
    planSwap(gallery, 'webp', 'png', origin),
  ]);
  return NextResponse.json({ toWebp, toPng }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return unauthorizedResponse();

  const body = await req.json().catch(() => null) as { to?: unknown } | null;
  const to = body?.to;
  if (to !== 'webp' && to !== 'png') {
    return NextResponse.json({ error: 'Segðu til um hvort á að skipta yfir í webp eða png.' }, { status: 400 });
  }
  const from: Ext = to === 'webp' ? 'png' : 'webp';

  /* Planned again here rather than taken from the caller: the browser's list
     may be stale, and nothing is written for a file that is not there. */
  const gallery = await readGalleryRaw();
  const plan    = await planSwap(gallery, from, to, req.nextUrl.origin);
  const ready   = plan.filter(i => i.ready);

  if (ready.length === 0) {
    const blocked = plan.length > 0;
    return NextResponse.json({
      error: blocked
        ? (plan.length % 10 === 1 && plan.length % 100 !== 11
          ? `Engin mynd var færð: ${plan.length} bíður en ${to}-skráin fannst ekki við hliðina á henni.`
          : `Engin mynd var færð: ${plan.length} bíða en ${to}-skráin fannst ekki við hliðina á þeim.`)
        : 'Engin mynd bíður þessarar breytingar.',
    }, { status: 409 });
  }

  await writeGallery(applySwap(gallery, plan));
  return NextResponse.json({ moved: ready, skipped: plan.filter(i => !i.ready) });
}

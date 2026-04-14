// Vercel Cron endpoint — runs every 6 hours (see vercel.json)
// Fetches the latest datapack versions from Modrinth/GitHub and caches the
// results in Redis so the DatapacksSection can serve them instantly.

import { NextRequest, NextResponse } from 'next/server';
import { checkAllPackUpdates, cacheUpdateResults } from '@/lib/datapack-updates';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // seconds — update checks can be slow

export async function GET(req: NextRequest) {
  // Vercel automatically sends the CRON_SECRET as a Bearer token in production.
  // In development there is no secret, so we allow unauthenticated local calls.
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const started = Date.now();

  try {
    const results = await checkAllPackUpdates();
    await cacheUpdateResults(results);

    const updatesAvailable = results.filter(r => r.updateAvailable).length;
    const errors           = results.filter(r => r.error).length;

    console.log(
      `[cron/datapack-updates] checked ${results.length} packs in ${Date.now() - started}ms` +
      ` — ${updatesAvailable} update(s) available, ${errors} error(s)`,
    );

    return NextResponse.json({
      ok:               true,
      total:            results.length,
      updatesAvailable,
      errors,
      durationMs:       Date.now() - started,
    });
  } catch (err) {
    console.error('[cron/datapack-updates] failed:', err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

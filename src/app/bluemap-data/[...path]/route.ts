import { get, BlobNotFoundError } from '@vercel/blob';
import snapshotFile from '@/lib/bluemap-snapshot.json';

/* The map data, out of Vercel Blob. A public store never reaches this route:
   next.config rewrites /bluemap-data straight to it. A private store can only
   be read with the token, so this route streams it, and the CDN keeps each
   file for a while so the function is asked once per region rather than once
   per visitor. In development a local copy under public/bluemap-data is served
   as static files before this route is ever asked. */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BLOB_DIR = 'bluemap-data';
const SEGMENT = /^[A-Za-z0-9_-][A-Za-z0-9_.-]*$/;
const MAX_DEPTH = 16;

const snapshot = snapshotFile as { syncedAt: string | null; files: string[]; blob?: { base: string; access: 'public' | 'private' } };

type Context = { params: Promise<{ path: string[] }> };

export async function GET(_req: Request, { params }: Context): Promise<Response> {
  const segments = (await params).path ?? [];
  if (segments.length === 0 || segments.length > MAX_DEPTH || !segments.every(s => SEGMENT.test(s))) {
    return new Response(null, { status: 400, headers: { 'Cache-Control': 'no-store' } });
  }
  const blob = snapshot.blob;
  if (!blob?.base) return new Response(null, { status: 404, headers: { 'Cache-Control': 'public, max-age=60' } });

  const path = segments.join('/');
  if (blob.access === 'public') {
    return Response.redirect(`${blob.base}/${BLOB_DIR}/${segments.map(encodeURIComponent).join('/')}`, 307);
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return new Response('Kortageymslan er lokuð og BLOB_READ_WRITE_TOKEN vantar.', { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
  try {
    const res = await get(`${BLOB_DIR}/${path}`, { access: 'private' });
    if (!res) return new Response(null, { status: 404, headers: { 'Cache-Control': 'public, max-age=60, s-maxage=120' } });
    if (res.statusCode !== 200 || !res.stream) return new Response(null, { status: 304 });
    return new Response(res.stream, {
      headers: {
        'Content-Type': res.blob.contentType ?? 'application/octet-stream',
        'Content-Length': String(res.blob.size ?? ''),
        'Cache-Control': 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch (err) {
    if (err instanceof BlobNotFoundError) return new Response(null, { status: 404, headers: { 'Cache-Control': 'public, max-age=60, s-maxage=120' } });
    console.warn(`[bluemap-data] ${err instanceof Error ? err.message : err}`);
    return new Response(null, { status: 502, headers: { 'Cache-Control': 'no-store' } });
  }
}

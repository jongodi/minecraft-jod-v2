// Serves photos from a private Vercel Blob store. Paths are UUID-based, so responses
// are cached for a long time; only the gallery and crew folders are reachable.
import { NextRequest, NextResponse } from 'next/server';
import { hasBlob, SERVABLE_PREFIXES } from '@/lib/blob-store';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const pathname = path.map(decodeURIComponent).join('/');
  if (!hasBlob() || pathname.includes('..') || !SERVABLE_PREFIXES.some(p => pathname.startsWith(p))) {
    return new NextResponse('Not found', { status: 404 });
  }

  try {
    const { get } = await import('@vercel/blob');
    const ifNoneMatch = req.headers.get('if-none-match') ?? undefined;
    const result = await get(pathname, { access: 'private', ifNoneMatch });
    if (!result) return new NextResponse('Not found', { status: 404 });

    const headers = new Headers({
      'Cache-Control': 'public, max-age=31536000, immutable',
      'ETag': result.blob.etag,
      'X-Content-Type-Options': 'nosniff',
    });
    if (result.statusCode === 304) return new NextResponse(null, { status: 304, headers });

    headers.set('Content-Type', result.blob.contentType || 'application/octet-stream');
    headers.set('Content-Length', String(result.blob.size));
    return new NextResponse(result.stream, { status: 200, headers });
  } catch (e) {
    console.error('blob proxy:', e);
    return new NextResponse('Not found', { status: 404 });
  }
}

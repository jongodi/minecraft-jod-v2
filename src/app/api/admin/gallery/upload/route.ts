// Gallery uploads.
//
//   GET            → how uploads work right now (blob / local / none) so the admin page can pick a path
//   POST (json)    → Vercel Blob client-upload handshake: the browser sends the file straight to Blob,
//                    which sidesteps Vercel's 4.5 MB request-body limit on API routes
//   POST (form)    → server-side upload, used in local dev (and as a fallback for small files)
//
// After a client upload the browser registers the photo with POST /api/admin/gallery.
import { NextRequest, NextResponse } from 'next/server';
import { badJson, jsonObject } from '@/lib/http';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { addGalleryPhoto } from '@/lib/gallery';
import { linkPhotoToLocation } from '@/lib/map';
import { requireAdmin, unauthorizedResponse } from '@/lib/auth';
import { detectBlobAccess, storageMode, storeImage, MAX_UPLOAD_BYTES } from '@/lib/blob-store';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';

const ALLOWED_EXT = new Set(['png', 'jpg', 'jpeg', 'webp', 'gif', 'avif']);
const GALLERY_PATH = /^gallery\/[0-9a-f-]{36}\.(png|jpe?g|webp|gif|avif)$/;

export async function GET() {
  if (!(await requireAdmin())) return unauthorizedResponse();
  const mode = storageMode();
  let access: 'public' | 'private' | null = null;
  let error: string | null = null;
  if (mode === 'blob') {
    try { access = await detectBlobAccess(); }
    catch (e) { error = e instanceof Error ? e.message : String(e); }
  }
  return NextResponse.json({ mode, access, maxBytes: MAX_UPLOAD_BYTES, error }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(req: NextRequest) {
  const contentType = req.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) return clientUploadHandshake(req);
  return serverUpload(req);
}

async function clientUploadHandshake(req: NextRequest) {
  const parsed = await jsonObject(req);
  if (!parsed || typeof parsed.type !== 'string') return badJson();
  const body = parsed as unknown as HandleUploadBody;

  // Token requests come from the admin's browser. The completion callback comes from
  // Vercel (no cookie); handleUpload verifies its signature itself.
  if (body.type === 'blob.generate-client-token' && !(await requireAdmin())) return unauthorizedResponse();

  try {
    const json = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname) => {
        if (!GALLERY_PATH.test(pathname)) throw new Error('Ógilt skráarheiti.');
        return {
          allowedContentTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/avif'],
          maximumSizeInBytes:  MAX_UPLOAD_BYTES,
          addRandomSuffix:     false,
          allowOverwrite:      false,
        };
      },
      // The browser registers the photo itself, so nothing to do here.
      onUploadCompleted: async () => {},
    });
    return NextResponse.json(json);
  } catch (e) {
    console.error('blob handshake:', e);
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Upphleðsla mistókst.' }, { status: 400 });
  }
}

async function serverUpload(req: NextRequest) {
  if (!(await requireAdmin())) return unauthorizedResponse();

  let formData: FormData;
  try { formData = await req.formData(); }
  catch { return NextResponse.json({ error: 'Gat ekki lesið skrána. Er hún of stór?' }, { status: 400 }); }

  const file     = formData.get('file')     as File | null;
  const title    = ((formData.get('title')    as string | null) ?? '');
  const sublabel = ((formData.get('sublabel') as string | null) ?? '');
  const locRaw     = formData.get('locationId');
  const locationId = typeof locRaw === 'string' && /^\d+$/.test(locRaw) ? Number(locRaw) : null;

  if (!file) return NextResponse.json({ error: 'Engin skrá valin.' }, { status: 400 });
  if (!file.type.startsWith('image/')) return NextResponse.json({ error: 'Aðeins er hægt að hlaða upp myndum.' }, { status: 400 });
  if (file.size > MAX_UPLOAD_BYTES)   return NextResponse.json({ error: `Skráin er of stór (hámark ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)} MB).` }, { status: 400 });

  const rawExt = file.name.split('.').pop()?.toLowerCase() ?? '';
  const ext = ALLOWED_EXT.has(rawExt) ? rawExt : 'png';
  const id  = randomUUID();

  let fileUrl: string;
  try {
    fileUrl = await storeImage(`gallery/${id}.${ext}`, file, file.type);
  } catch (e) {
    console.error('gallery upload:', e);
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Ekki tókst að vista myndina.' }, { status: 500 });
  }

  const photo = await addGalleryPhoto({ id, fileUrl, title, sublabel });
  const linkedLocationId = locationId !== null ? await linkPhotoToLocation(id, locationId) : null;
  return NextResponse.json({ ...photo, locationId: linkedLocationId }, { status: 201 });
}

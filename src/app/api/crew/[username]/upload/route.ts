// A member's prints go to their own folder in the store.
//
//   GET          → how uploads work right now (blob / local / none), owner only
//   POST (json)  → Vercel Blob client-upload handshake: the browser sends the file
//                  straight to Blob under crew/<username>/<id>.<ext>
//   POST (form)  → server-side upload for local development
//   DELETE       → a print taken out of the slot before it was pinned is removed again
//
// Either way the browser then pins the print with POST …/entries.
import { NextRequest, NextResponse } from 'next/server';
import { badJson, jsonObject } from '@/lib/http';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { requireOwner, isCrewUsername, readProfile, allPhotos, CREW_PATH, crewBlobPath } from '@/lib/crew';
import { detectBlobAccess, storageMode, storeImage, deleteStoredImage, MAX_UPLOAD_BYTES } from '@/lib/blob-store';
import { photoFromDraft } from '@/lib/crew-photos';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ username: string }> };

const ALLOWED_EXT = new Set(['png', 'jpg', 'jpeg', 'webp', 'gif', 'avif']);
const CONTENT_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/avif'];
const unauthorized = () => NextResponse.json({ error: 'Þú þarft að skrá þig inn með réttum aðgangi.' }, { status: 401 });

export async function GET(_req: NextRequest, { params }: Params) {
  const { username } = await params;
  if (!isCrewUsername(username) || !(await requireOwner(username))) return unauthorized();
  const mode = storageMode();
  let access: 'public' | 'private' | null = null;
  let error: string | null = null;
  if (mode === 'blob') {
    try { access = await detectBlobAccess(); }
    catch (e) { error = e instanceof Error ? e.message : String(e); }
  }
  return NextResponse.json({ mode, access, maxBytes: MAX_UPLOAD_BYTES, error }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(req: NextRequest, { params }: Params) {
  const { username } = await params;
  if (!isCrewUsername(username)) return NextResponse.json({ error: 'Fannst ekki.' }, { status: 404 });
  const contentType = req.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) return clientUploadHandshake(req, username);
  return serverUpload(req, username);
}

async function clientUploadHandshake(req: NextRequest, username: string) {
  const parsed = await jsonObject(req);
  if (!parsed || typeof parsed.type !== 'string') return badJson();
  const body = parsed as unknown as HandleUploadBody;

  // Token requests come from the member's browser. The completion callback
  // comes from Vercel (no cookie); handleUpload verifies its signature itself.
  if (body.type === 'blob.generate-client-token' && !(await requireOwner(username))) return unauthorized();

  try {
    const json = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname) => {
        const m = CREW_PATH.exec(pathname);
        if (!m || m[1] !== username.toLowerCase()) throw new Error('Ógilt skráarheiti.');
        return {
          allowedContentTypes: CONTENT_TYPES,
          maximumSizeInBytes:  MAX_UPLOAD_BYTES,
          addRandomSuffix:     false,
          allowOverwrite:      false,
        };
      },
      onUploadCompleted: async () => {},
    });
    return NextResponse.json(json);
  } catch (e) {
    console.error('crew blob handshake:', e);
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Upphleðsla mistókst.' }, { status: 400 });
  }
}

async function serverUpload(req: NextRequest, username: string) {
  if (!(await requireOwner(username))) return unauthorized();

  let formData: FormData;
  try { formData = await req.formData(); }
  catch { return NextResponse.json({ error: 'Gat ekki lesið skrána. Er hún of stór?' }, { status: 400 }); }

  const file = formData.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'Engin skrá valin.' }, { status: 400 });
  if (!file.type.startsWith('image/')) return NextResponse.json({ error: 'Aðeins er hægt að hlaða upp myndum.' }, { status: 400 });
  if (file.size > MAX_UPLOAD_BYTES)   return NextResponse.json({ error: `Skráin er of stór (hámark ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)} MB).` }, { status: 400 });

  const rawExt = file.name.split('.').pop()?.toLowerCase() ?? '';
  const ext = ALLOWED_EXT.has(rawExt) ? rawExt : 'png';
  const id  = randomUUID();
  const pathname = crewBlobPath(username, id, ext);

  try {
    const url = await storeImage(pathname, file, file.type);
    return NextResponse.json({ id, url, pathname }, { status: 201 });
  } catch (e) {
    console.error('crew upload:', e);
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Ekki tókst að vista myndina.' }, { status: 500 });
  }
}

/** A print that went up but was taken out of the slot again, before pinning. */
export async function DELETE(req: NextRequest, { params }: Params) {
  const { username } = await params;
  if (!isCrewUsername(username) || !(await requireOwner(username))) return unauthorized();
  let body: { id?: unknown; url?: unknown };
  { const parsed = await jsonObject(req); if (!parsed) return badJson(); body = parsed; }
  /* the same check a pin runs: only this member's own folder */
  const photo = photoFromDraft(username, body);
  if (!photo) return NextResponse.json({ error: 'Þessi mynd er ekki úr þinni möppu.' }, { status: 400 });
  /* a print that is already pinned is taken down through its entry, not here */
  if (allPhotos(await readProfile(username)).some(p => p.id === photo.id)) return NextResponse.json({ error: 'Myndin hangir á veggnum; taktu hana niður þar.' }, { status: 409 });
  await deleteStoredImage(photo.filename);
  return NextResponse.json({ ok: true });
}

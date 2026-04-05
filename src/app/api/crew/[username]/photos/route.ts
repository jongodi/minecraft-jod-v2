import { NextRequest, NextResponse } from 'next/server';
import { readProfile, writeProfile, getCrewSession, type CrewPhoto } from '@/lib/crew';
import { promises as fs } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

function hasBlob(): boolean {
  return !!process.env.BLOB_READ_WRITE_TOKEN;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const session = await getCrewSession();
  const { username } = await params;

  if (!session || session.username.toLowerCase() !== username.toLowerCase()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const formData = await req.formData();
  const file    = formData.get('file')    as File | null;
  const caption = (formData.get('caption') as string | null) ?? '';

  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  if (!file.type.startsWith('image/'))  return NextResponse.json({ error: 'Images only' }, { status: 400 });
  if (file.size > 10 * 1024 * 1024)    return NextResponse.json({ error: 'Max 10 MB' }, { status: 400 });

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'png';
  const id  = randomUUID();
  let fileUrl: string;

  if (hasBlob()) {
    const { put } = await import('@vercel/blob');
    const blob = await put(
      `crew/${username.toLowerCase()}/${id}.${ext}`,
      file,
      { access: 'public' }
    );
    fileUrl = blob.url;
  } else {
    // Filesystem fallback (local dev)
    const filename = `crew-${username.toLowerCase()}-${id}.${ext}`;
    const savePath = path.join(process.cwd(), 'public', 'screenshots', filename);
    await fs.mkdir(path.dirname(savePath), { recursive: true });
    await fs.writeFile(savePath, Buffer.from(await file.arrayBuffer()));
    fileUrl = `/screenshots/${filename}`;
  }

  const photo: CrewPhoto = {
    id:         id,
    filename:   fileUrl,
    caption:    caption.slice(0, 200),
    uploadedAt: new Date().toISOString(),
  };

  const profile = await readProfile(username);
  profile.photos.unshift(photo);
  await writeProfile(profile);
  return NextResponse.json(photo, { status: 201 });
}

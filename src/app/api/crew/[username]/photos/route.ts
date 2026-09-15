import { NextRequest, NextResponse } from 'next/server';
import { readProfile, writeProfile, getCrewSession, type CrewPhoto } from '@/lib/crew';
import { storeImage } from '@/lib/blob-store';
import { randomUUID } from 'crypto';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const session = await getCrewSession();
  const { username } = await params;

  if (!session || session.username.toLowerCase() !== username.toLowerCase()) {
    return NextResponse.json({ error: 'Þú þarft að skrá þig inn með réttum aðgangi.' }, { status: 401 });
  }

  const formData = await req.formData();
  const file    = formData.get('file')    as File | null;
  const caption = (formData.get('caption') as string | null) ?? '';

  if (!file) return NextResponse.json({ error: 'Engin skrá valin.' }, { status: 400 });
  if (!file.type.startsWith('image/'))  return NextResponse.json({ error: 'Aðeins myndir eru leyfðar.' }, { status: 400 });
  if (file.size > 10 * 1024 * 1024)    return NextResponse.json({ error: 'Hámark 10 MB.' }, { status: 400 });

  const rawExt = file.name.split('.').pop()?.toLowerCase() ?? '';
  const ext = /^(png|jpe?g|webp|gif|avif)$/.test(rawExt) ? rawExt : 'png';
  const id  = randomUUID();
  let fileUrl: string;
  try {
    fileUrl = await storeImage(`crew/${username.toLowerCase()}/${id}.${ext}`, file, file.type);
  } catch (e) {
    console.error('crew photo upload:', e);
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Upphleðsla mistókst.' }, { status: 500 });
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

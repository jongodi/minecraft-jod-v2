import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { updateProfile, readProfile, cleanText, crewBlobPath, LIMITS, Refusal, wallError, type CrewEntry, type CrewShotSpot } from '@/lib/crew';
import { deleteStoredImage, storeImage } from '@/lib/blob-store';
import { crewNameOf, isJpeg, onMap, signedBy } from '@/lib/myndavel';
import { crewUuids } from '@/lib/stats';

export const dynamic = 'force-dynamic';

/* a photo is at most 700 KB as Framköllun packs it; base64 and the rest stay well under this */
const MAX_BODY = 2 * 1024 * 1024;
const MAX_PHOTO = 1536 * 1024;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const fail = (status: number, error: string, reason?: string) => NextResponse.json(reason ? { error, reason } : { error }, { status });

/** The address of a post on its writer's wall, as the board links to it. */
const postUrl = (name: string, entryId: string) => `/crew/${name}#${entryId}`;

/** A photo from the Myndavél, developed and sent by Framköllun: it is pinned
    to the photographer's wall, and so goes up on the board. Only Framköllun
    can post here: the body is signed with MYNDAVEL_INGEST_SECRET. The same
    photo sent twice is pinned once. */
export async function POST(req: NextRequest) {
  const secret = process.env.MYNDAVEL_INGEST_SECRET?.trim();
  if (!secret) return fail(503, 'Myndavélin er ekki tengd vefnum.');
  if (Number(req.headers.get('content-length') ?? 0) > MAX_BODY) return fail(413, 'Of stór sending.');
  const body = await req.text();
  if (body.length > MAX_BODY) return fail(413, 'Of stór sending.');
  if (!signedBy(secret, req.headers.get('x-myndavel-time'), req.headers.get('x-myndavel-signature'), body)) return fail(401, 'Ógild undirskrift.');

  let raw: { job?: unknown; author?: { uuid?: unknown } | null; caption?: unknown; takenAt?: unknown; spot?: unknown; photo?: unknown };
  try { raw = JSON.parse(body); } catch { return fail(400, 'Ógilt JSON.'); }
  if (!raw || typeof raw !== 'object') return fail(400, 'Ógilt JSON.');

  const job = typeof raw.job === 'string' ? raw.job.toLowerCase() : '';
  const uuid = typeof raw.author?.uuid === 'string' ? raw.author.uuid.toLowerCase() : '';
  if (!UUID.test(job) || !UUID.test(uuid)) return fail(400, 'Myndina vantar auðkenni.');
  const photo = typeof raw.photo === 'string' ? Buffer.from(raw.photo, 'base64') : Buffer.alloc(0);
  if (photo.length > MAX_PHOTO) return fail(413, 'Myndin er of stór.');
  if (!isJpeg(photo)) return fail(400, 'Þetta er ekki JPEG-mynd.');

  let name: string | null | undefined;
  try { name = crewNameOf(uuid, await crewUuids()); } catch { name = undefined; }
  if (name === undefined) return fail(503, 'Ekki tókst að fletta upp ljósmyndaranum; reyndu aftur.');
  if (name === null) return fail(403, 'Ljósmyndarinn er ekki í hópnum.', 'notcrew');

  /* where it was taken, only if the photographer chose to show it and the map shows the spot */
  const s = raw.spot as { dim?: unknown; x?: unknown; y?: unknown; z?: unknown } | null | undefined;
  const at = s && typeof s.dim === 'string' && [s.x, s.y, s.z].every(v => typeof v === 'number' && Number.isFinite(v))
    ? { dim: s.dim, spot: { x: Math.floor(s.x as number), y: Math.floor(s.y as number), z: Math.floor(s.z as number) } satisfies CrewShotSpot }
    : null;
  const spot = at && onMap(at.dim, at.spot) ? at.spot : null;

  const now = new Date().toISOString();
  const taken = typeof raw.takenAt === 'string' ? Date.parse(raw.takenAt) : NaN;
  const takenAt = Number.isFinite(taken) && taken <= Date.now() + 3600_000 ? new Date(taken).toISOString() : null;

  /* a photo already up (an answer that went missing on the way back) is not pinned again */
  const before = (await readProfile(name)).entries.find(e => e.shot?.job === job);
  if (before) return NextResponse.json({ url: postUrl(name, before.id), entryId: before.id }, { status: 200 });

  /* the print is named by the photo's own id, so sending it again stores over the same file */
  let filename: string;
  try {
    filename = await storeImage(crewBlobPath(name, job, 'jpg'), new Blob([new Uint8Array(photo)], { type: 'image/jpeg' }), 'image/jpeg', { overwrite: true });
  } catch (e) {
    console.error('[myndavel] the photo could not be stored:', e instanceof Error ? e.message : e);
    return fail(503, 'Ekki tókst að geyma myndina; reyndu aftur.');
  }

  const entry: CrewEntry = {
    id:        randomUUID(),
    text:      cleanText(raw.caption, LIMITS.text),
    photos:    [{ id: job, filename, caption: '', uploadedAt: now, takenAt }],
    placeId:   null,
    createdAt: now,
    lanterns:  [],
    replies:   [],
    shot:      { job, spot },
  };
  let pinned: CrewEntry = entry;
  try {
    await updateProfile(name, p => {
      /* the change may run again on a newer wall; only the last run's finding counts */
      const there = p.entries.find(e => e.shot?.job === job);
      pinned = there ?? entry;
      if (there) return;
      if (p.entries.length >= LIMITS.entries) throw new Refusal(`Veggurinn er fullur (${LIMITS.entries} færslur).`, 409);
      p.entries.unshift(entry);
    });
  } catch (e) {
    if (e instanceof Refusal) {
      await deleteStoredImage(filename);
      return fail(e.status, e.message, 'full');
    }
    return wallError(e, 'Ekki tókst að festa myndina upp.', 'POST myndavel');
  }
  return NextResponse.json({ url: postUrl(name, pinned.id), entryId: pinned.id }, { status: pinned === entry ? 201 : 200 });
}

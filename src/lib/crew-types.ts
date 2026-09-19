/* The crew's walls: types and pure helpers with no server imports, so the
   wall's client components and the API routes read the same definitions. */

export const CREW_USERNAMES = [
  'stebbias',
  'AmmaGaur',
  'joenana',
  'ingunnbirta',
  'Gamla123',
  'fafnir1994',
  'IMlonely',
  'eikibleiki',
] as const;

export type CrewUsername = typeof CREW_USERNAMES[number];

export function isCrewUsername(name: string | null | undefined): boolean {
  return !!name && CREW_USERNAMES.some(u => u.toLowerCase() === name.toLowerCase());
}

/** The username as it is spelled in the crew list, whatever case it came in. */
export function canonicalUsername(name: string): string {
  return CREW_USERNAMES.find(u => u.toLowerCase() === name.toLowerCase()) ?? name;
}

export const sameUser = (a: string | null | undefined, b: string | null | undefined) =>
  !!a && !!b && a.toLowerCase() === b.toLowerCase();

/* ─── what hangs on a wall ────────────────────────────────────────────────── */

export interface CrewPhoto {
  id:         string;
  /** the URL the picture is shown from: a public blob, /api/blob/… or /screenshots/… */
  filename:   string;
  caption:    string;
  uploadedAt: string;
  /** when the screenshot was taken, read off Minecraft's file name; null when unknown */
  takenAt:    string | null;
}

export interface CrewReply {
  id:        string;
  username:  string;
  text:      string;
  createdAt: string;
}

/** One thing pinned to the wall: a note, a print, or a note with prints. */
export interface CrewEntry {
  id:        string;
  text:      string;
  photos:    CrewPhoto[];
  /** the place on the map this belongs to, if any */
  placeId:   number | null;
  createdAt: string;
  /** who has lit a lantern under it */
  lanterns:  string[];
  replies:   CrewReply[];
}

export interface CrewProfile {
  username:     string;
  bio:          string;
  entries:      CrewEntry[];
  /** the print that stands behind the poster and on the link card */
  coverPhotoId: string | null;
  /** the fastest draw at the campfire, in milliseconds; null until posted */
  bestDrawMs:   number | null;
}

/* Walls written before the wall existed kept notes and pictures apart. */
interface LegacyPost  { id: string; text: string; createdAt: string }
interface LegacyPhoto { id: string; filename: string; caption: string; uploadedAt: string }
interface StoredProfile extends Partial<CrewProfile> {
  posts?:  LegacyPost[];
  photos?: LegacyPhoto[];
}

export const LIMITS = {
  bio:        500,
  text:       1000,
  caption:    200,
  reply:      300,
  photosPer:  12,
  entries:    400,
  replies:    100,
} as const;

const str = (v: unknown, max: number) => (typeof v === 'string' ? v : '').slice(0, max);
const iso = (v: unknown) => (typeof v === 'string' && !Number.isNaN(Date.parse(v)) ? v : new Date().toISOString());

export function normalizePhoto(raw: unknown): CrewPhoto | null {
  const p = raw as Partial<CrewPhoto> | null;
  if (!p || typeof p.id !== 'string' || typeof p.filename !== 'string') return null;
  return {
    id:         p.id,
    filename:   p.filename,
    caption:    str(p.caption, LIMITS.caption),
    uploadedAt: iso(p.uploadedAt),
    takenAt:    typeof p.takenAt === 'string' && !Number.isNaN(Date.parse(p.takenAt)) ? p.takenAt : null,
  };
}

export function normalizeEntry(raw: unknown): CrewEntry | null {
  const e = raw as Partial<CrewEntry> | null;
  if (!e || typeof e.id !== 'string') return null;
  const photos = (Array.isArray(e.photos) ? e.photos : []).map(normalizePhoto).filter((p): p is CrewPhoto => p !== null);
  const text = str(e.text, LIMITS.text);
  if (!text.trim() && photos.length === 0) return null;
  return {
    id:        e.id,
    text,
    photos,
    placeId:   typeof e.placeId === 'number' && Number.isFinite(e.placeId) ? Math.floor(e.placeId) : null,
    createdAt: iso(e.createdAt),
    lanterns:  Array.isArray(e.lanterns) ? Array.from(new Set(e.lanterns.filter((n): n is string => typeof n === 'string'))) : [],
    replies:   (Array.isArray(e.replies) ? e.replies : []).flatMap(r => {
      const x = r as Partial<CrewReply> | null;
      if (!x || typeof x.id !== 'string' || typeof x.username !== 'string') return [];
      const t = str(x.text, LIMITS.reply);
      return t.trim() ? [{ id: x.id, username: x.username, text: t, createdAt: iso(x.createdAt) }] : [];
    }),
  };
}

const byNewest = (a: { createdAt: string }, b: { createdAt: string }) => Date.parse(b.createdAt) - Date.parse(a.createdAt);

/** Read whatever is stored into today's shape: notes and pictures pinned
    before the wall existed become entries of their own, newest first. */
export function normalizeProfile(raw: unknown, username: string): CrewProfile {
  const s = (raw && typeof raw === 'object' ? raw : {}) as StoredProfile;
  const entries = (Array.isArray(s.entries) ? s.entries : []).map(normalizeEntry).filter((e): e is CrewEntry => e !== null);
  const seen = new Set(entries.map(e => e.id));

  for (const post of Array.isArray(s.posts) ? s.posts : []) {
    if (!post || typeof post.id !== 'string' || seen.has(post.id)) continue;
    const e = normalizeEntry({ id: post.id, text: post.text, photos: [], placeId: null, createdAt: post.createdAt });
    if (e) { entries.push(e); seen.add(e.id); }
  }
  for (const photo of Array.isArray(s.photos) ? s.photos : []) {
    if (!photo || typeof photo.id !== 'string' || seen.has(photo.id)) continue;
    const e = normalizeEntry({ id: photo.id, text: '', photos: [{ ...photo, takenAt: null }], placeId: null, createdAt: photo.uploadedAt });
    if (e) { entries.push(e); seen.add(e.id); }
  }
  entries.sort(byNewest);

  const photoIds = new Set(entries.flatMap(e => e.photos.map(p => p.id)));
  const cover = typeof s.coverPhotoId === 'string' && photoIds.has(s.coverPhotoId) ? s.coverPhotoId : null;
  const best  = typeof s.bestDrawMs === 'number' && Number.isFinite(s.bestDrawMs) && s.bestDrawMs > 0 ? Math.round(s.bestDrawMs) : null;

  return {
    username:     typeof s.username === 'string' && s.username ? s.username : username,
    bio:          str(s.bio, LIMITS.bio),
    entries:      entries.slice(0, LIMITS.entries),
    coverPhotoId: cover,
    bestDrawMs:   best,
  };
}

/** Every print on the wall, newest first. */
export function allPhotos(profile: CrewProfile): Array<CrewPhoto & { entryId: string }> {
  return profile.entries.flatMap(e => e.photos.map(p => ({ ...p, entryId: e.id })));
}

export function coverPhoto(profile: CrewProfile): CrewPhoto | null {
  const all = allPhotos(profile);
  return (profile.coverPhotoId ? all.find(p => p.id === profile.coverPhotoId) : null) ?? all[0] ?? null;
}

/** A bio or a note is stored as the text that was typed. Rendering escapes
    it; stored entities would be escaped a second time and shown as code. */
export function cleanText(text: unknown, max: number): string {
  return (typeof text === 'string' ? text : '').replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, max);
}

/* ─── Minecraft's screenshot names ───────────────────────────────────────── */

/** `2026-09-10_20.15.33.png` is how the game names a screenshot, in the
    player's local time. Read the moment off the name; null if it is not one. */
export function takenAtFromFilename(name: string): Date | null {
  const m = /(?:^|[^\d])(\d{4})-(\d{2})-(\d{2})_(\d{2})\.(\d{2})\.(\d{2})(?:[^\d]|$)/.exec(name);
  if (!m) return null;
  const [, y, mo, d, h, mi, s] = m.map(Number);
  const date = new Date(y, mo - 1, d, h, mi, s);
  if (Number.isNaN(date.getTime()) || date.getMonth() !== mo - 1 || date.getDate() !== d) return null;
  if (date.getTime() > Date.now() + 24 * 3600_000) return null;
  return date;
}

/** The blob path a member's print is uploaded to, and the check the server runs on it. */
export const crewBlobPath = (username: string, id: string, ext: string) => `crew/${username.toLowerCase()}/${id}.${ext}`;
export const CREW_PATH = /^crew\/([a-z0-9_]+)\/([0-9a-f-]{36})\.(png|jpe?g|webp|gif|avif)$/;

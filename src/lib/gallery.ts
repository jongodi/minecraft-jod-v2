import { localizeContent } from './icelandic';
import { promises as fs } from 'fs';
import path from 'path';

export interface GalleryPhoto {
  id:        string;
  filename:  string;
  title:     string;
  sublabel:  string;
  gradient:  string;
  active:    boolean;
  order:     number;
}

const KV_KEY = 'gallery:photos';

function hasKV(): boolean {
  return !!process.env.REDIS_URL;
}

export { hasBlob } from './blob-store';

function galleryPath(): string {
  if (process.env.VERCEL && !hasKV()) return '/tmp/jod-gallery.json';
  return path.join(process.cwd(), 'src', 'data', 'gallery.json');
}

// Load the on-disk gallery.json as the initial seed for KV
async function readFromDisk(): Promise<GalleryPhoto[]> {
  try {
    const raw = await fs.readFile(galleryPath(), 'utf-8');
    return JSON.parse(raw) as GalleryPhoto[];
  } catch {
    // Try the committed gallery.json as seed (read-only on Vercel is fine for reads)
    try {
      const seed = path.join(process.cwd(), 'src', 'data', 'gallery.json');
      const raw  = await fs.readFile(seed, 'utf-8');
      return JSON.parse(raw) as GalleryPhoto[];
    } catch {
      return [];
    }
  }
}

async function readStoredGallery(): Promise<GalleryPhoto[]> {
  if (!hasKV()) return readFromDisk();
  /* With Redis configured it is the only source of truth. Falling back to the
     bundled gallery.json on a read error would quietly serve the original
     order and hide the failure, so a failed read is raised instead. */
  const { rGet, rSet } = await import('./redis');
  const data = await rGet<GalleryPhoto[]>(KV_KEY);
  if (data) return data;
  // Genuinely empty: seed from the committed gallery.json, once.
  const seed = await readFromDisk();
  if (seed.length > 0) await rSet(KV_KEY, seed);
  return seed;
}

export async function writeGallery(photos: GalleryPhoto[]): Promise<void> {
  if (hasKV()) {
    try {
      const { rSet } = await import('./redis');
      await rSet(KV_KEY, photos);
      return;
    } catch (e) {
      console.error('Redis writeGallery error:', e);
      throw new Error('Ekki tókst að vista myndasafnið vegna villu í geymslu');
    }
  }
  const p = galleryPath();
  await fs.mkdir(path.dirname(p), { recursive: true });
  await fs.writeFile(p, JSON.stringify(photos, null, 2) + '\n', 'utf-8');
}

export async function readGallery(): Promise<GalleryPhoto[]> {
  return (await readStoredGallery()).map(photo => ({
    ...photo, title: localizeContent(photo.title), sublabel: localizeContent(photo.sublabel),
  }));
}

/** The gallery exactly as it is stored, with titles unlocalised. Anything that
    writes the gallery back should start here: readGallery() runs titles and
    sublabels through localizeContent(), and saving those would persist the
    rendered text over the text that was typed. */
export async function readGalleryRaw(): Promise<GalleryPhoto[]> {
  return readStoredGallery();
}

/** Append a stored image to the gallery as a visible photo at the end of the order. */
export async function addGalleryPhoto(input: { id: string; fileUrl: string; title: string; sublabel: string }): Promise<GalleryPhoto> {
  const gallery  = await readStoredGallery();
  const maxOrder = gallery.reduce((m, p) => Math.max(m, p.order), 0);
  const photo: GalleryPhoto = {
    id:       input.id,
    filename: input.fileUrl,
    title:    input.title.trim().slice(0, 100) || 'Ný mynd úr leiknum',
    sublabel: input.sublabel.trim().slice(0, 100),
    gradient: 'linear-gradient(160deg, #1a1a1a 0%, #2a2a2a 100%)',
    active:   true,
    order:    maxOrder + 1,
  };
  gallery.push(photo);
  await writeGallery(gallery);
  return photo;
}

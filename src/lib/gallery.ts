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
  return !!process.env.KV_REST_API_URL;
}

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

export async function readGallery(): Promise<GalleryPhoto[]> {
  if (hasKV()) {
    try {
      const { kv } = await import('@vercel/kv');
      const data = await kv.get<GalleryPhoto[]>(KV_KEY);
      if (data) return data;
      // First run: seed KV from the committed gallery.json
      const seed = await readFromDisk();
      if (seed.length > 0) await kv.set(KV_KEY, seed);
      return seed;
    } catch {
      return readFromDisk();
    }
  }
  return readFromDisk();
}

export async function writeGallery(photos: GalleryPhoto[]): Promise<void> {
  if (hasKV()) {
    try {
      const { kv } = await import('@vercel/kv');
      await kv.set(KV_KEY, photos);
      return;
    } catch (e) {
      console.error('KV writeGallery error:', e);
      throw new Error('Storage error: failed to save gallery');
    }
  }
  const p = galleryPath();
  await fs.mkdir(path.dirname(p), { recursive: true });
  await fs.writeFile(p, JSON.stringify(photos, null, 2) + '\n', 'utf-8');
}

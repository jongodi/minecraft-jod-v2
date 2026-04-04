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

const GALLERY_PATH = path.join(process.cwd(), 'src', 'data', 'gallery.json');

export async function readGallery(): Promise<GalleryPhoto[]> {
  const raw = await fs.readFile(GALLERY_PATH, 'utf-8');
  return JSON.parse(raw) as GalleryPhoto[];
}

export async function writeGallery(photos: GalleryPhoto[]): Promise<void> {
  await fs.writeFile(GALLERY_PATH, JSON.stringify(photos, null, 2) + '\n', 'utf-8');
}

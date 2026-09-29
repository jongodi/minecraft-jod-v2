// A place as it is shared: /stadur/<id> opens the home page with the place's
// postcard, and carries the place's own link preview (title, description and
// the card drawn by src/app/stadur/[id]/opengraph-image.tsx). Server only.
import { readMap } from '@/lib/map';
import { readGallery, type GalleryPhoto } from '@/lib/gallery';
import type { MapLocation } from '@/lib/map-types';
import { handCase, titleCase } from '@/components/badlands/data';

export interface SharedPlace {
  place: MapLocation;
  /** the place's photo, when it has one that is shown in the album */
  photo: GalleryPhoto | null;
  title: string;
  /** the subtitle and who built it, in one line */
  description: string;
}

/** The place a /stadur/<id> link names, or null if there is none. */
export async function sharedPlace(idText: string): Promise<SharedPlace | null> {
  if (!/^\d{1,6}$/.test(idText)) return null;
  const id = Number(idText);
  const config = await readMap();
  const place = config.locations.find(l => l.id === id);
  if (!place) return null;

  let photo: GalleryPhoto | null = null;
  if (place.photoId) {
    try { photo = (await readGallery()).find(p => p.id === place.photoId && p.active) ?? null; }
    catch { /* no photo on the card then */ }
  }

  const sub = handCase(place.sublabel).replace(/\s*·\s*/g, ', ').trim();
  const built = place.builders?.length ? `byggt af ${place.builders.join(', ')}` : '';
  const title = titleCase(place.label.trim() || 'Staður');
  const description = [sub, built].filter(Boolean).join(' · ') || 'Staður í Minecraft-heimi JOÐ';
  return { place, photo, title, description };
}

/* Swapping a bundled screenshot between the formats that ship beside each
   other in /public/screenshots.

   The gallery the site renders comes from KV once REDIS_URL is set, and KV is
   seeded from the committed gallery.json exactly once. The seed happened while
   that file still named the .png originals, so the stored records kept naming
   them long after the repository moved to .webp. Nothing reconciles the two,
   which is why the originals cannot simply be deleted: this is the migration
   that makes them safe to delete, run from the admin panel so the change is
   visible before it happens and can be put back afterwards. */

import { promises as fs } from 'fs';
import path from 'path';
import type { GalleryPhoto } from './gallery';

export type Ext = 'png' | 'webp';

/** No directories and no dots beyond the extension: only the bundled screenshots. */
const BUNDLED = /^\/screenshots\/([A-Za-z0-9_-]+)\.(png|webp)$/;

export interface SwapItem {
  id:      string;
  title:   string;
  from:    string;
  to:      string;
  /** Whether the file being moved to was found. Only these are ever written. */
  ready:   boolean;
  reason?: string;
}

function parse(filename: string): { name: string; ext: Ext } | null {
  const m = BUNDLED.exec(filename);
  return m ? { name: m[1], ext: m[2] as Ext } : null;
}

async function onDisk(name: string, ext: Ext): Promise<boolean> {
  try {
    await fs.access(path.join(process.cwd(), 'public', 'screenshots', `${name}.${ext}`));
    return true;
  } catch {
    return false;
  }
}

/** public/ is served from the CDN on Vercel and need not be in the function's
    own filesystem, so a miss on disk is asked of the site itself before it
    counts as a miss. */
async function overHttp(url: string, origin: string): Promise<boolean> {
  try {
    const res = await fetch(new URL(url, origin), { method: 'HEAD', cache: 'no-store' });
    return res.ok;
  } catch {
    return false;
  }
}

/** What swapping every bundled `from` photo to `to` would do, photo by photo. */
export async function planSwap(gallery: GalleryPhoto[], from: Ext, to: Ext, origin: string): Promise<SwapItem[]> {
  const candidates = gallery
    .map(photo => ({ photo, parsed: parse(photo.filename) }))
    .filter((c): c is { photo: GalleryPhoto; parsed: { name: string; ext: Ext } } => c.parsed !== null && c.parsed.ext === from);

  return Promise.all(candidates.map(async ({ photo, parsed }) => {
    const target = `/screenshots/${parsed.name}.${to}`;
    const found  = (await onDisk(parsed.name, to)) || (await overHttp(target, origin));
    return {
      id: photo.id,
      title: photo.title,
      from: photo.filename,
      to: target,
      ready: found,
      ...(found ? {} : { reason: `Fann ekki ${parsed.name}.${to} við hliðina á upprunalegu myndinni.` }),
    };
  }));
}

/** The gallery with every ready swap applied. Photos not in the plan are untouched. */
export function applySwap(gallery: GalleryPhoto[], plan: SwapItem[]): GalleryPhoto[] {
  const moves = new Map(plan.filter(i => i.ready).map(i => [i.id, i.to]));
  return gallery.map(photo => {
    const to = moves.get(photo.id);
    return to && parse(photo.filename) ? { ...photo, filename: to } : photo;
  });
}

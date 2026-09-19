// What a member's link card is drawn from. Server only: reads the store,
// the public folder and the skin service, and hands back data URLs that
// the image renderer can draw without a network of its own.
import { promises as fs } from 'fs';
import path from 'path';
import { BLOB_PROXY_PREFIX, hasBlob, isBlobHost } from '@/lib/blob-store';
import { bodyUrl } from '@/components/badlands/data';

const TIMEOUT_MS = 4000;

function dataUrl(bytes: ArrayBuffer | Uint8Array, type: string): string {
  return `data:${type};base64,${Buffer.from(new Uint8Array(bytes)).toString('base64')}`;
}

async function fetchBytes(url: string): Promise<{ bytes: ArrayBuffer; type: string } | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS), cache: 'no-store' });
    if (!res.ok) return null;
    return { bytes: await res.arrayBuffer(), type: res.headers.get('content-type') ?? 'image/png' };
  } catch {
    return null;
  }
}

/** The whole skin, front on, or null if the skin service is unreachable. */
export async function skinDataUrl(username: string): Promise<string | null> {
  const got = await fetchBytes(bodyUrl(username, 128));
  return got ? dataUrl(got.bytes, got.type) : null;
}

const TYPE_BY_EXT: Record<string, string> = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif', avif: 'image/avif' };
const CARD_WIDTH = 1200;

/** The bytes of a print wherever storeImage() put it, or null. */
async function printBytes(filename: string): Promise<{ bytes: Uint8Array; type: string } | null> {
  if (isBlobHost(filename)) {
    const got = await fetchBytes(filename);
    return got ? { bytes: new Uint8Array(got.bytes), type: got.type } : null;
  }
  if (filename.startsWith(BLOB_PROXY_PREFIX)) {
    if (!hasBlob()) return null;
    const { get } = await import('@vercel/blob');
    const pathname = decodeURIComponent(filename.slice(BLOB_PROXY_PREFIX.length));
    const result = await get(pathname, { access: 'private' });
    if (!result || result.statusCode !== 200) return null;
    return { bytes: new Uint8Array(await new Response(result.stream).arrayBuffer()), type: result.blob.contentType || 'image/png' };
  }
  if (filename.startsWith('/screenshots/')) {
    const file = path.join(process.cwd(), 'public', 'screenshots', path.basename(filename));
    const ext = file.split('.').pop()?.toLowerCase() ?? 'png';
    return { bytes: new Uint8Array(await fs.readFile(file)), type: TYPE_BY_EXT[ext] ?? 'image/png' };
  }
  return null;
}

/** A print as a data URL the card can draw, or null. Prints are stored as
    WebP, which the card renderer cannot read, so the backdrop is re-encoded
    as a JPEG at the card's width by sharp (which Next brings along). */
export async function printDataUrl(filename: string): Promise<string | null> {
  try {
    const got = await printBytes(filename);
    if (!got) return null;
    try {
      const sharp = (await import('sharp')).default;
      const jpeg = await sharp(got.bytes).resize({ width: CARD_WIDTH, withoutEnlargement: true }).jpeg({ quality: 78 }).toBuffer();
      return dataUrl(jpeg, 'image/jpeg');
    } catch {
      /* no sharp here: only formats the renderer reads itself */
      return got.type === 'image/png' || got.type === 'image/jpeg' ? dataUrl(got.bytes, got.type) : null;
    }
  } catch { /* no backdrop then */ }
  return null;
}

/** The member's play time from the last stats snapshot, in hours, or null. */
export async function playTimeHours(username: string): Promise<number | null> {
  if (!process.env.REDIS_URL) return null;
  try {
    const { rGet } = await import('@/lib/redis');
    const snap = await rGet<{ players: Array<{ username: string; playTimeHours: number }> }>('stats:snapshot');
    const row = snap?.players.find(p => p.username.toLowerCase() === username.toLowerCase());
    return row && row.playTimeHours > 0 ? row.playTimeHours : null;
  } catch {
    return null;
  }
}

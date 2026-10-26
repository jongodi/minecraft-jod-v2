// The Myndavél's photos as the site takes them in: Framköllun on the NAS
// develops a photo taken in the game and posts it to /api/myndavel, signed
// with MYNDAVEL_INGEST_SECRET. Server only.
import { createHash, createHmac, timingSafeEqual } from 'crypto';
import { mainCopy } from '@/lib/bluemap-snapshot';
import { CREW_USERNAMES, canonicalUsername, isCrewUsername, type CrewShotSpot } from '@/lib/crew-types';

/** How far Framköllun's clock may be from ours, in seconds. */
export const CLOCK_SKEW_S = 300;

/** True when `signature` is `sha256=<hex>` of HMAC-SHA256(secret, "<time>.<body>")
    and `time` (seconds since the epoch) is within CLOCK_SKEW_S of now. */
export function signedBy(secret: string, time: string | null, signature: string | null, body: string, now = Date.now()): boolean {
  if (!time || !signature || !/^\d{1,12}$/.test(time)) return false;
  if (Math.abs(now / 1000 - Number(time)) > CLOCK_SKEW_S) return false;
  const want = Buffer.from(`sha256=${createHmac('sha256', secret).update(`${time}.${body}`).digest('hex')}`);
  const got = Buffer.from(signature);
  return want.length === got.length && timingSafeEqual(want, got);
}

/** The UUID an offline-mode server gives a name: what the bots on the smoke server get. */
export function offlineUuid(name: string): string {
  const b = createHash('md5').update(`OfflinePlayer:${name}`).digest();
  b[6] = (b[6] & 0x0f) | 0x30;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = b.toString('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/* The smoke server's bots play in offline mode, so their UUIDs are not
   Mojang's. MYNDAVEL_OFFLINE_UUIDS=1 takes those too, never in production. */
const offlineAllowed = () => process.env.MYNDAVEL_OFFLINE_UUIDS === '1' && process.env.VERCEL_ENV !== 'production';

/** The crew member a photographer's UUID belongs to; null when it is nobody's
    in the crew, undefined when that cannot be told (Mojang did not answer for
    everyone), so the photo is tried again later rather than turned away. */
export function crewNameOf(uuid: string, mojang: Record<string, string>): string | null | undefined {
  const name = mojang[uuid];
  if (name && isCrewUsername(name)) return canonicalUsername(name);
  if (offlineAllowed()) {
    const own = CREW_USERNAMES.find(n => offlineUuid(n) === uuid);
    if (own) return own;
  }
  return Object.keys(mojang).length >= CREW_USERNAMES.length ? null : undefined;
}

/* The main map's hires tiles are 32 blocks square, their grid set off by 2
   (scripts/bluemap-brand.mjs), filed under their coordinates digit by digit:
   tile x -201 is x-2/0/1. */
const TILE = 32;
const TRANSLATE = 2;
const digits = (n: number) => (n < 0 ? '-' : '') + String(Math.abs(n)).split('').join('/');

/** Whether the map shows this spot in full detail: an overworld spot whose
    hires tile is in the copy of the map the site serves. */
export function onMap(dim: string, spot: CrewShotSpot): boolean {
  if (dim !== 'minecraft:overworld' || !mainCopy.hasFiles) return false;
  const tile = `maps/world/tiles/0/x${digits(Math.floor((spot.x - TRANSLATE) / TILE))}/z${digits(Math.floor((spot.z - TRANSLATE) / TILE))}.prbm`;
  return mainCopy.has(`${tile}.gz`) || mainCopy.has(tile);
}

/** A JPEG, by its first bytes. */
export const isJpeg = (b: Buffer) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;

import { localizeContent } from './icelandic';
import { readGallery } from './gallery';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import {
  DEFAULT_LOCATIONS,
  DEFAULT_ZONES,
  DEFAULT_PATHS,
  type MapConfig,
  type MapLocation,
  type MapZone,
  type MapPath,
} from '@/lib/map-types';
import { normalizeTerrain } from './terrain';

export type { MapConfig, MapLocation, MapZone, MapPath };
export { DEFAULT_LOCATIONS, DEFAULT_ZONES, DEFAULT_PATHS };

const KV_KEY = 'map:config';

const DEFAULT_CONFIG: MapConfig = { locations: DEFAULT_LOCATIONS, zones: DEFAULT_ZONES, paths: DEFAULT_PATHS };

const LOCATION_TYPES = new Set<MapLocation['type']>(['surface', 'underground', 'island', 'aerial']);
const ZONE_KINDS     = new Set<MapZone['kind']>(['zone', 'land', 'lake', 'mountain']);
const ZONE_COLORS    = new Set<MapZone['colorKey']>(['purple', 'blue', 'orange', 'green']);
const PATH_KINDS     = new Set<MapPath['kind']>(['river', 'road', 'border']);

const MAX_LABEL = 100;

/** Read the full map config (Redis override → filesystem → hardcoded defaults). */
async function readStoredMap(): Promise<MapConfig> {
  // 1. Try Redis
  if (process.env.REDIS_URL) {
    try {
      const { rGet } = await import('@/lib/redis');
      const cfg = await rGet<MapConfig>(KV_KEY);
      if (cfg) return cfg;
    } catch { /* fall through */ }
  }

  // 2. Try filesystem (dev / no Redis)
  try {
    const p = join(process.cwd(), 'data', 'map.json');
    return JSON.parse(readFileSync(p, 'utf8')) as MapConfig;
  } catch { /* fall through */ }

  // 3. Hardcoded defaults
  return DEFAULT_CONFIG;
}

/** Persist the full map config (Redis → filesystem fallback). */
export async function writeMap(cfg: MapConfig): Promise<void> {
  if (process.env.REDIS_URL) {
    try {
      const { rSet } = await import('@/lib/redis');
      await rSet(KV_KEY, cfg);
      return;
    } catch (e) {
      console.error('Redis writeMap error:', e);
      throw new Error('Ekki tókst að vista kortið vegna villu í geymslu');
    }
  }

  // Filesystem fallback
  const dir = join(process.cwd(), 'data');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'map.json'), JSON.stringify(cfg, null, 2), 'utf8');
}

/**
 * Work out which gallery photo a location points at.
 * Configs saved before photo linking existed carry no `photoId`; those pins
 * used to be matched to the photo with the same numeric id, so keep that
 * behaviour for them. Links to photos that no longer exist become `null`.
 */
function resolvePhotoId(location: MapLocation, photoIds: Set<string>): string | null {
  const wanted = location.photoId === undefined ? String(location.id) : location.photoId;
  return wanted !== null && photoIds.has(wanted) ? wanted : null;
}

/** Read the map for display: localized labels and resolved photo links. */
export async function readMap(): Promise<MapConfig> {
  const config = await readStoredMap();
  let photoIds = new Set<string>();
  try {
    photoIds = new Set((await readGallery()).map(p => p.id));
  } catch { /* no gallery available: every link resolves to null */ }

  return {
    ...config,
    locations: config.locations.map(location => ({
      ...location,
      label:    localizeContent(location.label),
      sublabel: localizeContent(location.sublabel),
      photoId:  resolvePhotoId(location, photoIds),
    })),
    zones: config.zones.map(zone => ({ ...zone, label: localizeContent(zone.label) })),
    paths: config.paths?.map(path => ({ ...path, label: localizeContent(path.label) })),
  };
}

// ─── Photo ↔ location links ───────────────────────────────────────────────────

/**
 * Point `locationId` at `photoId` (or unlink the photo everywhere when
 * `locationId` is null). A photo belongs to at most one pin, so any other pin
 * that used this photo is cleared. Returns the id of the pin now holding the
 * photo, or null.
 */
export async function linkPhotoToLocation(photoId: string, locationId: number | null): Promise<number | null> {
  const config = await readMap();
  let target: number | null = null;
  const locations = config.locations.map(l => {
    if (locationId !== null && l.id === locationId) { target = l.id; return { ...l, photoId }; }
    if (l.photoId === photoId) return { ...l, photoId: null };
    return l;
  });
  await writeMap({ ...config, locations });
  return target;
}

/** Remove every reference to a photo, e.g. after it was deleted. */
export async function unlinkPhoto(photoId: string): Promise<void> {
  const config = await readMap();
  if (!config.locations.some(l => l.photoId === photoId)) return;
  await writeMap({
    ...config,
    locations: config.locations.map(l => l.photoId === photoId ? { ...l, photoId: null } : l),
  });
}

/** Find the pin that shows this photo, if any. */
export function locationForPhoto(config: MapConfig, photoId: string): MapLocation | null {
  return config.locations.find(l => l.photoId === photoId) ?? null;
}

// ─── Validation for the admin editor ─────────────────────────────────────────

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const str   = (v: unknown, max = MAX_LABEL): string => (typeof v === 'string' ? v : '').trim().slice(0, max);

/** Check and clean a map config sent by the admin editor. Returns an error message or the clean config. */
export function sanitizeMapConfig(body: unknown): { error: string } | { config: MapConfig } {
  const b = body as Partial<MapConfig> | null;
  if (!b || !Array.isArray(b.locations) || !Array.isArray(b.zones)) {
    return { error: 'Lista yfir staði og svæði vantar.' };
  }
  if (b.paths !== undefined && !Array.isArray(b.paths)) {
    return { error: 'Listi yfir línur er ógildur.' };
  }

  const locations: MapLocation[] = [];
  const seenIds = new Set<number>();
  for (const raw of b.locations as unknown[]) {
    const l = raw as Partial<MapLocation> | null;
    if (!l || !isNum(l.id) || !isNum(l.x) || !isNum(l.y)) return { error: 'Pinni með ógild gildi.' };
    if (seenIds.has(l.id)) return { error: `Pinni #${l.id} kemur oftar en einu sinni fyrir.` };
    seenIds.add(l.id);
    const type = LOCATION_TYPES.has(l.type as MapLocation['type']) ? (l.type as MapLocation['type']) : 'surface';
    const photoId = typeof l.photoId === 'string' && l.photoId.trim() ? l.photoId.trim().slice(0, 100) : null;
    locations.push({
      id: Math.floor(l.id), label: str(l.label), sublabel: str(l.sublabel),
      x: Math.round(l.x), y: Math.round(l.y), type, photoId,
    });
  }

  const zones: MapZone[] = [];
  for (const raw of b.zones as unknown[]) {
    const z = raw as Partial<MapZone> | null;
    if (!z || typeof z.id !== 'string' || !isNum(z.cx) || !isNum(z.cy) || !isNum(z.rx) || !isNum(z.ry)) {
      return { error: 'Svæði með ógild gildi.' };
    }
    zones.push({
      id: z.id.slice(0, 100), label: str(z.label),
      kind:     ZONE_KINDS.has(z.kind as MapZone['kind']) ? (z.kind as MapZone['kind']) : 'zone',
      cx: Math.round(z.cx), cy: Math.round(z.cy), rx: Math.max(1, Math.round(z.rx)), ry: Math.max(1, Math.round(z.ry)),
      colorKey: ZONE_COLORS.has(z.colorKey as MapZone['colorKey']) ? (z.colorKey as MapZone['colorKey']) : 'purple',
    });
  }

  const paths: MapPath[] = [];
  for (const raw of (b.paths ?? []) as unknown[]) {
    const p = raw as Partial<MapPath> | null;
    if (!p || typeof p.id !== 'string' || !Array.isArray(p.points)) return { error: 'Lína með ógild gildi.' };
    const points: [number, number][] = [];
    for (const pt of p.points as unknown[]) {
      if (!Array.isArray(pt) || !isNum(pt[0]) || !isNum(pt[1])) return { error: 'Lína með ógildan punkt.' };
      points.push([Math.round(pt[0]), Math.round(pt[1])]);
    }
    paths.push({
      id: p.id.slice(0, 100), label: str(p.label), points,
      kind:     PATH_KINDS.has(p.kind as MapPath['kind']) ? (p.kind as MapPath['kind']) : 'river',
      colorKey: ZONE_COLORS.has(p.colorKey as MapPath['colorKey']) ? (p.colorKey as MapPath['colorKey']) : 'blue',
    });
  }

  const terrain = Array.isArray(b.terrain) ? normalizeTerrain(b.terrain as string[]) : undefined;

  return { config: { locations, zones, paths, ...(terrain ? { terrain } : {}) } };
}

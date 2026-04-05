import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import {
  DEFAULT_LOCATIONS,
  DEFAULT_ZONES,
  type MapConfig,
  type MapLocation,
  type MapZone,
} from '@/lib/map-types';

export type { MapConfig, MapLocation, MapZone };
export { DEFAULT_LOCATIONS, DEFAULT_ZONES };

const KV_KEY = 'map:config';

const DEFAULT_CONFIG: MapConfig = { locations: DEFAULT_LOCATIONS, zones: DEFAULT_ZONES };

/** Read the full map config (Redis override → filesystem → hardcoded defaults). */
export async function readMap(): Promise<MapConfig> {
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
    } catch { /* fall through */ }
  }

  // Filesystem fallback
  const dir = join(process.cwd(), 'data');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'map.json'), JSON.stringify(cfg, null, 2), 'utf8');
}

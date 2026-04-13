// Custom datapacks — user-added packs stored in Redis.
// IDs start at 1000 to avoid clashing with the static DATAPACKS (IDs 1-14).
import { DATAPACKS, type DatapackMeta } from '@/data/datapacks';

const KV_KEY = 'datapacks:custom';

export async function getCustomPacks(): Promise<DatapackMeta[]> {
  if (!process.env.REDIS_URL) return [];
  try {
    const { rGet } = await import('@/lib/redis');
    return (await rGet<DatapackMeta[]>(KV_KEY)) ?? [];
  } catch { return []; }
}

/** Static built-in packs + any custom packs saved in Redis. */
export async function getAllPacks(): Promise<DatapackMeta[]> {
  return [...DATAPACKS, ...await getCustomPacks()];
}

export async function addCustomPack(data: Omit<DatapackMeta, 'id'>): Promise<DatapackMeta> {
  if (!process.env.REDIS_URL) throw new Error('Redis not available');
  const existing = await getCustomPacks();
  const nextId   = existing.reduce((max, p) => Math.max(max, p.id), 999) + 1;
  const pack: DatapackMeta = { id: nextId, ...data };
  const { rSet } = await import('@/lib/redis');
  await rSet(KV_KEY, [...existing, pack]);
  return pack;
}

export async function deleteCustomPack(id: number): Promise<void> {
  if (!process.env.REDIS_URL) return;
  const existing = await getCustomPacks();
  const { rSet } = await import('@/lib/redis');
  await rSet(KV_KEY, existing.filter(p => p.id !== id));
}

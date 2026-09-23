import Redis from 'ioredis';

// Reuse connection across warm invocations in the same serverless container
let client: Redis | null = null;

export function getRedis(): Redis {
  if (!client) {
    client = new Redis(process.env.REDIS_URL!, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: false,
      lazyConnect: false,
    });
    client.on('error', (err) => {
      console.error('Redis connection error:', err);
    });
  }
  return client;
}

export async function rGet<T>(key: string): Promise<T | null> {
  const raw = await getRedis().get(key);
  if (!raw) return null;
  try { return JSON.parse(raw) as T; } catch { return null; }
}

export async function rSet(key: string, value: unknown): Promise<void> {
  await getRedis().set(key, JSON.stringify(value));
}

/** For a read that is about to be changed and written back: "no key" is null,
    but a storage error or a value that does not parse throws, so the caller
    never mistakes a failed read for an empty record and writes that over it. */
export async function rGetStrict<T>(key: string): Promise<T | null> {
  const raw = await getRedis().get(key);
  if (raw === null) return null;
  return JSON.parse(raw) as T;
}

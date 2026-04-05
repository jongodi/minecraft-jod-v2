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

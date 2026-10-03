// Which look each letter wears, as chosen in the admin panel (Póstur). Server
// only. Kept in Redis as one hash; without Redis (development) in memory.
// A letter nobody has chosen for wears its default (DEFAULT_THEMES).
import { MAIL_KINDS, type MailKind } from '@/lib/email-copy';
import { DEFAULT_THEMES, isTheme, type Theme } from '@/lib/email-design';

const KEY = 'email:themes';
const g = globalThis as typeof globalThis & { __jodMailThemes?: Map<string, string> };
const mem = (g.__jodMailThemes ??= new Map());

export async function readThemes(): Promise<Record<MailKind, Theme>> {
  let stored: Record<string, string> = {};
  if (process.env.REDIS_URL) {
    try {
      const { getRedis } = await import('./redis');
      stored = await getRedis().hgetall(KEY);
    } catch (e) {
      /* a letter in its default dress beats no letter */
      console.error('[email-settings] could not read the chosen looks:', e instanceof Error ? e.message : e);
    }
  } else {
    stored = Object.fromEntries(mem);
  }
  return Object.fromEntries(MAIL_KINDS.map(k => [k, isTheme(stored[k]) ? stored[k] : DEFAULT_THEMES[k]])) as Record<MailKind, Theme>;
}

export async function setTheme(kind: MailKind, theme: Theme): Promise<void> {
  if (process.env.REDIS_URL) {
    const { getRedis } = await import('./redis');
    await getRedis().hset(KEY, kind, theme);
    return;
  }
  mem.set(kind, theme);
}

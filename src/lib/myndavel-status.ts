// How Framköllun on the NAS is doing, as it last said: it posts its health to
// /api/myndavel/status every few minutes, signed like a photo, and the admin
// panel reads it here. Server only.
import { getExarotonServerId } from '@/lib/exaroton';

const KEY = 'myndavel:status';
const hasKV = () => !!process.env.REDIS_URL;

/** Heard from within this long, Framköllun is taken to be running. */
export const STATUS_FRESH_MS = 12 * 60_000;

/** stuck: a photo has been developing too long; blind: the server's queue cannot be read; waiting: a photo has waited hours for the site */
export const TROUBLES = ['stuck', 'blind', 'waiting'] as const;
export type TroubleCode = typeof TROUBLES[number];

export interface FramkollunStatus {
  /** when the site took this in, by the site's own clock */
  at: string;
  ok: boolean;
  /** what is wrong, in Framköllun's words, when something is */
  trouble: string | null;
  /** which of the troubles it knows this is, for the panel to say in its own words */
  troubleCode: TroubleCode | null;
  /** the photo being developed now */
  developing: string | null;
  /** photos it has seen on the server and not developed yet */
  queued: number;
  /** developed photos waiting for the site or for the photographer to be told */
  outbox: number;
  /** photos kept aside: turned away by the site, or would not develop */
  failed: number;
  /** files left on the server for a wrong signature */
  skipped: number;
  /** whether it hears the server's console */
  console: boolean;
  /** how long the oldest photo has waited for the site, in minutes */
  oldestWaitingMin: number;
  lastDevelopMs: number | null;
  lastError: { at: string; what: string } | null;
}

const count = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.min(Math.floor(v), 1_000_000) : 0);
const words = (v: unknown, max: number) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);
const when = (v: unknown) => (typeof v === 'string' && Number.isFinite(Date.parse(v)) ? new Date(Date.parse(v)).toISOString() : null);

/** What Framköllun sent, in the shape kept: anything it did not say is nothing. */
export function normalizeStatus(raw: unknown, now = Date.now()): FramkollunStatus {
  const h = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const e = (h.lastError && typeof h.lastError === 'object' ? h.lastError : {}) as Record<string, unknown>;
  const what = words(e.what, 300), at = when(e.at);
  return {
    at: new Date(now).toISOString(),
    ok: h.ok === true,
    trouble: words(h.trouble, 200),
    troubleCode: TROUBLES.find(t => t === h.troubleCode) ?? null,
    developing: words(h.developing, 64),
    queued: count(h.queued), outbox: count(h.outbox), failed: count(h.failed), skipped: count(h.skipped),
    console: h.console === true,
    oldestWaitingMin: count(h.oldestWaitingMin),
    lastDevelopMs: typeof h.lastDevelopMs === 'number' && Number.isFinite(h.lastDevelopMs) ? count(h.lastDevelopMs) : null,
    lastError: what && at ? { at, what } : null,
  };
}

/* without Redis (development) the last word is kept for as long as the process lives */
let mem: FramkollunStatus | null = null;

export async function saveStatus(status: FramkollunStatus): Promise<void> {
  mem = status;
  if (!hasKV()) return;
  const { rSet } = await import('@/lib/redis');
  await rSet(KEY, status);
}

export async function readStatus(): Promise<FramkollunStatus | null> {
  if (!hasKV()) return mem;
  const { rGet } = await import('@/lib/redis');
  return rGet<FramkollunStatus>(KEY);
}

/** How many photos lie in the plugin's queue on the game server, read with the
    site's own exaroton key, so it is known even when Framköllun says nothing;
    null when it cannot be told. */
export async function waitingOnServer(): Promise<number | null> {
  const token = process.env.EXAROTON_API_KEY;
  if (!token) return null;
  try {
    const id = await getExarotonServerId(token);
    const res = await fetch(`https://api.exaroton.com/v1/servers/${id}/files/info/plugins/JOD-Myndavel/framkollun`, {
      headers: { Authorization: `Bearer ${token}` }, cache: 'no-store', signal: AbortSignal.timeout(6000),
    });
    /* no folder yet: no photo has been posted since the plugin went in */
    if (res.status === 404) return 0;
    if (!res.ok) return null;
    const data = await res.json() as { data?: { children?: Array<{ name?: string }> | null } };
    return (data.data?.children ?? []).filter(f => typeof f?.name === 'string' && f.name.endsWith('.mynd')).length;
  } catch {
    return null;
  }
}

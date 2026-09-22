import { getExarotonServerId } from '@/lib/exaroton';

/* BlueMap's web folder on the Minecraft server, read through the exaroton file
   API. The /bluemap route serves live data from it, and /bluemap-data falls
   back to it when the synced copy in Vercel Blob can't be read. */

/* BlueMap's web folder on the server: `webroot` in its webapp.conf. map:sync
   finds it on its own and says when it isn't the default. */
const WEBROOT = (process.env.BLUEMAP_WEBROOT || 'bluemap/web').trim().replace(/^\.?\/+/, '').replace(/\/+$/, '');
const SERVERS_API = 'https://api.exaroton.com/v1/servers';

let serverId: Promise<string> | null = null;
let serverState: { online: boolean; checked: number } | null = null;

export function resolveServerId(token: string): Promise<string> {
  serverId ??= getExarotonServerId(token).catch((err: unknown) => {
    serverId = null;
    throw err;
  });
  return serverId;
}

/* exaroton status 1 is online; checked at most every 30 seconds per instance */
export async function isOnline(id: string, token: string): Promise<boolean> {
  if (serverState && Date.now() - serverState.checked < 30_000) return serverState.online;
  let online = false;
  try {
    const res = await fetch(`${SERVERS_API}/${id}/`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (res.ok) online = ((await res.json()) as { data?: { status?: number } }).data?.status === 1;
  } catch {
    /* can't tell: treat it as stopped and use the copy */
  }
  serverState = { online, checked: Date.now() };
  return online;
}

/** A file under BlueMap's web folder, as exaroton hands it out. */
export function fetchFile(id: string, token: string, path: string): Promise<Response> {
  const encoded = `${WEBROOT}/${path}`.split('/').map(encodeURIComponent).join('/');
  return fetch(`${SERVERS_API}/${id}/files/data/${encoded}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
}

/* exaroton answers a missing file with a 4xx; which one isn't documented,
   so anything that isn't about the key or the rate limit counts as missing */
export function isMissing(status: number): boolean {
  return status >= 400 && status < 500 && status !== 401 && status !== 403 && status !== 429;
}

export async function discard(res: Response): Promise<void> {
  await res.body?.cancel().catch(() => undefined);
}

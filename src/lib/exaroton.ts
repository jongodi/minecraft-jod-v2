// Shared Exaroton API utilities — used by server-status, stats, and admin/server routes.

export interface ExarotonServer {
  id:      string;
  address: string;
  status:  number;
  name?:   string;
}

/** The server hostname — read from env, falls back to the hardcoded default. */
export function getServerHost(): string {
  return process.env.EXAROTON_SERVER_HOST ?? 'stebbias.exaroton.me';
}

/**
 * Resolve the Exaroton server ID for the configured server host.
 * Uses EXAROTON_SERVER_ID env directly when available (avoids an extra API round-trip).
 */
export async function getExarotonServerId(token: string): Promise<string> {
  const envId = process.env.EXAROTON_SERVER_ID;
  if (envId) return envId;

  const res = await fetch('https://api.exaroton.com/v1/servers/', {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Ekki tókst að sækja þjónalista frá Exaroton: ${res.status}`);
  const data = await res.json() as { data: ExarotonServer[] };
  const host = getServerHost();
  const match = data.data.find((s) => s.address === host);
  if (!match) throw new Error('Þjónninn fannst ekki á Exaroton-reikningnum');
  return match.id;
}

/** The server's status code: 0 offline, 1 online, 2 starting, 3 stopping, 4 restarting, 5 saving, 6 loading, 7 crashed. */
export async function exarotonStatus(token: string): Promise<number> {
  const id = await getExarotonServerId(token);
  const res = await fetch(`https://api.exaroton.com/v1/servers/${id}/`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
  if (!res.ok) throw new Error(`Villa frá Exaroton: ${res.status}`);
  return ((await res.json()) as { data: { status: number } }).data.status;
}

/** Asks exaroton to start the server. */
export async function startExaroton(token: string): Promise<void> {
  const id = await getExarotonServerId(token);
  const res = await fetch(`https://api.exaroton.com/v1/servers/${id}/start/`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
  if (!res.ok) throw new Error(`Villa frá Exaroton: ${res.status}`);
}

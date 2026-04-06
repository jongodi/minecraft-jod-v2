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
  if (!res.ok) throw new Error(`Exaroton list failed: ${res.status}`);
  const data = await res.json() as { data: ExarotonServer[] };
  const host = getServerHost();
  const match = data.data.find((s) => s.address === host);
  if (!match) throw new Error('Server not found in Exaroton account');
  return match.id;
}

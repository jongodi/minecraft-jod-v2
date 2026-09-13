import 'server-only';
import type { ServerState, ServerStatus } from './types';

/**
 * Server status, read on the server and cached across visitors for 30 s so a
 * page view never hits Exaroton directly. Exaroton first, when a token is
 * set; otherwise api.mcsrvstat.us pings the host. When neither answers the
 * state is 'unreachable', which is its own designed state, not an error.
 */

const EXAROTON = 'https://api.exaroton.com/v1';
const REVALIDATE = 30;

function host(): string {
  return process.env.EXAROTON_SERVER_HOST ?? 'stebbias.exaroton.me';
}

/** Exaroton status codes, from their API docs. */
function stateFromCode(code: number): ServerState {
  switch (code) {
    case 1: // online
    case 5: // saving
      return 'online';
    case 0: // offline
    case 7: // crashed
      return 'offline';
    case 3: // stopping
      return 'stopping';
    default: // starting, restarting, loading, pending, preparing
      return 'starting';
  }
}

interface ExarotonServer {
  id: string;
  address: string;
  status: number;
  players?: { list?: string[] };
}

async function exarotonServerId(token: string): Promise<string> {
  const fromEnv = process.env.EXAROTON_SERVER_ID;
  if (fromEnv) return fromEnv;
  const res = await fetch(`${EXAROTON}/servers/`, {
    headers: { Authorization: `Bearer ${token}` },
    next: { revalidate: 86400 },
  });
  if (!res.ok) throw new Error(`exaroton list ${res.status}`);
  const { data } = (await res.json()) as { data: ExarotonServer[] };
  const match = data.find((s) => s.address === host());
  if (!match) throw new Error('server not in account');
  return match.id;
}

async function fromExaroton(token: string): Promise<ServerStatus> {
  const id = await exarotonServerId(token);
  const res = await fetch(`${EXAROTON}/servers/${id}/`, {
    headers: { Authorization: `Bearer ${token}` },
    next: { revalidate: REVALIDATE },
  });
  if (!res.ok) throw new Error(`exaroton server ${res.status}`);
  const { data } = (await res.json()) as { data: ExarotonServer };
  const state = stateFromCode(data.status);
  return {
    state,
    players: state === 'online' ? (data.players?.list ?? []) : [],
    checkedAt: new Date().toISOString(),
  };
}

interface McSrvStat {
  online: boolean;
  players?: { list?: Array<{ name: string }> };
}

async function fromMcsrvstat(): Promise<ServerStatus> {
  const res = await fetch(`https://api.mcsrvstat.us/3/${host()}`, { next: { revalidate: REVALIDATE } });
  if (!res.ok) throw new Error(`mcsrvstat ${res.status}`);
  const data = (await res.json()) as McSrvStat;
  return {
    state: data.online ? 'online' : 'offline',
    players: data.online ? (data.players?.list ?? []).map((p) => p.name) : [],
    checkedAt: new Date().toISOString(),
  };
}

export async function getStatus(): Promise<ServerStatus> {
  const token = process.env.EXAROTON_API_KEY;
  if (token) {
    try {
      return await fromExaroton(token);
    } catch {
      // fall through to the public ping
    }
  }
  try {
    return await fromMcsrvstat();
  } catch {
    return { state: 'unreachable', players: [], checkedAt: new Date().toISOString() };
  }
}

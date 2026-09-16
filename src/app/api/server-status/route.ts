import { NextResponse } from 'next/server';
import { getExarotonServerId, getServerHost, type ExarotonServer } from '@/lib/exaroton';

export interface StatusResponse {
  online: boolean;
  players?: {
    online: number;
    max: number;
    list?: Array<{ name: string; uuid: string }>;
  };
  version?: string;
  motd?: { clean?: string[] };
  icon?: string;
  source: 'exaroton' | 'mcsrvstat' | 'error';
}

const TIMEOUT_MS = 6000;
const CACHE_MS = 30_000;
const DEFAULT_MAX_PLAYERS = 20;

/* One answer is shared by every visitor for half a minute, so the upstream
   APIs see a trickle no matter how many tabs are open. */
let cached: { at: number; body: StatusResponse } | null = null;

export async function GET() {
  if (cached && Date.now() - cached.at < CACHE_MS) return respond(cached.body);
  const body = await lookup();
  if (body.source !== 'error') cached = { at: Date.now(), body };
  return respond(body);
}

function respond(body: StatusResponse) {
  return NextResponse.json(body, { headers: { 'Cache-Control': `s-maxage=${CACHE_MS / 1000}, stale-while-revalidate=60` } });
}

async function lookup(): Promise<StatusResponse> {
  if (process.env.EXAROTON_API_KEY) {
    try {
      return await fromExaroton();
    } catch {
      // fall through to mcsrvstat
    }
  }
  return fromMcsrvstat();
}

interface ExarotonServerDetail extends ExarotonServer {
  players?: { count: number; max: number; list?: string[] };
  software?: { id: string; name: string; version: string };
}

async function fromExaroton(): Promise<StatusResponse> {
  const token = process.env.EXAROTON_API_KEY!;
  const id    = await getExarotonServerId(token);

  const res = await fetch(`https://api.exaroton.com/v1/servers/${id}/`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error('Exaroton server fetch failed');
  const { data: server } = await res.json() as { data: ExarotonServerDetail };

  // Exaroton status: 0=offline 1=online 2=starting 3=stopping 4=restarting 5=saving 6=loading 7=crashed
  const isOnline  = server.status === 1;
  const nameList  = server.players?.list ?? [];

  return {
    online: isOnline,
    source: 'exaroton',
    ...(server.software?.version && { version: server.software.version }),
    ...(isOnline && {
      players: {
        online: server.players?.count ?? 0,
        max:    server.players?.max ?? DEFAULT_MAX_PLAYERS,
        list:   nameList.map((name) => ({ name, uuid: '' })),
      },
    }),
  };
}

async function fromMcsrvstat(): Promise<StatusResponse> {
  try {
    const res = await fetch(`https://api.mcsrvstat.us/3/${getServerHost()}`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) throw new Error('mcsrvstat fetch failed');
    const data = await res.json() as Omit<StatusResponse, 'source'>;
    return { ...data, source: 'mcsrvstat' };
  } catch {
    return { online: false, source: 'error' };
  }
}

import { NextResponse } from 'next/server';
import { CREW_USERNAMES } from '@/lib/crew-types';
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
  await notePlayNight(body);
  return respond(body);
}

/* During a play night's evening, the crew online are noted as having come
   (src/lib/play-night.ts). Never holds up or fails the answer. */
async function notePlayNight(body: StatusResponse): Promise<void> {
  if (!process.env.REDIS_URL || !body.online) return;
  const crew = new Map<string, string>(CREW_USERNAMES.map(n => [n.toLowerCase(), n]));
  const names = (body.players?.list ?? []).map(p => crew.get(p.name.toLowerCase())).filter((n): n is string => !!n);
  if (names.length === 0) return;
  try {
    const { noteSeen } = await import('@/lib/play-night');
    await noteSeen(names);
  } catch { /* the status answers regardless */ }
}

/* A failed lookup is shared for a few seconds only: long enough to spare the
   upstream a stampede, short enough that one hiccup does not tell every
   visitor for a minute and a half that the server is off. */
function respond(body: StatusResponse) {
  const cache = body.source === 'error' ? 's-maxage=5' : `s-maxage=${CACHE_MS / 1000}, stale-while-revalidate=60`;
  return NextResponse.json(body, { headers: { 'Cache-Control': cache } });
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

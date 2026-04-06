import { NextResponse } from 'next/server';
import { getExarotonServerId, getServerHost, type ExarotonServer } from '@/lib/exaroton';

export interface StatusResponse {
  online: boolean;
  players?: {
    online: number;
    max: number;
    list?: Array<{ name: string; uuid: string }>;
  };
  motd?: { clean?: string[] };
  icon?: string;
  source: 'exaroton' | 'mcsrvstat' | 'error';
}

export async function GET() {
  if (process.env.EXAROTON_API_KEY) {
    try {
      return await fromExaroton();
    } catch {
      // fall through to mcsrvstat
    }
  }
  return await fromMcsrvstat();
}

interface ExarotonServerDetail extends ExarotonServer {
  players?: { count: number; max: number; list?: string[] };
}

async function fromExaroton(): Promise<NextResponse<StatusResponse>> {
  const token = process.env.EXAROTON_API_KEY!;
  const id    = await getExarotonServerId(token);

  const res = await fetch(`https://api.exaroton.com/v1/servers/${id}/`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error('Exaroton server fetch failed');
  const { data: server } = await res.json() as { data: ExarotonServerDetail };

  // Exaroton status: 0=offline 1=online 2=starting 3=stopping 4=restarting 5=saving 6=loading 7=crashed
  const isOnline  = server.status === 1;
  const nameList  = server.players?.list ?? [];

  const payload: StatusResponse = {
    online: isOnline,
    source: 'exaroton',
    ...(isOnline && {
      players: {
        online: server.players?.count ?? 0,
        max:    server.players?.max ?? 20,
        list:   nameList.map((name) => ({ name, uuid: '' })),
      },
    }),
  };

  return NextResponse.json(payload);
}

async function fromMcsrvstat(): Promise<NextResponse<StatusResponse>> {
  try {
    const res = await fetch(`https://api.mcsrvstat.us/3/${getServerHost()}`, {
      cache: 'no-store',
    });
    const data = await res.json();
    return NextResponse.json({ ...data, source: 'mcsrvstat' } as StatusResponse);
  } catch {
    return NextResponse.json({ online: false, source: 'error' });
  }
}

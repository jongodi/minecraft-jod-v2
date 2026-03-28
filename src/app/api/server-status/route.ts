import { NextResponse } from 'next/server';

// Set these in .env.local:
//   EXAROTON_API_KEY=your_token_here
//   EXAROTON_SERVER_ID=your_server_id  (optional — auto-discovered if omitted)
const SERVER_HOST = 'stebbias.exaroton.me';

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

async function fromExaroton(): Promise<NextResponse<StatusResponse>> {
  const token = process.env.EXAROTON_API_KEY!;
  let id = process.env.EXAROTON_SERVER_ID ?? '';

  if (!id) {
    const listRes = await fetch('https://api.exaroton.com/v1/servers/', {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!listRes.ok) throw new Error('Exaroton list failed');
    const listData = await listRes.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const match = (listData.data as any[]).find(
      (s) => s.address === SERVER_HOST
    );
    if (!match) throw new Error('Server not found in account');
    id = match.id as string;
  }

  const res = await fetch(`https://api.exaroton.com/v1/servers/${id}/`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error('Exaroton server fetch failed');
  const data = await res.json();
  const server = data.data;

  // Exaroton status codes: 0=offline 1=online 2=starting 3=stopping 4=restarting 5=saving 6=loading 7=crashed 8=pending 9=preparing
  const isOnline = server.status === 1;
  const nameList: string[] = server.players?.list ?? [];

  const payload: StatusResponse = {
    online: isOnline,
    source: 'exaroton',
    ...(isOnline && {
      players: {
        online: server.players?.count ?? 0,
        max: server.players?.max ?? 20,
        list: nameList.map((name) => ({ name, uuid: '' })),
      },
    }),
  };

  return NextResponse.json(payload);
}

async function fromMcsrvstat(): Promise<NextResponse<StatusResponse>> {
  try {
    const res = await fetch(`https://api.mcsrvstat.us/3/${SERVER_HOST}`, {
      cache: 'no-store',
    });
    const data = await res.json();
    return NextResponse.json({ ...data, source: 'mcsrvstat' } as StatusResponse);
  } catch {
    return NextResponse.json({ online: false, source: 'error' });
  }
}

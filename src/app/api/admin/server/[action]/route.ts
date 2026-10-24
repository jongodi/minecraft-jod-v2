import { errorMessage } from '@/lib/icelandic';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, unauthorizedResponse } from '@/lib/auth';
import { getExarotonServerId, type ExarotonServer } from '@/lib/exaroton';
import { forgetStatus } from '@/lib/server-status';

const ALLOWED_ACTIONS = ['start', 'stop', 'restart'] as const;
type ServerAction = typeof ALLOWED_ACTIONS[number];

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ action: string }> }
) {
  if (!(await requireAdmin())) return unauthorizedResponse();

  const { action } = await params;
  if (!(ALLOWED_ACTIONS as readonly string[]).includes(action)) {
    return NextResponse.json({ error: `Óþekkt aðgerð: ${action}` }, { status: 400 });
  }

  const token = process.env.EXAROTON_API_KEY;
  if (!token) {
    return NextResponse.json({ error: 'EXAROTON_API_KEY hefur ekki verið stilltur.' }, { status: 503 });
  }

  try {
    const id = await getExarotonServerId(token);
    const url = action === 'restart'
      ? `https://api.exaroton.com/v1/servers/${id}/restart/`
      : `https://api.exaroton.com/v1/servers/${id}/${action as ServerAction}/`;

    const res = await fetch(url, {
      method: 'GET', // Exaroton uses GET for server actions
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
      /* capped, as every other call to exaroton is: a hung one held the panel's button until the function's limit */
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      const errBody = await res.text();
      return NextResponse.json({ error: `Villa frá Exaroton: ${errBody}` }, { status: res.status });
    }

    /* the status is asked for afresh, so the lantern sees the change rather than the answer from before it */
    forgetStatus();
    return NextResponse.json({ ok: true, action });
  } catch (err) {
    if (err instanceof Error && err.name === 'TimeoutError') return NextResponse.json({ error: 'Exaroton svaraði ekki í tæka tíð. Athugaðu stöðuna áður en þú reynir aftur.' }, { status: 504 });
    return NextResponse.json({ error: errorMessage(err) }, { status: 500 });
  }
}

// GET — fetch current server details (status, ram, credits)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ action: string }> }
) {
  if (!(await requireAdmin())) return unauthorizedResponse();
  const { action } = await params;
  if (action !== 'info') {
    return NextResponse.json({ error: 'Notaðu POST fyrir aðgerðir og GET /info fyrir upplýsingar.' }, { status: 400 });
  }

  const token = process.env.EXAROTON_API_KEY;
  if (!token) {
    return NextResponse.json({ error: 'EXAROTON_API_KEY hefur ekki verið stilltur.' }, { status: 503 });
  }

  try {
    const id = await getExarotonServerId(token);
    const res = await fetch(`https://api.exaroton.com/v1/servers/${id}/`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`Villa frá Exaroton: ${res.status}`);
    const { data } = await res.json() as { data: ExarotonServer };
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: errorMessage(err) }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, unauthorizedResponse } from '@/lib/auth';
import { getExarotonServerId, type ExarotonServer } from '@/lib/exaroton';

const ALLOWED_ACTIONS = ['start', 'stop', 'restart'] as const;
type ServerAction = typeof ALLOWED_ACTIONS[number];

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ action: string }> }
) {
  if (!(await requireAdmin())) return unauthorizedResponse();

  const { action } = await params;
  if (!(ALLOWED_ACTIONS as readonly string[]).includes(action)) {
    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  }

  const token = process.env.EXAROTON_API_KEY;
  if (!token) {
    return NextResponse.json({ error: 'EXAROTON_API_KEY not configured' }, { status: 503 });
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
    });

    if (!res.ok) {
      const errBody = await res.text();
      return NextResponse.json({ error: `Exaroton error: ${errBody}` }, { status: res.status });
    }

    return NextResponse.json({ ok: true, action });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
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
    return NextResponse.json({ error: 'Use POST for actions, GET /info for details' }, { status: 400 });
  }

  const token = process.env.EXAROTON_API_KEY;
  if (!token) {
    return NextResponse.json({ error: 'EXAROTON_API_KEY not configured' }, { status: 503 });
  }

  try {
    const id = await getExarotonServerId(token);
    const res = await fetch(`https://api.exaroton.com/v1/servers/${id}/`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`Exaroton error: ${res.status}`);
    const { data } = await res.json() as { data: ExarotonServer };
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

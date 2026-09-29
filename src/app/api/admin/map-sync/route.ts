import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, unauthorizedResponse } from '@/lib/auth';
import { getExarotonServerId } from '@/lib/exaroton';
import { errorMessage } from '@/lib/icelandic';
import { snapshot } from '@/lib/bluemap-snapshot';

/* The map copy, started from the admin panel. The copy is made by the
   "Map sync" GitHub Action (.github/workflows/map-sync.yml): it takes minutes
   and ends in a commit to main, which Vercel deploys, so it can't run inside
   a request here. This route starts that workflow and reports on its runs.

   Needs MAP_SYNC_GITHUB_TOKEN: a fine-grained GitHub token for this
   repository with "Actions: Read and write". MAP_SYNC_REPO names another
   repository, if the site is ever built from one. */

export const dynamic = 'force-dynamic';

const REPO = (process.env.MAP_SYNC_REPO || 'jongodi/minecraft-jod-v2').trim();
const WORKFLOW = 'map-sync.yml';
const API = `https://api.github.com/repos/${REPO}/actions/workflows/${WORKFLOW}`;

export interface MapSyncRun {
  id: number;
  status: string;            // queued, in_progress, completed, …
  conclusion: string | null; // success, failure, cancelled, … once completed
  createdAt: string;
  updatedAt: string;
  url: string;
  /** Started to copy even though the server was stopped. */
  offline: boolean;
}

export interface MapSyncState {
  /** When the copy this deployment serves was taken. */
  syncedAt: string | null;
  runs: MapSyncRun[];
}

function github(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${API}${path}`, {
    ...init,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${process.env.MAP_SYNC_GITHUB_TOKEN}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'JODCraft-Dashboard/1.0',
      ...init.headers,
    },
    cache: 'no-store',
  });
}

const NO_TOKEN = 'MAP_SYNC_GITHUB_TOKEN hefur ekki verið stilltur í Vercel. Hann þarf aðganginn „Actions: Read and write“ að repóinu.';

async function githubError(res: Response): Promise<string> {
  if (res.status === 401) return 'GitHub hafnaði MAP_SYNC_GITHUB_TOKEN. Er hann útrunninn?';
  if (res.status === 403 || res.status === 404) return 'MAP_SYNC_GITHUB_TOKEN hefur ekki aðgang að Actions í repóinu („Actions: Read and write“).';
  const body = await res.json().catch(() => null) as { message?: string } | null;
  return `Villa frá GitHub (${res.status})${body?.message ? `: ${body.message}` : ''}`;
}

export async function GET() {
  if (!(await requireAdmin())) return unauthorizedResponse();
  if (!process.env.MAP_SYNC_GITHUB_TOKEN) return NextResponse.json({ error: NO_TOKEN }, { status: 503 });

  try {
    const res = await github('/runs?per_page=5');
    if (!res.ok) return NextResponse.json({ error: await githubError(res) }, { status: 502 });
    const { workflow_runs } = await res.json() as {
      workflow_runs: { id: number; status: string; conclusion: string | null; created_at: string; updated_at: string; html_url: string; display_title: string }[];
    };
    const state: MapSyncState = {
      syncedAt: snapshot.syncedAt,
      runs: workflow_runs.map(r => ({
        id: r.id, status: r.status, conclusion: r.conclusion,
        createdAt: r.created_at, updatedAt: r.updated_at, url: r.html_url,
        /* the workflow's run-name */
        offline: r.display_title.includes('server off'),
      })),
    };
    return NextResponse.json(state, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    return NextResponse.json({ error: errorMessage(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return unauthorizedResponse();
  if (!process.env.MAP_SYNC_GITHUB_TOKEN) return NextResponse.json({ error: NO_TOKEN }, { status: 503 });

  /* { offline: true } copies even off a stopped server: slowly, since
     exaroton hands out a stopped server's files far more slowly. */
  const body = await req.json().catch(() => null) as { offline?: unknown } | null;
  const offline = body?.offline === true;

  /* Otherwise the workflow copies nothing while the server is stopped, so
     say so here instead of starting a run that quietly does nothing. */
  const token = process.env.EXAROTON_API_KEY;
  if (token && !offline) {
    try {
      const id = await getExarotonServerId(token);
      const res = await fetch(`https://api.exaroton.com/v1/servers/${id}/`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      if (res.ok) {
        const { data } = await res.json() as { data: { status: number } };
        if (data.status !== 1) {
          return NextResponse.json({ error: 'Þjónninn er ekki í gangi. Ræstu hann fyrst, eða hakaðu við „Líka þótt þjónninn sé slökktur“.' }, { status: 409 });
        }
      }
    } catch {
      /* exaroton unreachable: let the workflow find out for itself */
    }
  }

  try {
    const res = await github('/dispatches', { method: 'POST', body: JSON.stringify({ ref: 'main', ...(offline ? { inputs: { offline: 'true' } } : {}) }) });
    if (!res.ok) return NextResponse.json({ error: await githubError(res) }, { status: 502 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: errorMessage(err) }, { status: 500 });
  }
}

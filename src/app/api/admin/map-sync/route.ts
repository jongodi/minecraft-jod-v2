import { NextResponse } from 'next/server';
import { requireAdmin, unauthorizedResponse } from '@/lib/auth';
import { errorMessage } from '@/lib/icelandic';
import { snapshot } from '@/lib/bluemap-snapshot';
import { NO_TOKEN, githubError, serverStopped, workflowApi, type WorkflowRun } from '@/lib/github-actions';

/* The map copy, started from the admin panel. The copy is made by the
   "Map sync" GitHub Action (.github/workflows/map-sync.yml): it takes minutes
   and ends in a commit to main, which Vercel deploys, so it can't run inside
   a request here. This route starts that workflow and reports on its runs
   (src/lib/github-actions.ts says what it needs). */

export const dynamic = 'force-dynamic';

const github = workflowApi('map-sync.yml');

export interface MapSyncRun {
  id: number;
  status: string;            // queued, in_progress, completed, …
  conclusion: string | null; // success, failure, cancelled, … once completed
  createdAt: string;
  updatedAt: string;
  url: string;
  /** Started while the server was stopped. */
  offline: boolean;
}

export interface MapSyncState {
  /** When the copy this deployment serves was taken. */
  syncedAt: string | null;
  runs: MapSyncRun[];
}

export async function GET() {
  if (!(await requireAdmin())) return unauthorizedResponse();
  if (!process.env.MAP_SYNC_GITHUB_TOKEN) return NextResponse.json({ error: NO_TOKEN }, { status: 503 });

  try {
    const res = await github('/runs?per_page=5');
    if (!res.ok) return NextResponse.json({ error: await githubError(res) }, { status: 502 });
    const { workflow_runs } = await res.json() as { workflow_runs: WorkflowRun[] };
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

export async function POST() {
  if (!(await requireAdmin())) return unauthorizedResponse();
  if (!process.env.MAP_SYNC_GITHUB_TOKEN) return NextResponse.json({ error: NO_TOKEN }, { status: 503 });

  /* Copies whether the server runs or not; a run started while it is
     stopped is named so, for the panel to say. */
  const offline = await serverStopped();

  try {
    const res = await github('/dispatches', { method: 'POST', body: JSON.stringify({ ref: 'main', inputs: { server_off: offline ? 'true' : 'false' } }) });
    if (!res.ok) return NextResponse.json({ error: await githubError(res) }, { status: 502 });
    return NextResponse.json({ ok: true, offline });
  } catch (err) {
    return NextResponse.json({ error: errorMessage(err) }, { status: 500 });
  }
}

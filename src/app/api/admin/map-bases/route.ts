import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, unauthorizedResponse } from '@/lib/auth';
import { errorMessage } from '@/lib/icelandic';
import { BASES } from '@/lib/bluemap-bases';
import { NO_TOKEN, githubError, readBasesRunName, serverStopped, workflowApi, type WorkflowRun } from '@/lib/github-actions';

/* The base maps' copies, started from the admin panel (Þjónn → Grunnkortin).
   The "Map bases" GitHub Action (.github/workflows/map-bases.yml) does the
   work: it compares each base with the copy the site has and sends only the
   ones that changed (npm run map:bases -- --upload), commits their manifests
   to main, which Vercel deploys, and then drops the copies they replaced.
   This route starts it, for some bases or all of them, and reports on its
   runs. It never touches the main map's copy (/api/admin/map-sync). */

export const dynamic = 'force-dynamic';

const github = workflowApi('map-bases.yml');

export interface MapBase {
  id: string;
  name: string;
  /** When the copy this deployment serves went up; null if it has none. */
  syncedAt: string | null;
  files: number;
  bytes: number;
}

export interface MapBasesRun {
  id: number;
  status: string;            // queued, in_progress, completed, …
  conclusion: string | null; // success, failure, cancelled, … once completed
  createdAt: string;
  updatedAt: string;
  url: string;
  /** The bases the run was asked to copy; null for all of them. */
  bases: string[] | null;
  /** Sent even if nothing changed. */
  forced: boolean;
  /** Started while the server was stopped. */
  offline: boolean;
}

export interface MapBasesState {
  bases: MapBase[];
  runs: MapBasesRun[];
}

const bases = (): MapBase[] => BASES.map(({ id, name, copy }) => ({
  id, name, syncedAt: copy.hasFiles ? copy.syncedAt : null, files: copy.files.length, bytes: copy.bytes,
}));

export async function GET() {
  if (!(await requireAdmin())) return unauthorizedResponse();
  if (!process.env.MAP_SYNC_GITHUB_TOKEN) return NextResponse.json({ error: NO_TOKEN }, { status: 503 });

  try {
    const res = await github('/runs?per_page=5');
    /* the workflow isn't on main yet: no runs, and nothing to start */
    if (res.status === 404) return NextResponse.json({ error: 'Map bases-verkið (.github/workflows/map-bases.yml) er ekki komið á main.' }, { status: 502 });
    if (!res.ok) return NextResponse.json({ error: await githubError(res) }, { status: 502 });
    const { workflow_runs } = await res.json() as { workflow_runs: WorkflowRun[] };
    const state: MapBasesState = {
      bases: bases(),
      runs: workflow_runs.map(r => ({
        id: r.id, status: r.status, conclusion: r.conclusion,
        createdAt: r.created_at, updatedAt: r.updated_at, url: r.html_url,
        ...readBasesRunName(r.display_title),
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

  /* { bases: ['jodville'], force: true }; no bases, or an empty list, is all of them */
  const body = await req.json().catch(() => null) as { bases?: unknown; force?: unknown } | null;
  const asked = Array.isArray(body?.bases) ? body.bases : [];
  const known = new Set(BASES.map(b => b.id));
  if (!asked.every((id): id is string => typeof id === 'string' && known.has(id))) {
    return NextResponse.json({ error: `Þekki ekki grunnkortið. Til eru: ${[...known].join(', ')}.` }, { status: 400 });
  }
  const ids = BASES.map(b => b.id).filter(id => asked.includes(id));
  const force = body?.force === true;

  /* Runs whether the server is on or not: a stopped server's files come off
     exaroton as quickly. A run started while it is stopped is named so. */
  const offline = await serverStopped();

  try {
    const res = await github('/dispatches', {
      method: 'POST',
      body: JSON.stringify({ ref: 'main', inputs: { bases: ids.join(' '), force: force ? 'true' : 'false', server_off: offline ? 'true' : 'false' } }),
    });
    if (!res.ok) return NextResponse.json({ error: await githubError(res) }, { status: 502 });
    return NextResponse.json({ ok: true, offline });
  } catch (err) {
    return NextResponse.json({ error: errorMessage(err) }, { status: 500 });
  }
}

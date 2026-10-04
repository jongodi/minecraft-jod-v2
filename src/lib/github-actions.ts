import { getExarotonServerId } from '@/lib/exaroton';

/* Starting and following a GitHub Action from the admin panel: the map copy
   (map-sync.yml) and the base maps' copies (map-bases.yml). Both take minutes
   and end in a commit to main, which Vercel deploys, so neither can run
   inside a request here.

   Needs MAP_SYNC_GITHUB_TOKEN: a fine-grained GitHub token for this
   repository with "Actions: Read and write". MAP_SYNC_REPO names another
   repository, if the site is ever built from one. */

const REPO = (process.env.MAP_SYNC_REPO || 'jongodi/minecraft-jod-v2').trim();

export const NO_TOKEN = 'MAP_SYNC_GITHUB_TOKEN hefur ekki verið stilltur í Vercel. Hann þarf aðganginn „Actions: Read and write“ að repóinu.';

/** A call to one workflow's part of the GitHub API (/runs, /dispatches). */
export function workflowApi(workflow: string) {
  const api = `https://api.github.com/repos/${REPO}/actions/workflows/${workflow}`;
  return (path: string, init: RequestInit = {}): Promise<Response> => fetch(`${api}${path}`, {
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

export async function githubError(res: Response): Promise<string> {
  if (res.status === 401) return 'GitHub hafnaði MAP_SYNC_GITHUB_TOKEN. Er hann útrunninn?';
  if (res.status === 403 || res.status === 404) return 'MAP_SYNC_GITHUB_TOKEN hefur ekki aðgang að Actions í repóinu („Actions: Read and write“).';
  const body = await res.json().catch(() => null) as { message?: string } | null;
  return `Villa frá GitHub (${res.status})${body?.message ? `: ${body.message}` : ''}`;
}

/** A workflow run as GitHub lists it. */
export interface WorkflowRun {
  id: number;
  status: string;
  conclusion: string | null;
  created_at: string;
  updated_at: string;
  html_url: string;
  /** the workflow's run-name */
  display_title: string;
}

/** The base maps' workflow's run-name (map-bases.yml): "Map bases: jodville faraway",
    "Map bases: all, forced, server off". `bases` is null for all of them. */
export function readBasesRunName(title: string): { bases: string[] | null; forced: boolean; offline: boolean } {
  const [list = '', ...flags] = title.replace(/^Map bases:?\s*/, '').split(',').map(part => part.trim());
  return {
    bases: !list || list === 'all' ? null : list.split(/\s+/),
    forced: flags.includes('forced'),
    offline: flags.includes('server off'),
  };
}

/** True when exaroton says the server is stopped; false while it runs, or
    when that can't be told (no key, exaroton unreachable): then the
    workflow finds out for itself. */
export async function serverStopped(): Promise<boolean> {
  const token = process.env.EXAROTON_API_KEY;
  if (!token) return false;
  try {
    const id = await getExarotonServerId(token);
    const res = await fetch(`https://api.exaroton.com/v1/servers/${id}/`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!res.ok) return false;
    const { data } = await res.json() as { data: { status: number } };
    return data.status !== 1;
  } catch {
    return false;
  }
}

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GET, POST } from '../../app/api/admin/map-sync/route';

vi.mock('@/lib/auth', () => ({
  requireAdmin: vi.fn(async () => true),
  unauthorizedResponse: () => new Response(null, { status: 401 }),
}));

const DISPATCH = 'https://api.github.com/repos/jongodi/minecraft-jod-v2/actions/workflows/map-sync.yml/dispatches';
const start = () => POST();

describe('/api/admin/map-sync', () => {
  const fetchMock = vi.fn();
  let serverStatus = 1;

  beforeEach(() => {
    vi.stubEnv('MAP_SYNC_GITHUB_TOKEN', 'github-test');
    vi.stubEnv('EXAROTON_API_KEY', 'exaroton-test');
    vi.stubEnv('EXAROTON_SERVER_ID', 'srv');
    vi.stubGlobal('fetch', fetchMock);
    serverStatus = 1;
    fetchMock.mockImplementation(async (url: string) => {
      if (url.startsWith('https://api.exaroton.com/')) return Response.json({ data: { status: serverStatus } });
      if (url === DISPATCH) return new Response(null, { status: 204 });
      if (url.includes('/runs')) {
        return Response.json({ workflow_runs: [
          { id: 2, status: 'in_progress', conclusion: null, created_at: 'a', updated_at: 'b', html_url: 'u2', display_title: 'Map sync, server off' },
          { id: 1, status: 'completed', conclusion: 'success', created_at: 'a', updated_at: 'b', html_url: 'u1', display_title: 'Map sync' },
        ] });
      }
      return new Response(null, { status: 404 });
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  const dispatched = () => fetchMock.mock.calls.find(([url]) => url === DISPATCH);

  it('starts the workflow while the server runs', async () => {
    const res = await start();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, offline: false });
    expect(JSON.parse(dispatched()?.[1].body)).toEqual({ ref: 'main', inputs: { server_off: 'false' } });
  });

  it('starts it while the server is stopped too, and names the run so', async () => {
    serverStatus = 0;
    const res = await start();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, offline: true });
    expect(JSON.parse(dispatched()?.[1].body)).toEqual({ ref: 'main', inputs: { server_off: 'true' } });
  });

  it('starts it when exaroton can\'t say, as if the server runs', async () => {
    fetchMock.mockImplementation(async (url: string) => {
      if (url.startsWith('https://api.exaroton.com/')) return new Response(null, { status: 502 });
      if (url === DISPATCH) return new Response(null, { status: 204 });
      return new Response(null, { status: 404 });
    });
    expect((await start()).status).toBe(200);
    expect(JSON.parse(dispatched()?.[1].body)).toEqual({ ref: 'main', inputs: { server_off: 'false' } });
  });

  it('tells the runs off a stopped server apart', async () => {
    const res = await GET();
    const { runs } = await res.json();
    expect(runs.map((r: { offline: boolean }) => r.offline)).toEqual([true, false]);
  });

  it('says what is missing without a GitHub token', async () => {
    vi.stubEnv('MAP_SYNC_GITHUB_TOKEN', '');
    expect((await start()).status).toBe(503);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

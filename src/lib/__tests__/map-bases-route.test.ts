import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from '../../app/api/admin/map-bases/route';
import { readBasesRunName } from '@/lib/github-actions';

vi.mock('@/lib/auth', () => ({
  requireAdmin: vi.fn(async () => true),
  unauthorizedResponse: () => new Response(null, { status: 401 }),
}));
vi.mock('@/lib/map-bases/bustadur.json', () => ({
  default: {
    syncedAt: '2026-10-03T12:00:00.000Z',
    version: 'vbase',
    files: ['maps/bustadur/settings.json', 'maps/bustadur/tiles/0/x1/z1.prbm.gz'],
    blob: { base: 'https://store.private.blob.vercel-storage.com', access: 'private' },
    packs: { names: ['bluemap-bases/bustadur/vbase-0.pack'], at: [[0, 0, 100], [0, 100, 2048]] },
  },
}));

/* only Bústaður is on the site in these tests, whatever the real manifests hold */
vi.mock('@/lib/map-bases/jodville.json', () => ({ default: { syncedAt: null, files: [] } }));
vi.mock('@/lib/map-bases/faraway.json', () => ({ default: { syncedAt: null, files: [] } }));
vi.mock('@/lib/map-bases/shroomy.json', () => ({ default: { syncedAt: null, files: [] } }));

const { redrawBases, freezeBases } = vi.hoisted(() => ({ redrawBases: vi.fn(async () => undefined), freezeBases: vi.fn(async () => undefined) }));
vi.mock('@/lib/bluemap-redraw', () => ({ redrawBases, freezeBases }));

const RUNS = 'https://api.github.com/repos/jongodi/minecraft-jod-v2/actions/workflows/map-bases.yml/runs?per_page=5';
const DISPATCH = 'https://api.github.com/repos/jongodi/minecraft-jod-v2/actions/workflows/map-bases.yml/dispatches';
const start = (body?: unknown) => POST(new NextRequest('https://jod.test/api/admin/map-bases', {
  method: 'POST',
  ...(body === undefined ? {} : { body: JSON.stringify(body) }),
}));

describe('/api/admin/map-bases', () => {
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
      if (url === RUNS) {
        return Response.json({ workflow_runs: [
          { id: 2, status: 'in_progress', conclusion: null, created_at: 'a', updated_at: 'b', html_url: 'u2', display_title: 'Map bases: jodville faraway' },
          { id: 1, status: 'completed', conclusion: 'success', created_at: 'a', updated_at: 'b', html_url: 'u1', display_title: 'Map bases: all, forced, server off' },
        ] });
      }
      return new Response(null, { status: 404 });
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    fetchMock.mockReset();
    redrawBases.mockClear();
    freezeBases.mockClear();
  });

  const dispatched = () => fetchMock.mock.calls.find(([url]) => url === DISPATCH);

  it('starts the workflow for the bases asked for, in the list\'s order', async () => {
    const res = await start({ bases: ['shroomy', 'jodville'] });
    expect(res.status).toBe(200);
    expect(JSON.parse(dispatched()?.[1].body)).toEqual({ ref: 'main', inputs: { bases: 'jodville shroomy', force: 'false', server_off: 'false' } });
  });

  it('starts it for all of them, and sends even unchanged ones when told to', async () => {
    expect((await start({ force: true })).status).toBe(200);
    expect(JSON.parse(dispatched()?.[1].body)).toEqual({ ref: 'main', inputs: { bases: '', force: 'true', server_off: 'false' } });
  });

  it('turns down a base it doesn\'t know, before asking anyone', async () => {
    const res = await start({ bases: ['jodville', 'world'] });
    expect(res.status).toBe(400);
    expect((await start({ bases: ['jodville; rm -rf /'] })).status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('starts it while the server is stopped too, and names the run so', async () => {
    serverStatus = 0;
    const res = await start({ bases: ['jodville'] });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, offline: true });
    expect(JSON.parse(dispatched()?.[1].body)).toEqual({ ref: 'main', inputs: { bases: 'jodville', force: 'false', server_off: 'true' } });
  });

  it('says what the site has of each base, and what each run was for', async () => {
    const res = await GET();
    const { bases, runs } = await res.json();
    expect(bases.map((b: { id: string }) => b.id)).toEqual(['jodville', 'faraway', 'bustadur', 'shroomy']);
    expect(bases.find((b: { id: string }) => b.id === 'bustadur')).toEqual({
      id: 'bustadur', name: 'Bústaður', syncedAt: '2026-10-03T12:00:00.000Z', files: 2, bytes: 2148,
    });
    expect(bases.find((b: { id: string }) => b.id === 'jodville').syncedAt).toBeNull();
    expect(runs.map((r: { bases: string[] | null; forced: boolean; offline: boolean }) => [r.bases, r.forced, r.offline]))
      .toEqual([[['jodville', 'faraway'], false, false], [null, true, true]]);
  });

  it('redraws a named base on the running server, and freezes them all, without GitHub', async () => {
    const redraw = await start({ action: 'redraw', bases: ['jodville'] });
    expect(redraw.status).toBe(200);
    expect(redrawBases).toHaveBeenCalledWith('exaroton-test', ['jodville']);
    const freeze = await start({ action: 'freeze' });
    expect(await freeze.json()).toEqual({ ok: true, action: 'freeze', bases: ['jodville', 'faraway', 'bustadur', 'shroomy'] });
    expect(freezeBases).toHaveBeenCalledWith('exaroton-test', ['jodville', 'faraway', 'bustadur', 'shroomy']);
    expect(dispatched()).toBeUndefined();
  });

  it('wants a base named to redraw, and a running server for the commands', async () => {
    expect((await start({ action: 'redraw' })).status).toBe(400);
    serverStatus = 0;
    expect((await start({ action: 'redraw', bases: ['jodville'] })).status).toBe(409);
    expect((await start({ action: 'freeze' })).status).toBe(409);
    expect(redrawBases).not.toHaveBeenCalled();
    expect(freezeBases).not.toHaveBeenCalled();
  });

  it('says what is missing without a GitHub token', async () => {
    vi.stubEnv('MAP_SYNC_GITHUB_TOKEN', '');
    expect((await start()).status).toBe(503);
    expect((await GET()).status).toBe(503);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('readBasesRunName', () => {
  it('reads which bases a run was for', () => {
    expect(readBasesRunName('Map bases: jodville')).toEqual({ bases: ['jodville'], forced: false, offline: false, inspect: false });
    expect(readBasesRunName('Map bases: all')).toEqual({ bases: null, forced: false, offline: false, inspect: false });
    expect(readBasesRunName('Map bases: faraway shroomy, forced')).toEqual({ bases: ['faraway', 'shroomy'], forced: true, offline: false, inspect: false });
    expect(readBasesRunName('Map bases: all, server off')).toEqual({ bases: null, forced: false, offline: true, inspect: false });
    expect(readBasesRunName('Map bases: jodville, forced, server off')).toEqual({ bases: ['jodville'], forced: true, offline: true, inspect: false });
    expect(readBasesRunName('Map bases')).toEqual({ bases: null, forced: false, offline: false, inspect: false });
    expect(readBasesRunName('Map bases: jodville faraway, inspect')).toMatchObject({ bases: ['jodville', 'faraway'], inspect: true });
  });
});

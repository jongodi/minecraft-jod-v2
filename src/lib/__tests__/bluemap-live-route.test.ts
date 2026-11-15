import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/* /bluemap while the server runs: what the viewer asks for live comes off
   exaroton, and when exaroton cannot be reached mid-way the answer is the
   synced copy's, as when the server is stopped, never a bare 500. */
const ask = async (path: string) => (await import('../../app/bluemap/[[...path]]/route')).GET(
  new Request(`https://jod.test/bluemap/${path}`),
  { params: Promise.resolve({ path: path.split('/') }) },
);

describe('/bluemap, live', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('EXAROTON_API_KEY', 'exaroton-test');
    vi.stubEnv('EXAROTON_SERVER_ID', 'srv');
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    /* the server is running; every file it is asked for fails to arrive */
    fetchMock.mockImplementation(async (url: string) => {
      if (url.endsWith('/servers/srv/')) return Response.json({ data: { status: 1 } });
      throw new TypeError('fetch failed');
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    fetchMock.mockReset();
  });

  it('answers who is on from the copy when exaroton cannot be reached', async () => {
    const res = await ask('maps/world/live/players.json');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ players: [] });
  });

  it('answers a file outside the map itself, without asking exaroton for it', async () => {
    /* the viewer's own files are in public/bluemap; a made-up name here once cost a call with the owner's key */
    for (const path of ['assets/logo.png', 'x1', 'settings.json.bak']) {
      const res = await ask(path);
      expect(res.status).toBe(404);
      expect(res.headers.get('cache-control')).toContain('s-maxage');
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('answers a map file exaroton cannot hand over from the copy or with a quiet miss, not a thrown error', async () => {
    const res = await ask('maps/world/tiles/0/x9/z9.prbm');
    expect([200, 204, 404]).toContain(res.status);
  });

  it("turns BlueMap's live event stream away quietly, without asking exaroton", async () => {
    /* the viewer polls instead either way; a 404 was an error in the console on every visit */
    const res = await ask('maps/world/live/sse');
    expect(res.status).toBe(204);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

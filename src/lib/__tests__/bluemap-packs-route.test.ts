import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { get } from '@vercel/blob';
import { GET } from '../../app/bluemap-data/[...path]/route';

vi.mock('@vercel/blob', async (original) => ({ ...(await original<typeof import('@vercel/blob')>()), get: vi.fn() }));
vi.mock('@/lib/bluemap-snapshot.json', () => ({
  default: {
    syncedAt: '2026-09-22T21:00:00.000Z',
    version: 'vpack',
    files: ['maps/world/settings.json', 'maps/world/tiles/0/x0/z0.prbm.gz'],
    blob: { base: 'https://store.private.blob.vercel-storage.com', access: 'private' },
    packs: { names: ['bluemap-data/packs/vpack-0.pack'], at: [[0, 0, 10], [0, 10, 5]] },
  },
}));

const PACK = Buffer.from('{"map":12}\x1f\x8b\x08\x00\x07');
const ask = (path: string) => GET(new Request(`https://jod.test/bluemap-data/vpack/${path}`), {
  params: Promise.resolve({ path: ['vpack', ...path.split('/')] }),
});

/* what the store answers to a range request on the pack */
function ranged(range: string, honour = true) {
  const [from, to] = range.replace('bytes=', '').split('-').map(Number);
  const body = honour ? PACK.subarray(from, to + 1) : PACK;
  return {
    statusCode: 200,
    stream: new Response(body).body!,
    headers: new Headers(honour ? { 'content-range': `bytes ${from}-${to}/${PACK.length}` } : {}),
  } as unknown as Awaited<ReturnType<typeof get>>;
}

describe('/bluemap-data, packed copy', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubEnv('BLOB_READ_WRITE_TOKEN', 'vercel_blob_rw_test');
    vi.stubEnv('EXAROTON_API_KEY', 'exaroton-test');
    vi.stubEnv('EXAROTON_SERVER_ID', 'srv');
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    fetchMock.mockReset();
    vi.mocked(get).mockReset();
  });

  it('reads each file out of its pack with a range request, byte for byte', async () => {
    vi.mocked(get).mockImplementation(async (_name, opts) => ranged((opts?.headers as Record<string, string>).range));

    const tile = await ask('maps/world/tiles/0/x0/z0.prbm.gz');
    expect(tile.status).toBe(200);
    expect(Buffer.from(await tile.arrayBuffer()).equals(PACK.subarray(10, 15))).toBe(true);
    expect(tile.headers.get('Content-Type')).toBe('application/gzip');
    expect(tile.headers.get('Content-Length')).toBe('5');
    expect(tile.headers.get('Cache-Control')).toContain('immutable');
    expect(get).toHaveBeenLastCalledWith('bluemap-data/packs/vpack-0.pack', expect.objectContaining({
      access: 'private',
      headers: { range: 'bytes=10-14' },
    }));
    /* a pack never changes, so the store's own cache may answer */
    expect(vi.mocked(get).mock.lastCall?.[1]).not.toHaveProperty('useCache');

    const settings = await ask('maps/world/settings.json');
    expect(await settings.text()).toBe('{"map":12}');
    expect(settings.headers.get('Content-Type')).toBe('application/json');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('never passes on a whole pack: a store that ignores the range is read around', async () => {
    vi.mocked(get).mockImplementation(async (_name, opts) => ranged((opts?.headers as Record<string, string>).range, false));
    fetchMock.mockResolvedValue(new Response('{"map":12}'));

    const res = await ask('maps/world/settings.json');
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('{"map":12}');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.exaroton.com/v1/servers/srv/files/data/bluemap/web/maps/world/settings.json',
      expect.anything(),
    );
  });

  it('knows a file the copy does not hold without asking the store', async () => {
    const res = await ask('maps/world/tiles/0/x9/z9.prbm.gz');
    expect(res.status).toBe(404);
    expect(get).not.toHaveBeenCalled();
  });
});

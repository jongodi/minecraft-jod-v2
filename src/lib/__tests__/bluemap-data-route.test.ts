import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { snapshot } from '@/lib/bluemap-snapshot';

/* one mock across module reloads: each test loads the route afresh, so the
   store's refusal in one test isn't remembered in the next */
const { get } = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('@vercel/blob', async (original) => ({ ...(await original<typeof import('@vercel/blob')>()), get }));
type Got = Awaited<ReturnType<typeof import('@vercel/blob').get>>;

const settings = snapshot.files.find((f) => f.endsWith('/settings.json'))!;
const ask = async (path: string) => (await import('../../app/bluemap-data/[...path]/route')).GET(
  new Request(`https://jod.test/bluemap-data/${snapshot.version}/${path}`),
  { params: Promise.resolve({ path: [snapshot.version!, ...path.split('/')] }) },
);

describe('/bluemap-data', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.resetModules();
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
    get.mockReset();
  });

  it('keeps what the store answers for a year under the current version', async () => {
    get.mockResolvedValue({
      statusCode: 200,
      stream: new Response('{}').body!,
      headers: new Headers({ 'content-type': 'application/json', 'content-length': '2', etag: '"e"' }),
    } as unknown as Got);
    const res = await ask(settings);
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toContain('immutable');
    expect(res.headers.get('Content-Type')).toBe('application/json');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('reads the file off the server when the store refuses', async () => {
    get.mockRejectedValue(new Error('Vercel Blob: Failed to fetch blob: 403 Forbidden'));
    fetchMock.mockResolvedValue(new Response('{"map":1}'));
    const res = await ask(settings);
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('{"map":1}');
    expect(res.headers.get('Content-Type')).toBe('application/json');
    /* kept for a month, and handed out even if the server fails when it is due */
    expect(res.headers.get('Cache-Control')).not.toContain('immutable');
    expect(res.headers.get('Cache-Control')).toContain('s-maxage=2592000');
    expect(res.headers.get('Cache-Control')).toContain('stale-if-error');
    expect(fetchMock).toHaveBeenCalledWith(
      `https://api.exaroton.com/v1/servers/srv/files/data/bluemap/web/${settings}`,
      expect.objectContaining({ headers: { Authorization: 'Bearer exaroton-test' } }),
    );
  });

  it('answers briefly when neither the store nor the server has it', async () => {
    get.mockRejectedValue(new Error('Vercel Blob: Failed to fetch blob: 403 Forbidden'));
    fetchMock.mockResolvedValue(new Response('not found', { status: 404 }));
    const res = await ask(settings);
    expect(res.status).toBe(404);
    expect(res.headers.get('Cache-Control')).toBe('public, max-age=60, s-maxage=120');

    fetchMock.mockResolvedValue(new Response('down', { status: 500 }));
    expect((await ask(settings)).status).toBe(502);
  });

  it('leaves a refusing store alone for a few minutes, then asks again', async () => {
    get.mockRejectedValue(new Error('Vercel Blob: Failed to fetch blob: 403 Forbidden'));
    fetchMock.mockImplementation(async () => new Response('{"map":1}'));
    const now = Date.now();
    const clock = vi.spyOn(Date, 'now').mockReturnValue(now);

    expect((await ask(settings)).status).toBe(200);
    expect((await ask(settings)).status).toBe(200);
    expect(get).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    clock.mockReturnValue(now + 6 * 60_000);
    expect((await ask(settings)).status).toBe(200);
    expect(get).toHaveBeenCalledTimes(2);
  });
});

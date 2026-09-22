import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { get } from '@vercel/blob';
import { snapshot } from '@/lib/bluemap-snapshot';
import { GET } from '../../app/bluemap-data/[...path]/route';

vi.mock('@vercel/blob', async (original) => ({ ...(await original<typeof import('@vercel/blob')>()), get: vi.fn() }));

const settings = snapshot.files.find((f) => f.endsWith('/settings.json'))!;
const ask = (path: string) => GET(new Request(`https://jod.test/bluemap-data/${snapshot.version}/${path}`), {
  params: Promise.resolve({ path: [snapshot.version!, ...path.split('/')] }),
});

describe('/bluemap-data', () => {
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

  it('keeps what the store answers for a year under the current version', async () => {
    vi.mocked(get).mockResolvedValue({
      statusCode: 200,
      stream: new Response('{}').body!,
      headers: new Headers({ 'content-type': 'application/json', 'content-length': '2', etag: '"e"' }),
    } as unknown as Awaited<ReturnType<typeof get>>);
    const res = await ask(settings);
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toContain('immutable');
    expect(res.headers.get('Content-Type')).toBe('application/json');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('reads the file off the server when the store refuses', async () => {
    vi.mocked(get).mockRejectedValue(new Error('Vercel Blob: Failed to fetch blob: 403 Forbidden'));
    fetchMock.mockResolvedValue(new Response('{"map":1}'));
    const res = await ask(settings);
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('{"map":1}');
    expect(res.headers.get('Content-Type')).toBe('application/json');
    expect(res.headers.get('Cache-Control')).not.toContain('immutable');
    expect(fetchMock).toHaveBeenCalledWith(
      `https://api.exaroton.com/v1/servers/srv/files/data/bluemap/web/${settings}`,
      expect.objectContaining({ headers: { Authorization: 'Bearer exaroton-test' } }),
    );
  });

  it('answers briefly when neither the store nor the server has it', async () => {
    vi.mocked(get).mockRejectedValue(new Error('Vercel Blob: Failed to fetch blob: 403 Forbidden'));
    fetchMock.mockResolvedValue(new Response('not found', { status: 404 }));
    const res = await ask(settings);
    expect(res.status).toBe(404);
    expect(res.headers.get('Cache-Control')).toBe('public, max-age=60, s-maxage=120');

    fetchMock.mockResolvedValue(new Response('down', { status: 500 }));
    expect((await ask(settings)).status).toBe(502);
  });
});

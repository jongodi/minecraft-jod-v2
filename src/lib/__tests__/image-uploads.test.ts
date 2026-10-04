import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

/* Prints are served from the site's own origin (a private store goes through
   /api/blob), so anything that is not a plain raster picture must never be
   stored as one, nor answered as one: an SVG can carry script. */

const stored: { pathname: string; type: string }[] = [];
let blobType = 'image/webp';

vi.mock('@/lib/crew', async (orig) => ({
  ...(await orig<typeof import('@/lib/crew')>()),
  requireOwner: vi.fn(async () => true),
}));
vi.mock('@/lib/auth', () => ({
  requireAdmin: vi.fn(async () => true),
  unauthorizedResponse: () => new Response(null, { status: 401 }),
}));
vi.mock('@/lib/gallery', () => ({ addGalleryPhoto: vi.fn(async (p: object) => p) }));
vi.mock('@/lib/map', () => ({ linkPhotoToLocation: vi.fn(async () => null) }));
vi.mock('@/lib/blob-store', async (orig) => ({
  ...(await orig<typeof import('@/lib/blob-store')>()),
  storeImage: vi.fn(async (pathname: string, _file: Blob, type: string) => { stored.push({ pathname, type }); return `/x/${pathname}`; }),
}));
vi.mock('@vercel/blob', () => ({
  get: vi.fn(async () => ({
    statusCode: 200,
    stream: new Blob(['<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>']).stream(),
    blob: { etag: '"e"', contentType: blobType, size: 72 },
  })),
}));

const { POST: crewUpload } = await import('../../app/api/crew/[username]/upload/route');
const { POST: galleryUpload } = await import('../../app/api/admin/gallery/upload/route');
const { GET: proxy } = await import('../../app/api/blob/[...path]/route');

const form = (name: string, type: string) => {
  const fd = new FormData();
  fd.append('file', new File(['<svg/>'], name, { type }));
  return fd;
};
const post = (url: string, fd: FormData) => new NextRequest(url, { method: 'POST', body: fd });

describe('server-side uploads', () => {
  beforeEach(() => { stored.length = 0; });

  it('refuse an SVG on a wall, whatever its name says', async () => {
    const res = await crewUpload(post('http://x/api/crew/stebbias/upload', form('skjamynd.png', 'image/svg+xml')), { params: Promise.resolve({ username: 'stebbias' }) });
    expect(res.status).toBe(400);
    expect(stored).toEqual([]);
  });

  it('refuse an SVG in the gallery', async () => {
    const res = await galleryUpload(post('http://x/api/admin/gallery/upload', form('mynd.svg', 'image/svg+xml')));
    expect(res.status).toBe(400);
    expect(stored).toEqual([]);
  });

  it('name a stored print by its type, not by the name it came with', async () => {
    const res = await crewUpload(post('http://x/api/crew/stebbias/upload', form('mynd.png', 'image/webp')), { params: Promise.resolve({ username: 'stebbias' }) });
    expect(res.status).toBe(201);
    expect(stored).toHaveLength(1);
    expect(stored[0].type).toBe('image/webp');
    expect(stored[0].pathname).toMatch(/\.webp$/);
  });
});

describe('/api/blob', () => {
  beforeEach(() => { vi.stubEnv('BLOB_READ_WRITE_TOKEN', 'vercel_blob_rw_ABC_secret'); });
  afterEach(() => { vi.unstubAllEnvs(); blobType = 'image/webp'; });

  const fetchBlob = () => proxy(new NextRequest('http://x/api/blob/crew/stebbias/a.png'), { params: Promise.resolve({ path: ['crew', 'stebbias', 'a.png'] }) });

  it('answers a raster print with its own type', async () => {
    const res = await fetchBlob();
    expect(res.headers.get('content-type')).toBe('image/webp');
  });

  it('never answers a stored SVG as a picture the browser would run', async () => {
    blobType = 'image/svg+xml';
    const res = await fetchBlob();
    expect(res.headers.get('content-type')).toBe('application/octet-stream');
    expect(res.headers.get('content-disposition')).toBe('attachment');
  });
});

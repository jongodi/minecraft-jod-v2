import { afterEach, describe, expect, it, vi } from 'vitest';

/* The upload module is read by every sign on the board and the walls for its
   error helpers, so the Blob client is fetched only when a picture is sent.
   The helpers still say a failure in the site's words, and a send still puts
   the client's English back into Icelandic. */
const sdk = { loaded: false, upload: vi.fn() };
vi.mock('@vercel/blob/client', () => {
  sdk.loaded = true;
  return { upload: (...args: unknown[]) => sdk.upload(...args) };
});

const { errorFrom, failure, OFFLINE, sendToBlob } = await import('@/lib/crew-upload');

afterEach(() => { sdk.upload.mockReset(); });

describe('failure', () => {
  it('says a request that never reached the site in Icelandic', () => {
    expect(failure(new TypeError('Failed to fetch'), 'x')).toBe(OFFLINE);
    expect(failure(new DOMException('The operation was aborted.', 'AbortError'), 'x')).toBe(OFFLINE);
    expect(failure(new DOMException('', 'NetworkError'), 'x')).toBe(OFFLINE);
  });

  it('keeps the site\'s own words and gives anything else the action\'s', () => {
    expect(failure(new Error('Of stór mynd.'), 'x')).toBe('Of stór mynd.');
    expect(failure(new RangeError('bad'), 'Ekki tókst að vista.')).toBe('Ekki tókst að vista.');
    expect(failure('nope', 'Ekki tókst að vista.')).toBe('Ekki tókst að vista.');
    expect(failure(new Error(''), 'Ekki tókst að vista.')).toBe('Ekki tókst að vista.');
  });
});

describe('errorFrom', () => {
  it('reads the error out of a JSON answer', async () => {
    expect(await errorFrom(new Response(JSON.stringify({ error: 'Of margar myndir.' }), { status: 400 }))).toBe('Of margar myndir.');
    expect(await errorFrom(new Response(JSON.stringify({ message: 'Lokað.' }), { status: 403 }))).toBe('Lokað.');
  });

  it('words a plain answer by its status', async () => {
    expect(await errorFrom(new Response('Request Entity Too Large', { status: 413 }))).toBe('Skráin er of stór fyrir þjóninn.');
    expect(await errorFrom(new Response('', { status: 401 }))).toBe('Innskráningin er útrunnin. Skráðu þig inn aftur.');
    expect(await errorFrom(new Response('<html>oops</html>', { status: 502 }))).toBe('Villa 502');
  });
});

describe('sendToBlob', () => {
  const send = () => sendToBlob('crew/a/b.webp', new Blob(['x']), { access: 'public', handleUploadUrl: '/api/crew/a/upload' });

  it('leaves the Blob client unfetched until a picture is sent', async () => {
    expect(sdk.loaded).toBe(false);
    sdk.upload.mockResolvedValue({ url: 'https://x.blob.vercel-storage.com/crew/a/b.webp', pathname: 'crew/a/b.webp' });
    await expect(send()).resolves.toMatchObject({ pathname: 'crew/a/b.webp' });
    expect(sdk.loaded).toBe(true);
    expect(sdk.upload).toHaveBeenCalledWith('crew/a/b.webp', expect.any(Blob), expect.objectContaining({ handleUploadUrl: '/api/crew/a/upload' }));
  });

  it('puts the client\'s English back into Icelandic', async () => {
    sdk.upload.mockRejectedValueOnce(new Error('Vercel Blob: Failed to retrieve the client token'));
    await expect(send()).rejects.toThrow('Geymslan tók ekki við myndinni; innskráningin gæti verið útrunnin. Endurhlaðaðu síðuna og reyndu aftur.');
    sdk.upload.mockRejectedValueOnce(new Error('Vercel Blob: The request was aborted'));
    await expect(send()).rejects.toThrow('Ekki tókst að senda myndina í geymsluna. Reyndu aftur.');
  });

  it('passes any other failure on as it came, for failure() to word', async () => {
    const offline = new TypeError('Failed to fetch');
    sdk.upload.mockRejectedValueOnce(offline);
    await expect(send()).rejects.toBe(offline);
  });

  it('says a client that cannot be fetched as a network failure', async () => {
    vi.resetModules();
    vi.doMock('@vercel/blob/client', () => { throw new Error('Failed to load chunk /_next/static/chunks/x.js'); });
    const fresh = await import('@/lib/crew-upload');
    const e = await fresh.sendToBlob('crew/a/b.webp', new Blob(['x']), { access: 'public', handleUploadUrl: '/x' }).catch((err: unknown) => err);
    expect(fresh.failure(e, 'x')).toBe(OFFLINE);
    vi.doUnmock('@vercel/blob/client');
  });
});

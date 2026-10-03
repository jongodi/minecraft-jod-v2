import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/* Redis, in memory: strings and lists, as the addresses and the sign-in links use them */
const kv = new Map<string, string>();
const lists = new Map<string, string[]>();
vi.mock('@/lib/redis', () => {
  const redis = {
    get: async (k: string) => kv.get(k) ?? null,
    mget: async (...ks: string[]) => ks.map(k => kv.get(k) ?? null),
    set: async (k: string, v: string) => { kv.set(k, v); return 'OK'; },
    del: async (k: string) => (kv.delete(k) ? 1 : 0),
    lrange: async (k: string) => lists.get(k) ?? [],
    multi: () => {
      const chain = {
        rpush: (k: string, v: string) => { lists.set(k, [...(lists.get(k) ?? []), v]); return chain; },
        expire: () => chain,
        exec: async () => [],
      };
      return chain;
    },
  };
  return {
    getRedis: () => redis,
    rGet: async (k: string) => { const raw = kv.get(k); return raw ? JSON.parse(raw) : null; },
  };
});

const { getEmail, setEmail, nightReaders, mailSignInLink } = await import('@/lib/crew-email');
const { listInvites } = await import('@/lib/crew-access');

describe('a member’s address', () => {
  beforeEach(() => { kv.clear(); lists.clear(); vi.stubEnv('REDIS_URL', 'redis://test'); });
  afterEach(() => vi.unstubAllEnvs());

  it('is kept apart from the wall, trimmed and in lower case, under any spelling of the name', async () => {
    await setEmail('JOENANA', { address: '  Jo@Dæmi.IS ', nights: true });
    expect(kv.has('crew:email:joenana')).toBe(true);
    expect(await getEmail('joenana')).toEqual({ address: 'jo@dæmi.is', nights: true });
    await setEmail('joenana', null);
    expect(await getEmail('joenana')).toBeNull();
  });

  it('gets word of the nights unless it was turned off', async () => {
    await setEmail('joenana', { address: 'jo@dæmi.is', nights: true });
    await setEmail('AmmaGaur', { address: 'amma@dæmi.is', nights: false });
    await setEmail('stebbias', { address: 'stebbi@dæmi.is', nights: true });
    expect((await nightReaders()).map(r => r.username)).toEqual(['stebbias', 'joenana']);
    expect((await nightReaders(['STEBBIAS'])).map(r => r.username)).toEqual(['joenana']);
  });
});

describe('a sign-in link by post', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    kv.clear(); lists.clear();
    vi.stubEnv('REDIS_URL', 'redis://test');
    vi.stubEnv('RESEND_API_KEY', 're_test');
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => { fetchMock.mockReset(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

  it('makes no link for a member without an address', async () => {
    expect(await mailSignInLink('joenana', 'https://jod.test')).toMatchObject({ sent: false, reason: expect.stringMatching(/netfang/) });
    expect(await listInvites('joenana')).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('mails a fresh link that opens the member’s way in', async () => {
    await setEmail('joenana', { address: 'jo@dæmi.is', nights: true });
    fetchMock.mockResolvedValueOnce(new Response('{"id":"e1"}', { status: 200 }));
    const res = await mailSignInLink('joenana', 'https://jod.test/');
    if (!res.sent) throw new Error(res.reason);
    expect(res.to).toBe('jo@dæmi.is');
    expect(res.url).toBe(`https://jod.test/api/crew/invite?lykill=${res.invite.key}`);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.to).toEqual(['jo@dæmi.is']);
    expect(body.text).toContain(res.url);
    expect((await listInvites('joenana')).map(i => i.key)).toEqual([res.invite.key]);
  });

  it('shuts the link at once when the letter does not go', async () => {
    await setEmail('joenana', { address: 'jo@dæmi.is', nights: true });
    vi.spyOn(console, 'error').mockImplementation(() => {});
    fetchMock.mockResolvedValueOnce(new Response('{"message":"down"}', { status: 500 }));
    expect(await mailSignInLink('joenana', 'https://jod.test')).toMatchObject({ sent: false });
    expect(await listInvites('joenana')).toEqual([]);
  });
});

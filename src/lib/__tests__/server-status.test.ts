import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/exaroton', () => ({
  getExarotonServerId: async () => 'srv',
  getServerHost: () => 'jod.exaroton.me',
}));

const { lifeOf, isChanging } = await import('@/lib/server-state');
const { getStatus, forgetStatus, keepFor } = await import('@/lib/server-status');

describe("the server's state", () => {
  it("reads Exaroton's codes into words", () => {
    expect(lifeOf(1)).toBe('on');
    expect(lifeOf(0)).toBe('off');
    expect(lifeOf(2)).toBe('starting');
    expect(lifeOf(6)).toBe('starting');
    expect(lifeOf(10)).toBe('starting');
    expect(lifeOf(3)).toBe('stopping');
    expect(lifeOf(5)).toBe('stopping');
    expect(lifeOf(4)).toBe('restarting');
    expect(lifeOf(7)).toBe('crashed');
    expect(lifeOf(99)).toBe('unknown');
  });

  it('knows which states are on their way somewhere', () => {
    expect(isChanging('starting')).toBe(true);
    expect(isChanging('stopping')).toBe(true);
    expect(isChanging('restarting')).toBe(true);
    expect(isChanging('on')).toBe(false);
    expect(isChanging('off')).toBe(false);
    expect(isChanging(null)).toBe(false);
  });
});

describe('the status lookup', () => {
  const fetchMock = vi.fn();
  const exaroton = (status: number, players?: string[]) => ({
    ok: true,
    json: async () => ({ data: {
      id: 'srv', address: 'jod.exaroton.me', status,
      players: players ? { count: players.length, max: 8, list: players } : undefined,
      software: { id: 'paper', name: 'Paper', version: '26.1' },
    } }),
  });

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    vi.stubEnv('EXAROTON_API_KEY', 'key');
    fetchMock.mockReset();
    forgetStatus();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('says a starting server is on its way up, and keeps that answer for ten seconds', async () => {
    fetchMock.mockResolvedValueOnce(exaroton(2));
    const body = await getStatus();
    expect(body).toMatchObject({ online: false, life: 'starting', source: 'exaroton', version: '26.1' });
    expect(body.players).toBeUndefined();
    expect(keepFor(body)).toBe(10_000);
    /* the answer is shared: a second question costs no second call */
    await getStatus();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('is asked afresh once the site has started the server', async () => {
    fetchMock.mockResolvedValueOnce(exaroton(0)).mockResolvedValueOnce(exaroton(2));
    expect((await getStatus()).life).toBe('off');
    forgetStatus();
    expect((await getStatus()).life).toBe('starting');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('lists who is in when the server is up, and keeps that half a minute', async () => {
    fetchMock.mockResolvedValueOnce(exaroton(1, ['stebbias', 'joenana']));
    const body = await getStatus();
    expect(body).toMatchObject({ online: true, life: 'on', players: { online: 2, max: 8, list: [{ name: 'stebbias', uuid: '' }, { name: 'joenana', uuid: '' }] } });
    expect(keepFor(body)).toBe(30_000);
  });

  it("asks the upstream itself for the status route, and lets the page's render use the data cache", async () => {
    fetchMock.mockResolvedValue(exaroton(0));
    await getStatus({ live: false });
    /* on the page's own half-minute beat: a shorter keep here has the page drawn again that much more often */
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ next: { revalidate: 30 } });
    /* the page's answer may be the data cache's, however old: the route asks again, live */
    await getStatus();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][1]).toMatchObject({ cache: 'no-store' });
    /* and a live answer serves the page's next render */
    await getStatus({ live: false });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('says it could not reach anything when both lookups fail, and asks again soon', async () => {
    fetchMock.mockRejectedValueOnce(new Error('down')).mockRejectedValueOnce(new Error('down'));
    const body = await getStatus();
    expect(body).toEqual({ online: false, life: 'unknown', source: 'error' });
    expect(keepFor(body)).toBe(5_000);
  });
});

describe('when the server last burned', () => {
  const kv = new Map<string, string>();
  /* status:seen, as src/lib/crew-seen.ts writes it */
  const seen = new Map<string, string>();
  const fetchMock = vi.fn();
  const exaroton = (status: number, players?: string[]) => ({
    ok: true,
    json: async () => ({ data: { id: 'srv', address: 'jod.exaroton.me', status, players: players ? { count: players.length, max: 8, list: players } : undefined } }),
  });

  beforeEach(() => {
    vi.doMock('@/lib/redis', () => ({
      rGet: async (k: string) => { const v = kv.get(k); return v ? JSON.parse(v) : null; },
      rSet: async (k: string, v: unknown) => { kv.set(k, JSON.stringify(v)); },
      rDel: async (k: string) => { kv.delete(k); },
      getRedis: () => ({ hset: async (_k: string, fields: Record<string, string>) => { for (const [a, b] of Object.entries(fields)) seen.set(a, b); return 1; } }),
    }));
    vi.stubGlobal('fetch', fetchMock);
    vi.stubEnv('EXAROTON_API_KEY', 'key');
    vi.stubEnv('REDIS_URL', 'redis://test');
    vi.useFakeTimers();
    fetchMock.mockReset();
    kv.clear();
    seen.clear();
    forgetStatus();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.doUnmock('@/lib/redis');
  });

  it('is noted while it burns, with the crew who were in, and said once it is dark', async () => {
    vi.setSystemTime(new Date('2026-10-02T21:40:00Z'));
    fetchMock.mockResolvedValueOnce(exaroton(1, ['stebbias', 'someone-else', 'joenana']));
    const lit = await getStatus();
    expect(lit.lastOnline).toBeUndefined();
    expect(JSON.parse(kv.get('status:last-online')!)).toEqual({ at: '2026-10-02T21:40:00.000Z', names: ['stebbias', 'joenana'] });
    /* and each of the crew in as last seen now, the stranger not */
    expect(Object.fromEntries(seen)).toEqual({ stebbias: '2026-10-02T21:40:00.000Z', joenana: '2026-10-02T21:40:00.000Z' });

    /* half a minute on, the server has gone out: the answer before says when */
    vi.setSystemTime(new Date('2026-10-02T21:40:31Z'));
    fetchMock.mockResolvedValueOnce(exaroton(0));
    const dark = await getStatus();
    expect(dark.life).toBe('off');
    expect(dark.lastOnline).toEqual({ at: '2026-10-02T21:40:00.000Z', names: ['stebbias', 'joenana'] });
  });

  it("is not written over by an instance whose last answer is hours old", async () => {
    /* this instance saw it burn at eight, then sat idle while another saw it burn till eleven */
    vi.setSystemTime(new Date('2026-10-02T20:00:00Z'));
    fetchMock.mockResolvedValueOnce(exaroton(1, ['stebbias']));
    await getStatus();
    kv.set('status:last-online', JSON.stringify({ at: '2026-10-02T23:00:00.000Z', names: ['joenana'] }));
    kv.set('status:last-life', JSON.stringify({ life: 'on', at: '2026-10-02T23:00:00.000Z', names: ['joenana'] }));
    vi.setSystemTime(new Date('2026-10-02T23:30:00Z'));
    fetchMock.mockResolvedValueOnce(exaroton(0));
    expect((await getStatus()).lastOnline).toEqual({ at: '2026-10-02T23:00:00.000Z', names: ['joenana'] });
    expect(JSON.parse(kv.get('status:last-online')!)).toEqual({ at: '2026-10-02T23:00:00.000Z', names: ['joenana'] });
  });

  it("is never noted from a page render's answer, which may be the data cache's", async () => {
    vi.setSystemTime(new Date('2026-10-02T21:40:00Z'));
    fetchMock.mockResolvedValueOnce(exaroton(1, ['stebbias']));
    await getStatus({ live: false });
    expect(kv.has('status:last-online')).toBe(false);
    expect(kv.has('status:last-life')).toBe(false);
  });

  /* An instance's memory of its own answer before saw the server go out only
     within a minute, and a visitor polls a minute apart: the time it was lit
     stayed in the store, and was said again of a later evening. */
  const answer = async (at: string, status: number, players?: string[]) => {
    vi.setSystemTime(new Date(at));
    fetchMock.mockResolvedValueOnce(exaroton(status, players));
    return getStatus();
  };

  it('says when it was lit, stops when it goes out between polls a minute apart, and never says an evening days before', async () => {
    /* a visitor watches it start, polling a minute and a second apart */
    expect((await answer('2026-11-04T19:58:58Z', 2)).onSince).toBeUndefined();
    expect((await answer('2026-11-04T19:59:59Z', 1, ['stebbias'])).onSince).toBe('2026-11-04T19:59:59.000Z');
    expect((await answer('2026-11-04T20:01:00Z', 1, ['stebbias'])).onSince).toBe('2026-11-04T19:59:59.000Z');
    /* it goes out between two of the polls: the last answer that saw it burning says when, and who was in */
    const dark = await answer('2026-11-04T20:02:01Z', 0);
    expect(dark.lastOnline).toEqual({ at: '2026-11-04T20:01:00.000Z', names: ['stebbias'] });
    expect(kv.has('status:on-since')).toBe(false);
    /* two days on it is started from exaroton's own app, unwatched, and another instance answers the first visitor */
    forgetStatus();
    expect((await answer('2026-11-06T20:06:18Z', 1, ['joenana'])).onSince).toBeUndefined();
  });

  it('is seen to go out by the five-minute job when nobody is watching', async () => {
    await answer('2026-11-04T19:59:00Z', 2);
    await answer('2026-11-04T20:00:00Z', 1, ['AmmaGaur']);
    expect(JSON.parse(kv.get('status:on-since')!)).toBe('2026-11-04T20:00:00.000Z');
    /* the job's beat five minutes on finds it dark: stopped when empty, with nobody looking */
    forgetStatus();
    const dark = await answer('2026-11-04T20:05:00Z', 0);
    expect(dark.lastOnline).toEqual({ at: '2026-11-04T20:00:00.000Z', names: ['AmmaGaur'] });
    expect(kv.has('status:on-since')).toBe(false);
  });

  it('keeps when it was lit across instances while their answers come near each other', async () => {
    kv.set('status:on-since', JSON.stringify('2026-11-04T20:00:00.000Z'));
    kv.set('status:last-life', JSON.stringify({ life: 'on', at: '2026-11-04T20:03:00.000Z', names: [] }));
    expect((await answer('2026-11-04T20:07:30Z', 1, [])).onSince).toBe('2026-11-04T20:00:00.000Z');
  });

  it('says no time it was lit after a gap nobody asked across, rather than an old one', async () => {
    kv.set('status:on-since', JSON.stringify('2026-11-01T20:00:00.000Z'));
    kv.set('status:last-life', JSON.stringify({ life: 'on', at: '2026-11-01T22:00:00.000Z', names: [] }));
    expect((await answer('2026-11-01T22:30:00Z', 1, [])).onSince).toBeUndefined();
    expect(kv.has('status:on-since')).toBe(false);
  });

  it('is not changed by a lookup that failed', async () => {
    kv.set('status:on-since', JSON.stringify('2026-11-04T20:00:00.000Z'));
    kv.set('status:last-life', JSON.stringify({ life: 'on', at: '2026-11-04T20:03:00.000Z', names: [] }));
    vi.setSystemTime(new Date('2026-11-04T20:04:00Z'));
    fetchMock.mockRejectedValueOnce(new Error('down')).mockRejectedValueOnce(new Error('down'));
    expect((await getStatus()).source).toBe('error');
    expect(JSON.parse(kv.get('status:on-since')!)).toBe('2026-11-04T20:00:00.000Z');
    expect(JSON.parse(kv.get('status:last-life')!).at).toBe('2026-11-04T20:03:00.000Z');
  });

  it('is read from the store by an instance that never saw it burn', async () => {
    kv.set('status:last-online', JSON.stringify({ at: '2026-09-30T20:15:00.000Z', names: ['AmmaGaur'] }));
    fetchMock.mockResolvedValueOnce(exaroton(0));
    expect((await getStatus()).lastOnline).toEqual({ at: '2026-09-30T20:15:00.000Z', names: ['AmmaGaur'] });
  });

  it('does not say when for a server that is only on its way up', async () => {
    kv.set('status:last-online', JSON.stringify({ at: '2026-09-30T20:15:00.000Z', names: [] }));
    fetchMock.mockResolvedValueOnce(exaroton(2));
    const body = await getStatus();
    expect(body.life).toBe('starting');
    /* it is carried along; the lantern decides it is only said for a dark one */
    expect(body.lastOnline).toEqual({ at: '2026-09-30T20:15:00.000Z', names: [] });
  });
});

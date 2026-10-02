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

  it('says it could not reach anything when both lookups fail, and asks again soon', async () => {
    fetchMock.mockRejectedValueOnce(new Error('down')).mockRejectedValueOnce(new Error('down'));
    const body = await getStatus();
    expect(body).toEqual({ online: false, life: 'unknown', source: 'error' });
    expect(keepFor(body)).toBe(5_000);
  });
});

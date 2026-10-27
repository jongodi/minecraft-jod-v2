import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/* Redis, in memory: the hour each writer may mail a member once */
const kv = new Map<string, string>();
vi.mock('@/lib/redis', () => ({
  getRedis: () => ({
    set: async (k: string, v: string, ...opts: string[]) => {
      if (opts.includes('NX') && kv.has(k)) return null;
      kv.set(k, v);
      return 'OK';
    },
    del: async (...keys: string[]) => keys.filter(k => kv.delete(k)).length,
  }),
}));
vi.mock('@/lib/crew-email', () => ({
  mentionReaders: async (names: string[]) => names.map(n => ({ username: n, address: `${n}@dæmi.is` })),
  getNames: async () => ({}),
}));
vi.mock('@/lib/email-settings', async () => { const { DEFAULT_THEMES } = await import('@/lib/email-design'); return { readThemes: async () => DEFAULT_THEMES }; });
const sendEmails = vi.fn();
vi.mock('@/lib/email', () => ({ canSendEmail: () => true, siteUrl: () => 'https://jodcraft.world', sendEmails: (...a: unknown[]) => sendEmails(...a) }));

const { mailMentions } = await import('@/lib/mention-mail');
const note = { by: 'stebbias', owner: 'stebbias', entryId: 'e1', text: 'Hver kemur, @joenana og @AmmaGaur?', reply: false };

describe('letters to those called by name', () => {
  beforeEach(() => { kv.clear(); vi.stubEnv('REDIS_URL', 'redis://test'); });
  afterEach(() => { sendEmails.mockReset(); vi.unstubAllEnvs(); vi.restoreAllMocks(); });

  it('tells each one named once an hour from the same writer', async () => {
    sendEmails.mockResolvedValue({ sent: true });
    expect(await mailMentions(note)).toBe(2);
    expect(await mailMentions({ ...note, entryId: 'e2' })).toBe(0);
    expect(sendEmails).toHaveBeenCalledTimes(1);
  });

  it('lets the hour go when the letter did not go, so the next mention tells them', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    sendEmails.mockResolvedValueOnce({ sent: false, reason: 'down' }).mockResolvedValue({ sent: true });
    expect(await mailMentions(note)).toBe(0);
    expect(await mailMentions({ ...note, entryId: 'e2' })).toBe(2);
  });
});

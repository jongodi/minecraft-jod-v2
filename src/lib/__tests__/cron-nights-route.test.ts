import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

/* The five-minute job takes the status beat too: who came to a fire and each
   member's "síðast inni" were noted only while someone had a page open, and
   the crew plays with the site closed. */
const calls: string[] = [];
let lookup: () => Promise<{ online: boolean; life: string; source: string }> = async () => ({ online: true, life: 'on', source: 'exaroton' });
vi.mock('@/lib/server-status', () => ({
  getStatus: () => { calls.push('status'); return lookup(); },
  noteCrewSeen: async (body: { life: string }) => { calls.push(`seen:${body.life}`); },
}));
vi.mock('@/lib/server-news', () => ({ noteServerVersion: async () => { calls.push('version'); } }));
vi.mock('@/lib/night-mail', () => ({ mailNights: async () => { calls.push('mail'); return ['n1']; } }));

const { GET } = await import('@/app/api/cron/nights/route');
const SECRET = 'a-secret-long-enough-for-tests';
const run = (auth = `Bearer ${SECRET}`) => GET(new NextRequest('https://jod.test/api/cron/nights', { headers: { authorization: auth } }));

describe('the five-minute job', () => {
  beforeEach(() => {
    calls.length = 0;
    lookup = async () => ({ online: true, life: 'on', source: 'exaroton' });
    vi.stubEnv('CRON_SECRET', SECRET);
    vi.stubEnv('REDIS_URL', 'redis://test');
    vi.stubEnv('RESEND_API_KEY', 're_test');
  });
  afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });

  it('asks the status and notes who is in, then sends the letters', async () => {
    const res = await run();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: 'on', mailed: ['n1'] });
    expect(calls).toEqual(['status', 'seen:on', 'version', 'mail']);
  });

  it('takes the beat even when no letters can go', async () => {
    vi.stubEnv('RESEND_API_KEY', '');
    const res = await run();
    expect(await res.json()).toMatchObject({ status: 'on', mailed: [], skipped: 'RESEND_API_KEY is not set' });
    expect(calls).toEqual(['status', 'seen:on', 'version']);
  });

  it('sends the letters though the status could not be asked', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    lookup = async () => { throw new Error('down'); };
    const res = await run();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: null, mailed: ['n1'] });
    expect(calls).toEqual(['status', 'mail']);
  });

  it('does nothing for a caller without the secret', async () => {
    expect((await run('Bearer wrong-secret-of-the-same-size')).status).toBe(401);
    expect(calls).toEqual([]);
  });
});

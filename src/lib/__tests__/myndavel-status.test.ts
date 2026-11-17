import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { createHmac } from 'crypto';

/* Framköllun's word on how it is doing: signed like a photo, kept in the shape
   the admin panel reads, and nothing it did not say is made up. */
const store = new Map<string, string>();
vi.mock('@/lib/redis', () => ({
  rGet: async (k: string) => { const v = store.get(k); return v ? JSON.parse(v) : null; },
  rSet: async (k: string, v: unknown) => { store.set(k, JSON.stringify(v)); },
}));
let admin = true;
vi.mock('@/lib/auth', async (orig) => ({ ...(await orig<typeof import('@/lib/auth')>()), requireAdmin: async () => admin }));

process.env.REDIS_URL = 'redis://test';
process.env.MYNDAVEL_INGEST_SECRET = 'leyndo';
const { POST: tell } = await import('../../app/api/myndavel/status/route');
const { GET: look } = await import('../../app/api/admin/myndavel/route');
const { normalizeStatus } = await import('@/lib/myndavel-status');
afterAll(() => { delete process.env.REDIS_URL; delete process.env.MYNDAVEL_INGEST_SECRET; });

function post(body: unknown, { secret = 'leyndo', time = Math.floor(Date.now() / 1000) } = {}) {
  const text = JSON.stringify(body);
  const sig = `sha256=${createHmac('sha256', secret).update(`${time}.${text}`).digest('hex')}`;
  return new NextRequest('https://jod.test/api/myndavel/status', {
    method: 'POST', body: text,
    headers: { 'content-type': 'application/json', 'x-myndavel-time': String(time), 'x-myndavel-signature': sig },
  });
}
const health = {
  ok: false, trouble: 'the queue on the server cannot be read', troubleCode: 'blind', developing: null, queued: 2, outbox: 1, failed: 3, skipped: 1,
  console: true, oldestWaitingMin: 42, lastDevelopMs: 9300, lastError: { at: '2026-11-17T12:00:00.000Z', what: 'queue: 403' },
  lastPoll: { at: '2026-11-17T12:00:00.000Z', ok: false },
};

beforeEach(() => { store.clear(); admin = true; delete process.env.EXAROTON_API_KEY; });

describe('Framköllun\'s status', () => {
  it('is kept as it was said, and shown to the admin', async () => {
    expect((await tell(post(health))).status).toBe(200);
    const view = await (await look()).json();
    expect(view.connected).toBe(true);
    expect(view.waiting).toBeNull();
    expect(view.status).toMatchObject({ ok: false, trouble: health.trouble, troubleCode: 'blind', queued: 2, outbox: 1, failed: 3, skipped: 1, console: true, oldestWaitingMin: 42, lastDevelopMs: 9300, lastError: health.lastError });
    expect(Date.now() - Date.parse(view.status.at)).toBeLessThan(5000);
  });

  it('is taken from nobody without the secret', async () => {
    expect((await tell(post(health, { secret: 'annad' }))).status).toBe(401);
    expect((await tell(post(health, { time: Math.floor(Date.now() / 1000) - 3600 }))).status).toBe(401);
    expect(store.size).toBe(0);
  });

  it('is shown to nobody but the admin', async () => {
    admin = false;
    expect((await look()).status).toBe(401);
  });

  it('makes nothing of what was not said, or said wrong', () => {
    const s = normalizeStatus({ ok: 'yes', queued: -4, outbox: 'margar', failed: 2.9, lastError: { what: 'x' }, trouble: '  ', lastDevelopMs: Number.NaN }, 0);
    expect(s).toEqual({
      at: '1970-01-01T00:00:00.000Z', ok: false, trouble: null, troubleCode: null, developing: null, queued: 0, outbox: 0, failed: 2, skipped: 0,
      console: false, oldestWaitingMin: 0, lastDevelopMs: null, lastError: null,
    });
    expect(normalizeStatus(null, 0).ok).toBe(false);
    expect(normalizeStatus({ troubleCode: 'annað' }, 0).troubleCode).toBeNull();
    expect(normalizeStatus({ trouble: 'x'.repeat(999) }, 0).trouble).toHaveLength(200);
  });

  it('counts the photos waiting on the game server with the site\'s own key', async () => {
    process.env.EXAROTON_API_KEY = 'k';
    process.env.EXAROTON_SERVER_ID = 'srv';
    const fetched: string[] = [];
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      fetched.push(url);
      return { ok: true, status: 200, json: async () => ({ data: { children: [{ name: 'a.mynd' }, { name: 'b.mynd' }, { name: 'c.mynd.tmp' }] } }) };
    }));
    const view = await (await look()).json();
    vi.unstubAllGlobals();
    delete process.env.EXAROTON_SERVER_ID;
    expect(view.waiting).toBe(2);
    expect(fetched[0]).toContain('/servers/srv/files/info/plugins/JOD-Myndavel/framkollun');
  });
});

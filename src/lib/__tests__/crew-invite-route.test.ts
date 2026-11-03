import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

/* A sign-in link opened spends nothing: mail scanners and chat previews open
   links to look at them. The member's own press on the slip spends the use. */
const invites = new Map<string, { username: string; uses: number; max: number }>();
const sessions: string[] = [];
vi.mock('@/lib/crew', () => ({
  peekInvite: async (key: string) => { const i = invites.get(key); return i && i.uses < i.max ? i.username : null; },
  consumeInvite: async (key: string) => { const i = invites.get(key); if (!i || i.uses >= i.max) return null; i.uses += 1; return i.username; },
  createCrewSession: async (name: string) => { sessions.push(name); return `session-${sessions.length}`; },
  canonicalUsername: (n: string) => n,
  isCrewUsername: () => true,
  CREW_COOKIE: 'jod_crew_session',
  SESSION_TTL: 60,
}));
vi.mock('@/lib/crew-email', () => ({ mailSignInLink: async () => ({ sent: false, reason: 'test' }) }));
vi.mock('@/lib/email', () => ({ canSendEmail: () => false, siteUrl: () => 'https://jod.test' }));

const { GET, POST } = await import('@/app/api/crew/invite/route');

const open = (key: string) => GET(new NextRequest(`http://jod.test/api/crew/invite?lykill=${key}`, { headers: { 'x-forwarded-for': '85.220.1.9' } }) as never);
const press = (key: string) => POST(new NextRequest('http://jod.test/api/crew/invite', {
  method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': '85.220.1.9' }, body: JSON.stringify({ lykill: key }),
}) as never);

describe('a sign-in link', () => {
  beforeEach(() => { invites.clear(); sessions.length = 0; invites.set('key-for-joenana-00000000', { username: 'joenana', uses: 0, max: 1 }); });

  it('opened, spends nothing and shows the member their slip', async () => {
    const res = await open('key-for-joenana-00000000');
    expect(res.status).toBe(307);
    const to = new URL(res.headers.get('location')!);
    expect(to.pathname).toBe('/crew');
    expect(to.searchParams.get('lykill')).toBe('key-for-joenana-00000000');
    expect(to.searchParams.get('felagi')).toBe('joenana');
    expect(invites.get('key-for-joenana-00000000')!.uses).toBe(0);
    expect(sessions).toEqual([]);
    expect(res.headers.get('set-cookie')).toBeNull();
  });

  it('pressed, spends the use and signs the browser in', async () => {
    const res = await press('key-for-joenana-00000000');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, username: 'joenana', next: '/crew/joenana?innskrad=1' });
    expect(res.headers.get('set-cookie')).toMatch(/jod_crew_session=session-1/);
    expect(invites.get('key-for-joenana-00000000')!.uses).toBe(1);
  });

  it('spent or unknown, says so on the roll call and to a press', async () => {
    await press('key-for-joenana-00000000');
    const again = await open('key-for-joenana-00000000');
    expect(new URL(again.headers.get('location')!).searchParams.get('lykill')).toBe('utrunninn');
    expect((await press('key-for-joenana-00000000')).status).toBe(410);
    expect((await press('no-such-key')).status).toBe(410);
  });
});

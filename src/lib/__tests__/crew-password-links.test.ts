import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

/* A new password signs out whoever else got in on an old link, and the admin
   clearing a lost one signs out every device. The link itself stayed open,
   with its uses and its week, so whoever was signed out pressed it again and
   was back in for a year. The links are the real ones (kept in memory without
   a store); only the password file and the sessions are stood in for. */
vi.mock('@/lib/crew-access', async (actual) => ({
  ...(await actual<typeof import('@/lib/crew-access')>()),
  /* without a store the real one writes the password file in the repository */
  setPasswordHash: async () => {},
}));
const revoked: string[] = [];
let sessions = 0;
vi.mock('@/lib/crew', async () => {
  const access = await import('@/lib/crew-access');
  return {
    createInvite: access.createInvite, consumeInvite: access.consumeInvite, peekInvite: access.peekInvite,
    closeInvite: access.closeInvite, closeInvitesOf: access.closeInvitesOf, listInvites: access.listInvites, inviteUrl: access.inviteUrl,
    requireOwner: async (u: string) => ({ username: u }),
    currentSessionId: async () => 'this-device',
    revokeCrewSessions: async (u: string) => { revoked.push(u); return 1; },
    createCrewSession: async () => `session-${++sessions}`,
    isCrewUsername: () => true,
    canonicalUsername: (n: string) => n,
    readAllProfiles: async () => [], allPhotos: () => [], getCrewToken: () => undefined,
    CREW_COOKIE: 'jod_crew_session', SESSION_TTL: 60,
  };
});
vi.mock('@/lib/auth', () => ({ requireAdmin: async () => true, unauthorizedResponse: () => new Response(null, { status: 401 }) }));
vi.mock('@/lib/crew-email', () => ({ mailSignInLink: async () => ({ sent: false, reason: 'test' }), getEmail: async () => null, getNames: async () => ({}), updateContact: async () => null }));
vi.mock('@/lib/email', () => ({ canSendEmail: () => false, siteUrl: () => 'https://jod.test' }));

const { createInvite, listInvites } = await import('@/lib/crew-access');
const password = await import('@/app/api/crew/[username]/password/route');
const invite = await import('@/app/api/crew/invite/route');
const admin = await import('@/app/api/admin/crew/route');

const params = (username: string) => ({ params: Promise.resolve({ username }) });
const json = (url: string, method: string, body: unknown) =>
  new NextRequest(url, { method, headers: { 'content-type': 'application/json', 'x-forwarded-for': '85.220.1.9' }, body: JSON.stringify(body) });
const press = (key: string) => invite.POST(json('https://jod.test/api/crew/invite', 'POST', { lykill: key }));

describe('a member’s open sign-in links', () => {
  beforeEach(() => { revoked.length = 0; });

  it('are shut when the member chooses a password, so an earlier link answers that it is spent', async () => {
    const link = await createInvite('stebbias', 5);
    /* a sibling on the family computer signs in with it */
    expect((await press(link.key)).status).toBe(200);
    const res = await password.PUT(json('https://jod.test/api/crew/stebbias/password', 'PUT', { password: 'kastali-42' }), params('stebbias'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, hasPassword: true, signedOut: 1, linksClosed: 1 });
    expect(revoked).toEqual(['stebbias']);
    /* signed out, the sibling presses the same link again */
    expect((await press(link.key)).status).toBe(410);
    expect(await listInvites('stebbias')).toEqual([]);
  });

  it('are shut when the member takes their password away', async () => {
    const link = await createInvite('joenana', 5);
    const res = await password.DELETE(json('https://jod.test/api/crew/joenana/password', 'DELETE', {}), params('joenana'));
    expect(await res.json()).toMatchObject({ hasPassword: false, linksClosed: 1 });
    expect((await press(link.key)).status).toBe(410);
  });

  it('are shut when the admin clears a lost password, and a link made after it works', async () => {
    const first = await createInvite('AmmaGaur', 5);
    const second = await createInvite('AmmaGaur', 2);
    const other = await createInvite('Gamla123', 5);
    const res = await admin.DELETE(json('https://jod.test/api/admin/crew', 'DELETE', { username: 'AmmaGaur', password: null }));
    expect(await res.json()).toEqual({ ok: true, signedOut: 1, linksClosed: 2 });
    expect((await press(first.key)).status).toBe(410);
    expect((await press(second.key)).status).toBe(410);
    /* only that member's links */
    expect((await press(other.key)).status).toBe(200);
    /* the panel makes the new link once the clear has answered */
    const made = await admin.POST(json('https://jod.test/api/admin/crew', 'POST', { username: 'AmmaGaur' }));
    const key = new URL((await made.json()).url).searchParams.get('lykill')!;
    expect((await press(key)).status).toBe(200);
  });
});

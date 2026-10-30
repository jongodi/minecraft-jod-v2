import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

/* Sign-in tries are counted per address and per account tried. Counted per
   address alone, one member's own sign-in wiped the count of guesses made at
   another member's password from the same address, so four guesses and a
   sign-in could go round for ever. */
const counts = new Map<string, number>();
vi.mock('@/lib/redis', () => ({
  getRedis: () => ({
    incr: async (k: string) => { const n = (counts.get(k) ?? 0) + 1; counts.set(k, n); return n; },
    ttl: async () => 900,
    expire: async () => 1,
    del: async (k: string) => { counts.delete(k); return 1; },
  }),
}));
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => undefined }) }));
vi.mock('@/lib/crew', async () => {
  const types = await vi.importActual<typeof import('@/lib/crew-types')>('@/lib/crew-types');
  return {
    isCrewUsername: types.isCrewUsername,
    canonicalUsername: types.canonicalUsername,
    getCrewToken: (name: string) => ({ stebbias: 'right-a', joenana: 'right-b' } as Record<string, string>)[name.toLowerCase()],
    createCrewSession: async () => 'session',
    deleteCrewSession: async () => {},
    CREW_COOKIE: 'crew',
    SESSION_TTL: 60,
  };
});
vi.mock('@/lib/crew-access', () => ({ getPasswordHash: async () => null, verifyPassword: async () => false }));

process.env.REDIS_URL = 'redis://test';
const { POST } = await import('@/app/api/crew/auth/route');
afterAll(() => { delete process.env.REDIS_URL; });
beforeEach(() => { counts.clear(); });

const signIn = (username: string, token: string) => POST(new Request('http://x/api/crew/auth', {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'x-forwarded-for': '85.220.1.9' },
  body: JSON.stringify({ username, token }),
}) as never);

describe('signing in, counted per account', () => {
  it('a sign-in of your own does not forget the guesses at someone else', async () => {
    for (let i = 0; i < 4; i++) expect((await signIn('joenana', 'guess')).status).toBe(401);
    expect((await signIn('stebbias', 'right-a')).status).toBe(200);
    expect((await signIn('joenana', 'guess')).status).toBe(401);
    expect((await signIn('joenana', 'right-b')).status).toBe(429);
  });

  it('a sign-in forgets its own account\'s failed tries', async () => {
    for (let i = 0; i < 4; i++) await signIn('stebbias', 'typo');
    expect((await signIn('stebbias', 'right-a')).status).toBe(200);
    for (let i = 0; i < 4; i++) expect((await signIn('stebbias', 'typo')).status).toBe(401);
  });

  it('counts the name however it is cased', async () => {
    for (let i = 0; i < 5; i++) await signIn(i % 2 ? 'JOENANA' : 'joenana', 'guess');
    expect((await signIn('JoeNana', 'right-b')).status).toBe(429);
  });

  /* five tries from each of many addresses were as many as the guesser had addresses */
  it('an account is guessed at so many times an hour from everywhere together', async () => {
    const from = (ip: string, token: string) => POST(new Request('http://x/api/crew/auth', {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': ip }, body: JSON.stringify({ username: 'joenana', token }),
    }) as never);
    for (let n = 0; n < 20; n++) expect((await from(`10.0.${n}.1`, 'guess')).status).toBe(401);
    expect((await from('10.0.99.1', 'right-b')).status).toBe(429);
  });

  it('a token longer than any password is turned away before it is checked', async () => {
    expect((await signIn('joenana', 'x'.repeat(300))).status).toBe(401);
  });
});

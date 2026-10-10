import { afterAll, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

/* Each address has its own limit on sign-in tries, so a password guessed at
   from many addresses is counted per member as well. The limits run in
   memory here, as they do without Redis, and the count is never reset
   between tests, so each test signs in as a member of its own. No member has
   a password; the token from the environment is the one right answer. */
vi.mock('@/lib/crew-access', async (orig) => ({
  ...(await orig<typeof import('@/lib/crew-access')>()),
  getPasswordHash: async () => null,
}));

const RIGHT = 'rétta-svarið';
const MEMBERS = ['JOENANA', 'STEBBIAS', 'INGUNNBIRTA'];
for (const m of MEMBERS) process.env[`CREW_TOKEN_${m}`] = RIGHT;
const { POST } = await import('../../app/api/crew/auth/route');
afterAll(() => { for (const m of MEMBERS) delete process.env[`CREW_TOKEN_${m}`]; });

let address = 0;
/* every try from an address of its own, so only the member's count can turn it away */
const attempt = (username: string, token: string) => POST(new NextRequest('https://jod.test/api/crew/auth', {
  method: 'POST',
  body: JSON.stringify({ username, token }),
  headers: { 'content-type': 'application/json', 'x-forwarded-for': `10.0.${Math.floor(address / 250)}.${address++ % 250}` },
}));

describe('signing in, counted per member', () => {
  it('turns the 21st try in an hour away, from whatever address, the right answer too', async () => {
    for (let i = 0; i < 20; i++) expect((await attempt('joenana', 'rangt')).status).toBe(401);
    const res = await attempt('JoeNana', 'rangt');
    expect(res.status).toBe(429);
    expect((await res.json()).error).toBe('Of margar tilraunir. Reyndu aftur síðar.');
    expect((await attempt('joenana', RIGHT)).status).toBe(429);
  });

  it('starts the count again once the member gets in', async () => {
    for (let i = 0; i < 19; i++) await attempt('stebbias', 'rangt');
    expect((await attempt('stebbias', RIGHT)).status).toBe(200);
    for (let i = 0; i < 20; i++) expect((await attempt('stebbias', 'rangt')).status).toBe(401);
  });

  it('leaves the other members alone', async () => {
    expect((await attempt('ingunnbirta', RIGHT)).status).toBe(200);
  });

  it('does not count names that are not on the list', async () => {
    for (let i = 0; i < 25; i++) expect((await attempt('enginn', 'rangt')).status).toBe(401);
  });
});

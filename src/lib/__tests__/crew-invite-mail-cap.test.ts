import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

/* "Send me a link" was limited per address only: one address going round the
   crew, or a few addresses asking for one member, filled inboxes with live
   links. A member gets one letter a quarter of an hour and five a day,
   whoever asks; past that the answer is the same and nothing is sent. */

/* the store's limiter: a count per key in a window that starts with the first try */
const counts = new Map<string, number>();
vi.mock('@/lib/rateLimit', () => ({
  clientKey: (h: Headers) => h.get('x-forwarded-for') ?? 'unknown',
  checkRateLimit: async (key: string, action: string, max = 5) => {
    const k = `${action}:${key}`;
    const n = (counts.get(k) ?? 0) + 1;
    counts.set(k, n);
    return { limited: n > max, remaining: Math.max(0, max - n) };
  },
  clearRateLimit: async () => {},
}));
const mailed: string[] = [];
vi.mock('@/lib/crew-email', () => ({ mailSignInLink: async (name: string) => { mailed.push(name); return { sent: true }; } }));
vi.mock('@/lib/email', () => ({ canSendEmail: () => true, siteUrl: () => 'https://jod.test' }));
vi.mock('@/lib/crew', () => ({
  peekInvite: async () => null, consumeInvite: async () => null, createCrewSession: async () => 's',
  canonicalUsername: (n: string) => n, isCrewUsername: () => true, CREW_COOKIE: 'jod_crew_session', SESSION_TTL: 60,
}));
/* the letter goes after the answer; here it goes at once */
vi.mock('next/server', async original => ({ ...(await original<typeof import('next/server')>()), after: (fn: () => unknown) => { void fn(); } }));

const { POST } = await import('@/app/api/crew/invite/route');
const ask = (username: string, ip: string) => POST(new NextRequest('http://jod.test/api/crew/invite', {
  method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': ip }, body: JSON.stringify({ username }),
}) as never);
/** the quarter-hour has passed for this member */
const later = (member: string) => counts.delete(`crew-mail-link-sent:${member}`);

describe('a sign-in link asked for by post', () => {
  beforeEach(() => { counts.clear(); mailed.length = 0; });

  it('sends one letter to a member in a quarter of an hour, however many addresses ask', async () => {
    for (let i = 0; i < 10; i++) {
      const res = await ask('joenana', `85.220.1.${i}`);
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ ok: true });
    }
    expect(mailed).toEqual(['joenana']);
  });

  it('answers the same whether the letter went or not', async () => {
    const first = await ask('joenana', '85.220.1.1');
    const second = await ask('joenana', '85.220.2.2');
    expect([first.status, await first.json()]).toEqual([second.status, await second.json()]);
  });

  it('sends a member five letters a day at most, and counts only the asks that got that far', async () => {
    for (let i = 0; i < 8; i++) {
      await ask('joenana', `85.220.3.${i}`);
      await ask('joenana', `85.220.4.${i}`);   // inside the quarter-hour: not a letter, and not one of the day's five
      later('joenana');
    }
    expect(mailed).toHaveLength(5);
  });

  it('keeps one member\'s letters apart from another\'s', async () => {
    await ask('joenana', '85.220.1.1');
    await ask('stebbias', '85.220.1.1');
    expect(mailed).toEqual(['joenana', 'stebbias']);
  });
});

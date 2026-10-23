import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

/* Calls for something and questions, as the routes keep them: who may take
   a call on, let it go, call it done or open it again; one vote a member on
   a question, and only the one who asked closes it. */
const store = new Map<string, string>();
const fake = {
  get: async (key: string) => store.get(key) ?? null,
  eval: async (_script: string, _n: number, key: string, expected: string, next: string) => {
    const cur = store.get(key);
    if ((cur === undefined && expected === '') || cur === expected) { store.set(key, next); return 1; }
    return 0;
  },
};
let me = 'joenana';
vi.mock('@/lib/redis', () => ({ getRedis: () => fake, rGet: async (k: string) => { const v = store.get(k); return v ? JSON.parse(v) : null; } }));
vi.mock('@/lib/crew', async (orig) => ({
  ...(await orig<typeof import('@/lib/crew')>()),
  getCrewSession: async () => ({ username: me }),
  requireOwner: async (u: string) => (u.toLowerCase() === me.toLowerCase() ? { username: me } : null),
}));
vi.mock('@/lib/map', () => ({ readMap: async () => ({ locations: [], zones: [], paths: [] }) }));

process.env.REDIS_URL = 'redis://test';
const { POST: pin } = await import('../../app/api/crew/[username]/entries/route');
const { POST: bounty } = await import('../../app/api/crew/[username]/entries/[id]/bounty/route');
const { POST: vote } = await import('../../app/api/crew/[username]/entries/[id]/vote/route');
afterAll(() => { delete process.env.REDIS_URL; });

const KEY = 'crew:profile:stebbias';
const at = '2026-10-01T00:00:00.000Z';
const req = (body: unknown) => new NextRequest('https://jod.test/x', { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' } });
const on = (id: string) => ({ params: Promise.resolve({ username: 'stebbias', id }) });
const stored = () => JSON.parse(store.get(KEY)!) as { entries: Array<Record<string, any>> };

beforeEach(() => {
  me = 'joenana';
  store.clear();
  store.set(KEY, JSON.stringify({ username: 'stebbias', bio: '', coverPhotoId: null, bestDrawMs: null, entries: [
    { id: 'call', text: 'Vantar járn', photos: [], placeId: null, createdAt: at, lanterns: [], replies: [], bounty: { reward: '10 smaragðar', takenBy: null, doneAt: null } },
    { id: 'ask', text: 'Hvert förum við?', photos: [], placeId: null, createdAt: at, lanterns: [], replies: [], poll: { closed: false, choices: [{ id: 'a', text: 'Endinn', votes: [] }, { id: 'b', text: 'Netherinn', votes: [] }] } },
  ] }));
});

describe('a call for something', () => {
  it('is taken on by one of the crew, and by nobody else while they have it', async () => {
    expect((await bounty(req({ action: 'take' }), on('call'))).status).toBe(200);
    expect(stored().entries[0].bounty.takenBy).toBe('joenana');
    me = 'AmmaGaur';
    const res = await bounty(req({ action: 'take' }), on('call'));
    expect(res.status).toBe(409);
    expect((await res.json()).error).toMatch(/joenana/);
  });

  it('cannot be taken on by the one who posted it, nor called done by anyone else', async () => {
    me = 'stebbias';
    expect((await bounty(req({ action: 'take' }), on('call'))).status).toBe(403);
    me = 'joenana';
    expect((await bounty(req({ action: 'done' }), on('call'))).status).toBe(403);
  });

  it('is let go by the one who took it, and called done and opened again by the one who posted it', async () => {
    await bounty(req({ action: 'take' }), on('call'));
    expect((await bounty(req({ action: 'drop' }), on('call'))).status).toBe(200);
    expect(stored().entries[0].bounty.takenBy).toBeNull();
    await bounty(req({ action: 'take' }), on('call'));
    me = 'stebbias';
    const done = await (await bounty(req({ action: 'done' }), on('call'))).json();
    expect(done.bounty).toMatchObject({ takenBy: 'joenana', doneAt: expect.any(String) });
    me = 'joenana';
    expect((await bounty(req({ action: 'drop' }), on('call'))).status).toBe(409);
    me = 'stebbias';
    expect((await (await bounty(req({ action: 'reopen' }), on('call'))).json()).bounty.doneAt).toBeNull();
  });

  it('lets the one who posted it free it from one who took it, so it can close without paying them', async () => {
    await bounty(req({ action: 'take' }), on('call'));
    expect((await bounty(req({ action: 'release' }), on('call'))).status).toBe(403);
    me = 'stebbias';
    expect((await (await bounty(req({ action: 'release' }), on('call'))).json()).bounty.takenBy).toBeNull();
    const closed = await (await bounty(req({ action: 'done' }), on('call'))).json();
    expect(closed.bounty).toMatchObject({ takenBy: null, doneAt: expect.any(String) });
  });

  it('answers 404 for a note that is no call, and 400 for no action', async () => {
    expect((await bounty(req({ action: 'take' }), on('ask'))).status).toBe(404);
    expect((await bounty(req({ action: 'steal' }), on('call'))).status).toBe(400);
  });
});

describe('a question', () => {
  it('keeps one vote a member, which can be changed or taken back', async () => {
    await vote(req({ choice: 'a' }), on('ask'));
    await vote(req({ choice: 'b' }), on('ask'));
    me = 'AmmaGaur';
    const res = await (await vote(req({ choice: 'b' }), on('ask'))).json();
    expect(res.poll.choices.map((c: { votes: string[] }) => c.votes)).toEqual([[], ['joenana', 'AmmaGaur']]);
    me = 'joenana';
    await vote(req({ choice: null }), on('ask'));
    expect(stored().entries[1].poll.choices[1].votes).toEqual(['AmmaGaur']);
  });

  it('turns away an answer it does not offer', async () => {
    expect((await vote(req({ choice: 'z' }), on('ask'))).status).toBe(400);
  });

  it('is closed only by the one who asked, and takes no votes once closed', async () => {
    expect((await vote(req({ closed: true }), on('ask'))).status).toBe(403);
    me = 'stebbias';
    expect((await vote(req({ closed: true }), on('ask'))).status).toBe(200);
    me = 'joenana';
    expect((await vote(req({ choice: 'a' }), on('ask'))).status).toBe(409);
  });
});

describe('putting one up', () => {
  const onWall = { params: Promise.resolve({ username: 'stebbias' }) };
  beforeEach(() => { me = 'stebbias'; });

  it('pins a call with its reward, and a question with its answers', async () => {
    const call = await (await pin(req({ text: 'Vantar sand', bounty: { reward: ' 5  demantar ' } }), onWall)).json();
    expect(call.bounty).toEqual({ reward: '5 demantar', takenBy: null, doneAt: null });
    const ask = await (await pin(req({ text: 'Kvöld?', poll: { choices: ['Föstudagur', ' ', 'Laugardagur'] } }), onWall)).json();
    expect(ask.poll.choices.map((c: { id: string; text: string }) => [c.id, c.text])).toEqual([['a', 'Föstudagur'], ['b', 'Laugardagur']]);
  });

  it('says what is missing', async () => {
    const said = async (body: unknown) => (await (await pin(req(body), onWall)).json()).error;
    expect(await said({ text: '', bounty: { reward: '5' } })).toBe('Segðu hvað vantar.');
    expect(await said({ text: 'x', bounty: { reward: '' } })).toBe('Hver eru verðlaunin?');
    expect(await said({ text: 'x', poll: { choices: ['Já'] } })).toMatch(/2 til 4/);
    expect(await said({ text: 'x', poll: { choices: ['Já', 'já'] } })).toMatch(/tvisvar/);
    expect(await said({ text: 'x', bounty: { reward: '1' }, poll: { choices: ['a', 'b'] } })).toMatch(/ekki hvort tveggja/);
  });
});

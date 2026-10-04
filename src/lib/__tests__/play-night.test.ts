import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

/* Redis, in memory: strings, hashes and sets */
const kv = new Map<string, string>();
const hashes = new Map<string, Map<string, string>>();
const sets = new Map<string, Set<string>>();
const hash = (k: string) => { if (!hashes.has(k)) hashes.set(k, new Map()); return hashes.get(k)!; };
vi.mock('@/lib/redis', () => ({
  getRedis: () => ({
    get: async (k: string) => kv.get(k) ?? null,
    del: async (k: string) => (kv.delete(k) ? 1 : 0),
    hdel: async (k: string, f: string) => (hash(k).delete(f) ? 1 : 0),
    set: async (k: string, v: string, ...opts: unknown[]) => { if (opts.includes('NX') && kv.has(k)) return null; kv.set(k, v); return 'OK'; },
    hgetall: async (k: string) => Object.fromEntries(hash(k)),
    hset: async (k: string, f: string, v: string) => { hash(k).set(f, v); return 1; },
    hincrby: async (k: string, f: string, n: number) => { const v = Number(hash(k).get(f) ?? 0) + n; hash(k).set(f, String(v)); return v; },
    sadd: async (k: string, ...v: string[]) => { if (!sets.has(k)) sets.set(k, new Set()); v.forEach(x => sets.get(k)!.add(x)); return v.length; },
    smembers: async (k: string) => [...(sets.get(k) ?? [])],
    expire: async () => 1,
  }),
}));
let session: string | null = 'stebbias';
vi.mock('@/lib/crew', () => ({ getCrewSession: async () => (session ? { username: session } : null) }));
const exaroton = { status: 0, started: 0 };
vi.mock('@/lib/exaroton', () => ({
  exarotonStatus: async () => exaroton.status,
  startExaroton: async () => { exaroton.started++; },
}));

const lib = await import('@/lib/play-night');
const { GET, POST } = await import('../../app/api/playnight/route');

const H = 3600_000;
const iso = (ms: number) => new Date(ms).toISOString();
const night = (over: Partial<import('@/lib/play-night').Night> = {}): import('@/lib/play-night').Night => ({
  id: 'n1', by: 'stebbias', createdAt: iso(0), note: '', chosen: null, chosenBy: null, cancelled: false, startedBy: null, outcome: null,
  options: [{ id: 'a', at: iso(100 * H) }, { id: 'b', at: iso(124 * H) }],
  ...over,
});

describe('the rules', () => {
  it('the leader is the time most can make, a tie going to the earliest', () => {
    expect(lib.leader(night(), { u1: ['b'], u2: ['a', 'b'] })?.id).toBe('b');
    expect(lib.leader(night(), { u1: ['a'], u2: ['b'] })?.id).toBe('a');
    expect(lib.leader(night(), { u1: [] })).toBeNull();
  });

  it('is decided three hours before the earliest time, or goes out if nobody can come', () => {
    expect(lib.autoChoice(night(), { u1: ['b'] }, 96 * H)).toBeNull();
    expect(lib.autoChoice(night(), { u1: ['b'] }, 97 * H)).toMatchObject({ id: 'b' });
    expect(lib.autoChoice(night(), { u1: [] }, 97 * H)).toBe('out');
  });

  it('moves through its phases with the clock', () => {
    const n = night({ chosen: 'a' });
    expect(lib.phaseOf(night(), 0)).toBe('open');
    expect(lib.phaseOf(n, 99 * H)).toBe('chosen');
    expect(lib.phaseOf(n, 99.6 * H)).toBe('soon');
    expect(lib.phaseOf(n, 101 * H)).toBe('live');
    expect(lib.phaseOf(n, 106 * H)).toBe('over');
    expect(lib.isShown(n, 106 * H)).toBe(true);
    expect(lib.isShown(n, 106 * H + 8 * 24 * H)).toBe(false);
  });

  it('puts planned nights soonest first, then the last one over', () => {
    const later = night({ id: 'later', chosen: 'a', options: [{ id: 'a', at: iso(300 * H) }] });
    const open = night({ id: 'open' });
    const over1 = night({ id: 'over1', chosen: 'a', options: [{ id: 'a', at: iso(10 * H) }] });
    const over2 = night({ id: 'over2', chosen: 'a', options: [{ id: 'a', at: iso(40 * H) }] });
    const out = night({ id: 'out', cancelled: true });
    expect(lib.shownNights([later, over1, open, out, over2], 50 * H).map(n => n.id)).toEqual(['open', 'later', 'over2']);
  });

  it('keeps two nights off the same evening', () => {
    const chosen = night({ id: 'c', chosen: 'a' });            /* 100 h; its other time is free again */
    expect(lib.clashOf([chosen], [iso(103 * H)], 0)?.id).toBe('c');
    expect(lib.clashOf([chosen], [iso(124 * H)], 0)).toBeNull();
    expect(lib.clashOf([chosen], [iso(106 * H)], 0)).toBeNull();
    /* an open night holds every time it offers */
    expect(lib.clashOf([night({ id: 'o' })], [iso(125 * H)], 0)?.id).toBe('o');
    expect(lib.clashOf([night({ id: 'x', cancelled: true })], [iso(100 * H)], 0)).toBeNull();
  });

  it('checks the times offered', () => {
    const now = 0;
    expect(lib.checkTimes([], now)).toHaveProperty('error');
    expect(lib.checkTimes([iso(10 * 60_000)], now)).toHaveProperty('error');
    expect(lib.checkTimes([iso(15 * 24 * H)], now)).toEqual({ at: [iso(15 * 24 * H)] });
    expect(lib.checkTimes([iso(367 * 24 * H)], now)).toHaveProperty('error');
    expect(lib.checkTimes([iso(2 * H), iso(2.25 * H)], now)).toHaveProperty('error');
    expect(lib.checkTimes([iso(5 * H), iso(2 * H)], now)).toEqual({ at: [iso(2 * H), iso(5 * H)] });
  });

  it('settles who came: seen, or played more; unknown is given the benefit of the doubt', () => {
    const before = { stebbias: { playTimeTicks: 100 }, AmmaGaur: { playTimeTicks: 100 }, joenana: { playTimeTicks: 100 } };
    const after = { stebbias: { playTimeTicks: 100 }, AmmaGaur: { playTimeTicks: 500 }, joenana: { playTimeTicks: 100 } };
    const out = lib.outcomeOf(['stebbias', 'AmmaGaur', 'joenana', 'eikibleiki'], ['joenana'], before, after);
    expect(out.came).toEqual(['AmmaGaur', 'joenana']);
    /* eikibleiki's stats weren't read: not counted */
    expect(out.noShows).toEqual(['stebbias']);
  });
});

describe('/api/playnight', () => {
  beforeEach(() => {
    kv.clear(); hashes.clear(); sets.clear();
    session = 'stebbias';
    exaroton.status = 0; exaroton.started = 0;
    vi.stubEnv('REDIS_URL', 'redis://test');
    vi.stubEnv('EXAROTON_API_KEY', 'x');
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-01T12:00:00Z'));
  });
  afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); });

  const post = (body: unknown) => POST(new NextRequest('https://jod.test/api/playnight', { method: 'POST', body: JSON.stringify(body) }));
  const view = async () => (await (await GET()).json()) as import('../../app/api/playnight/route').PlayNightResponse;

  it('lights a fire, takes answers, and the proposer chooses', async () => {
    const res = await post({ action: 'propose', times: ['2026-10-02T20:00:00Z', '2026-10-03T20:00:00Z'], note: '  Klárum   brúna ' });
    expect(res.status).toBe(200);
    let v = await view();
    expect(v.nights).toHaveLength(1);
    const id = v.nights[0].id;
    expect(v.nights[0]).toMatchObject({ phase: 'open', note: 'Klárum brúna', by: 'stebbias' });
    /* the proposer can make every time they offered */
    expect(v.nights[0].options.map(o => o.yes)).toEqual([['stebbias'], ['stebbias']]);

    session = 'AmmaGaur';
    await post({ action: 'vote', night: id, yes: ['b', 'zzz'] });
    expect((await post({ action: 'choose', night: id, option: 'b' })).status).toBe(403);
    session = 'stebbias';
    expect((await post({ action: 'choose', night: 'nope', option: 'b' })).status).toBe(404);
    await post({ action: 'choose', night: id, option: 'b' });
    v = await view();
    expect(v.nights[0]).toMatchObject({ chosen: 'b', chosenBy: 'stebbias', phase: 'chosen' });
    expect(v.nights[0].options[1].yes).toEqual(['AmmaGaur', 'stebbias']);
  });

  it('holds up to five nights at once, soonest first, never two on one evening', async () => {
    for (const d of ['2026-12-18', '2026-10-09', '2026-11-13', '2026-10-16']) {
      expect((await post({ action: 'propose', times: [`${d}T20:00:00Z`] })).status).toBe(200);
    }
    /* the same evening as another is turned away */
    expect((await post({ action: 'propose', times: ['2026-10-09T22:00:00Z'] })).status).toBe(409);
    expect((await post({ action: 'propose', times: ['2027-03-05T20:00:00Z'] })).status).toBe(200);
    let v = await view();
    expect(v.max).toBe(5);
    expect(v.nights.map(n => n.options[0].at.slice(0, 10))).toEqual(['2026-10-09', '2026-10-16', '2026-11-13', '2026-12-18', '2027-03-05']);
    /* a sixth waits until one is out */
    expect((await post({ action: 'propose', times: ['2027-04-02T20:00:00Z'] })).status).toBe(409);

    /* an answer and a cancel go to the night they name, and no other */
    session = 'joenana';
    await post({ action: 'vote', night: v.nights[2].id, yes: ['a'] });
    session = 'stebbias';
    await post({ action: 'cancel', night: v.nights[0].id });
    v = await view();
    expect(v.nights).toHaveLength(4);
    expect(v.nights[1].options[0].yes).toEqual(['joenana', 'stebbias']);
    expect(v.nights[0].options[0].yes).toEqual(['stebbias']);
    expect((await post({ action: 'propose', times: ['2027-04-02T20:00:00Z'] })).status).toBe(200);
  });

  it('moves the one night kept before there could be several', async () => {
    kv.set('playnight:current', JSON.stringify(night({ id: 'gamla', options: [{ id: 'a', at: '2026-10-03T20:00:00Z' }] })));
    const v = await view();
    expect(v.nights.map(n => n.id)).toEqual(['gamla']);
    expect(kv.has('playnight:current')).toBe(false);
    expect((await view()).nights.map(n => n.id)).toEqual(['gamla']);
  });

  it('lets only those coming start the server, and only from half an hour before', async () => {
    await post({ action: 'propose', times: ['2026-10-01T20:00:00Z'] });
    const id = (await view()).nights[0].id;
    expect((await post({ action: 'start', night: id })).status).toBe(409);

    vi.setSystemTime(new Date('2026-10-01T19:40:00Z'));
    session = 'joenana';
    expect((await post({ action: 'start', night: id })).status).toBe(403);
    session = 'stebbias';
    expect((await post({ action: 'start', night: id })).status).toBe(200);
    expect(exaroton.started).toBe(1);
    expect((await view()).nights[0].startedBy).toBe('stebbias');

    exaroton.status = 1;
    expect((await post({ action: 'start', night: id })).status).toBe(409);
  });

  it('turns away anyone signed out', async () => {
    session = null;
    expect((await post({ action: 'propose', times: ['2026-10-02T20:00:00Z'] })).status).toBe(401);
  });

  it('counts a no-show the day after, once, for each night', async () => {
    await post({ action: 'propose', times: ['2026-10-01T20:00:00Z'] });
    await post({ action: 'propose', times: ['2026-10-05T20:00:00Z'] });
    const [first, second] = (await view()).nights;
    session = 'AmmaGaur';
    await post({ action: 'vote', night: first.id, yes: ['a'] });

    /* during the evening, the status check sees AmmaGaur */
    vi.setSystemTime(new Date('2026-10-01T21:00:00Z'));
    await lib.noteSeen(['AmmaGaur']);

    /* the daily copies either side: stebbias played not a tick */
    const day = (d: string, takenAt: string, play: number) => kv.set(`stats:day:${d}`, JSON.stringify({ day: d, takenAt, failed: [], counters: { stebbias: { playTimeTicks: play }, AmmaGaur: { playTimeTicks: 5 } } }));
    day('2026-10-01', '2026-10-01T12:05:00Z', 100);
    day('2026-10-02', '2026-10-02T12:05:00Z', 100);

    vi.setSystemTime(new Date('2026-10-02T12:10:00Z'));
    /* a second delivery of the daily job that finds the night already claimed counts nothing */
    kv.set(`playnight:settled:${first.id}`, '1');
    expect(await lib.settleNights()).toEqual([]);
    expect(await lib.readNoShows()).toEqual({});
    kv.delete(`playnight:settled:${first.id}`);
    expect(await lib.settleNights()).toEqual([{ id: first.id, came: ['AmmaGaur'], noShows: ['stebbias'] }]);
    expect(await lib.settleNights()).toEqual([]);
    expect(await lib.readNoShows()).toEqual({ stebbias: 1 });
    /* the next night comes first, the embers of the last after it */
    const v = await view();
    expect(v.nights.map(n => n.phase)).toEqual(['chosen', 'over']);
    expect(v.nights[1]).toMatchObject({ id: first.id, came: ['AmmaGaur'] });

    /* a week on, the first is cleared away; the second's embers glow in its place */
    vi.setSystemTime(new Date('2026-10-09T12:00:00Z'));
    expect((await view()).nights.map(n => n.id)).toEqual([second.id]);
    expect(hash('playnight:nights').has(first.id)).toBe(false);
  });
});

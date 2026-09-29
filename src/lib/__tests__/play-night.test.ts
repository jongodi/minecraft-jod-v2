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
    set: async (k: string, v: string) => { kv.set(k, v); return 'OK'; },
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

  it('checks the times offered', () => {
    const now = 0;
    expect(lib.checkTimes([], now)).toHaveProperty('error');
    expect(lib.checkTimes([iso(10 * 60_000)], now)).toHaveProperty('error');
    expect(lib.checkTimes([iso(15 * 24 * H)], now)).toHaveProperty('error');
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
    expect(v.night).toMatchObject({ phase: 'open', note: 'Klárum brúna', by: 'stebbias' });
    /* the proposer can make every time they offered */
    expect(v.night!.options.map(o => o.yes)).toEqual([['stebbias'], ['stebbias']]);

    expect((await post({ action: 'propose', times: ['2026-10-04T20:00:00Z'] })).status).toBe(409);

    session = 'AmmaGaur';
    await post({ action: 'vote', yes: ['b', 'zzz'] });
    expect((await post({ action: 'choose', option: 'b' })).status).toBe(403);
    session = 'stebbias';
    await post({ action: 'choose', option: 'b' });
    v = await view();
    expect(v.night).toMatchObject({ chosen: 'b', chosenBy: 'stebbias', phase: 'chosen' });
    expect(v.night!.options[1].yes).toEqual(['AmmaGaur', 'stebbias']);
  });

  it('lets only those coming start the server, and only from half an hour before', async () => {
    await post({ action: 'propose', times: ['2026-10-01T20:00:00Z'] });
    expect((await post({ action: 'start' })).status).toBe(409);

    vi.setSystemTime(new Date('2026-10-01T19:40:00Z'));
    session = 'joenana';
    expect((await post({ action: 'start' })).status).toBe(403);
    session = 'stebbias';
    expect((await post({ action: 'start' })).status).toBe(200);
    expect(exaroton.started).toBe(1);
    expect((await view()).night!.startedBy).toBe('stebbias');

    exaroton.status = 1;
    expect((await post({ action: 'start' })).status).toBe(409);
  });

  it('turns away anyone signed out', async () => {
    session = null;
    expect((await post({ action: 'propose', times: ['2026-10-02T20:00:00Z'] })).status).toBe(401);
  });

  it('counts a no-show the day after, once', async () => {
    await post({ action: 'propose', times: ['2026-10-01T20:00:00Z'] });
    session = 'AmmaGaur';
    await post({ action: 'vote', yes: ['a'] });

    /* during the evening, the status check sees AmmaGaur */
    vi.setSystemTime(new Date('2026-10-01T21:00:00Z'));
    await lib.noteSeen(['AmmaGaur']);

    /* the daily copies either side: stebbias played not a tick */
    const day = (d: string, takenAt: string, play: number) => kv.set(`stats:day:${d}`, JSON.stringify({ day: d, takenAt, failed: [], counters: { stebbias: { playTimeTicks: play }, AmmaGaur: { playTimeTicks: 5 } } }));
    day('2026-10-01', '2026-10-01T12:05:00Z', 100);
    day('2026-10-02', '2026-10-02T12:05:00Z', 100);

    vi.setSystemTime(new Date('2026-10-02T12:10:00Z'));
    expect(await lib.settleNight()).toEqual({ came: ['AmmaGaur'], noShows: ['stebbias'] });
    expect(await lib.settleNight()).toBeNull();
    expect(await lib.readNoShows()).toEqual({ stebbias: 1 });
    expect((await view()).night).toMatchObject({ phase: 'over', came: ['AmmaGaur'] });
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/* The fires let a settled night go about a week after its evening, into the
   annals. Every count over the nights that were held (the fires held on the
   hero's splash, Fastagesturinn, the crew's usual evening, a night's Met
   stamp) read the fires alone, so a crew that met every Friday was only ever
   seen to have held the last night or two of them. */

/* Redis, in memory: strings, hashes and sets, as play-night.test.ts keeps them */
const kv = new Map<string, string>();
const hashes = new Map<string, Map<string, string>>();
const sets = new Map<string, Set<string>>();
const hash = (k: string) => { if (!hashes.has(k)) hashes.set(k, new Map()); return hashes.get(k)!; };
vi.mock('@/lib/redis', () => ({
  rGet: async (k: string) => (kv.has(k) ? JSON.parse(kv.get(k)!) : null),
  getRedis: () => ({
    get: async (k: string) => kv.get(k) ?? null,
    del: async (k: string) => (kv.delete(k) ? 1 : 0),
    hdel: async (k: string, f: string) => (hash(k).delete(f) ? 1 : 0),
    hgetall: async (k: string) => Object.fromEntries(hash(k)),
    hset: async (k: string, f: string, v: string) => { hash(k).set(f, v); return 1; },
    hget: async (k: string, f: string) => hash(k).get(f) ?? null,
    eval: async (_s: string, _n: number, k: string, f: string, was: string, next: string) => { if ((hash(k).get(f) ?? '') !== was) return 0; hash(k).set(f, next); return 1; },
    smembers: async (k: string) => [...(sets.get(k) ?? [])],
  }),
}));
vi.mock('@/lib/crew', () => ({ CREW_USERNAMES: ['stebbias', 'AmmaGaur', 'joenana'], bountyCounts: () => ({}), readAllProfiles: async () => [] }));
vi.mock('@/lib/exaroton', () => ({ getExarotonServerId: async () => 'srv' }));

const { heldNights } = await import('@/lib/play-night');
const { viewNights, habitOf } = await import('@/lib/play-night-view');
const { withCharges, EMPTY } = await import('@/lib/stats');
type Night = import('@/lib/play-night').Night;

const T = 72000;   /* ticks in an hour */
/* five Friday evenings at eight, a week apart; the last the best attended and the longest */
const FRIDAYS = ['2026-10-02', '2026-10-09', '2026-10-16', '2026-10-23', '2026-10-30'];
const settled = (day: string, i: number): Night => {
  const came = i === 4 ? ['AmmaGaur', 'joenana', 'stebbias'] : i % 2 ? ['AmmaGaur', 'stebbias'] : ['stebbias'];
  const at = `${day}T20:00:00.000Z`;
  return {
    id: `n${i + 1}`, by: 'stebbias', createdAt: `${day}T08:00:00.000Z`, note: '', options: [{ id: 'a', at }],
    chosen: 'a', chosenBy: 'stebbias', cancelled: false, startedBy: null,
    outcome: { came, noShows: [], numbers: { by: Object.fromEntries(came.map(u => [u, { ticks: (i + 1) * T, deaths: 0, mobKills: 0, travelCm: 0 }])), advancements: [] } },
  };
};

describe('the nights that were held', () => {
  beforeEach(() => {
    kv.clear(); hashes.clear(); sets.clear();
    vi.stubEnv('REDIS_URL', 'redis://test');
    vi.useFakeTimers({ toFake: ['Date'] });
  });
  afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); });

  it('are every one of five weekly nights, though four have left the fires for the annals', async () => {
    /* each Friday's night is settled the next day, and the fires are read
       through the week, which hands the nights more than a week old to the annals */
    for (const [i, day] of FRIDAYS.entries()) {
      hash('playnight:nights').set(`n${i + 1}`, JSON.stringify(settled(day, i)));
      vi.setSystemTime(new Date(Date.parse(`${day}T20:00:00Z`) + 4 * 24 * 3600_000));
      await viewNights();
    }
    vi.setSystemTime(new Date('2026-10-31T13:00:00Z'));
    const view = await viewNights();
    expect([...hash('playnight:nights').keys()]).toEqual(['n5']);
    expect([...hash('playnight:past').keys()].sort()).toEqual(['n1', 'n2', 'n3', 'n4']);

    /* the count on the hero's splash */
    const held = await heldNights();
    expect(held.map(n => n.id)).toEqual(['n1', 'n2', 'n3', 'n4', 'n5']);

    /* Fastagesturinn: who came to the most of them */
    const crew = await withCharges(['stebbias', 'AmmaGaur', 'joenana'].map(username => ({ username, ...EMPTY })));
    expect(Object.fromEntries(crew.map(p => [p.username, p.attended]))).toEqual({ stebbias: 5, AmmaGaur: 3, joenana: 1 });

    /* the crew's usual evening: Fridays at eight, five of five */
    expect(view.habit).toEqual({ weekday: 5, hour: 20, of: 5, total: 5 });

    /* the last night's embers top every night before it, which are in the annals now */
    expect(view.nights.map(n => n.id)).toEqual(['n5']);
    expect(view.nights[0].numbers?.records).toEqual(['hours', 'came']);
  });

  it('leave out a night the annals took unsettled, with nobody seen at it', async () => {
    const past = (id: string, came: string[], extra: object = {}) =>
      hash('playnight:past').set(id, JSON.stringify({ id, by: 'stebbias', note: '', at: '2026-09-04T20:00:00.000Z', yes: ['stebbias'], came, noShows: [], startedBy: null, ...extra }));
    past('seen', ['joenana']);
    past('empty', []);
    past('charged', [], { noShows: ['stebbias'] });
    /* a night put out, or one not yet settled, among the fires is no night held either */
    hash('playnight:nights').set('out', JSON.stringify({ ...settled('2026-10-02', 0), id: 'out', cancelled: true }));
    hash('playnight:nights').set('waiting', JSON.stringify({ ...settled('2026-10-09', 1), id: 'waiting', outcome: null }));
    vi.setSystemTime(new Date('2026-10-10T13:00:00Z'));
    expect((await heldNights()).map(n => n.id).sort()).toEqual(['charged', 'seen']);
  });

  it('make a habit only of three or more, a third of them on one weekday', () => {
    const on = (at: string, id = at) => ({ id, at, came: ['stebbias'] });
    expect(habitOf([on('2026-10-02T20:00:00Z'), on('2026-10-09T20:00:00Z')])).toBeNull();
    expect(habitOf([on('2026-10-02T20:00:00Z'), on('2026-10-09T21:00:00Z'), on('2026-10-13T19:00:00Z')])).toEqual({ weekday: 5, hour: 21, of: 2, total: 3 });
    expect(habitOf([on('2026-10-02T20:00:00Z'), on('2026-10-03T20:00:00Z'), on('2026-10-04T20:00:00Z'), on('2026-10-05T20:00:00Z')])).toBeNull();
  });
});

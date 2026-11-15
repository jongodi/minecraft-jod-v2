import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Counters } from '@/lib/stats';
import type { DailySnapshot } from '@/lib/daily-stats';

/* a store just big enough for the list, the marker and the daily copies */
const strings = new Map<string, string>();
const lists = new Map<string, string[]>();
vi.mock('@/lib/redis', () => ({
  getRedis: () => ({
    get: async (k: string) => strings.get(k) ?? null,
    set: async (k: string, v: string) => { strings.set(k, v); return 'OK'; },
    mget: async (...keys: string[]) => keys.map(k => strings.get(k) ?? null),
    lrange: async (k: string, from: number, to: number) => (lists.get(k) ?? []).slice(from, to + 1),
    lpush: async (k: string, ...vs: string[]) => { const l = lists.get(k) ?? []; for (const v of vs) l.unshift(v); lists.set(k, l); return l.length; },
    ltrim: async (k: string, from: number, to: number) => { lists.set(k, (lists.get(k) ?? []).slice(from, to + 1)); return 'OK'; },
  }),
}));

const { MILESTONES_KEY, MILESTONES_SIZE, milestoneId, milestonesOver, noteMilestones, passed, readMilestones, unseen } = await import('@/lib/milestones');
const { milestoneWords } = await import('@/components/board/milestone');

const counters = (hours: number, deaths = 0, mobs = 0, km = 0): Counters => ({
  playTimeTicks: hours * 72_000, deaths, mobKills: mobs, playerKills: 0, travelCm: km * 100_000,
  damageTaken: 0, damageDealt: 0, raidWins: 0, recordsPlayed: 0,
});
const copy = (day: string, who: Record<string, Counters>): DailySnapshot => ({ day, takenAt: `${day}T12:00:00.000Z`, counters: who, failed: [] });

describe('a round number passed', () => {
  it('is the mark the counter came up to or went over', () => {
    expect(passed('deaths', 99, 100)).toBe(100);
    expect(passed('deaths', 99, 104)).toBe(100);
    expect(passed('hours', 499.9, 500)).toBe(500);
  });

  it('is nothing short of a mark, on one already stood on, or when the counter went down', () => {
    expect(passed('deaths', 98, 99)).toBeNull();
    expect(passed('deaths', 100, 101)).toBeNull();
    expect(passed('deaths', 100, 100)).toBeNull();
    expect(passed('mobs', 5200, 12)).toBeNull();
  });

  it('is the highest of several passed at once', () => {
    expect(passed('deaths', 40, 260)).toBe(250);
  });

  it('goes on every 500 hours past the listed marks', () => {
    expect(passed('hours', 1480, 1502)).toBe(1500);
    expect(passed('hours', 1502, 1990)).toBeNull();
    expect(passed('hours', 1990, 2001)).toBe(2000);
  });
});

describe('the marks over a run of daily copies', () => {
  it('measures each member from their own last copy, and tells nothing of a first one', () => {
    const found = milestonesOver([
      copy('2026-11-03', { stebbias: counters(498, 99), joenana: counters(120) }),
      /* joenana's file did not come through this day */
      copy('2026-11-04', { stebbias: counters(501, 99) }),
      copy('2026-11-05', { stebbias: counters(503, 100), joenana: counters(251), AmmaGaur: counters(1000, 500) }),
    ]);
    expect(found.map(m => `${milestoneId(m)}@${m.at.slice(0, 10)}`)).toEqual([
      'stebbias:hours:500@2026-11-04',
      'stebbias:deaths:100@2026-11-05',
      'joenana:hours:250@2026-11-05',
    ]);
  });

  it('reads the copies in the order of their days, whatever order they came in', () => {
    const days = [copy('2026-11-05', { stebbias: counters(60) }), copy('2026-11-04', { stebbias: counters(40) })];
    expect(milestonesOver(days).map(milestoneId)).toEqual(['stebbias:hours:50']);
  });

  it('tells a mark once, however the name is cased', () => {
    const a = { who: 'AmmaGaur', what: 'deaths' as const, mark: 100, at: '2026-11-05T12:00:00.000Z' };
    expect(unseen([a, { ...a, who: 'ammagaur' }], [])).toEqual([a]);
    expect(unseen([a], [{ ...a, at: '2026-11-01T12:00:00.000Z' }])).toEqual([]);
  });
});

describe('the daily job noting the marks', () => {
  const day = (d: string, c: Record<string, Counters>) => strings.set(`stats:day:${d}`, JSON.stringify(copy(d, c)));
  beforeEach(() => { strings.clear(); lists.clear(); process.env.REDIS_URL = 'redis://test'; });

  it('looks back over the board\'s reach the first time, and a week after that', async () => {
    day('2026-10-01', { stebbias: counters(90) });
    day('2026-10-02', { stebbias: counters(101) });
    day('2026-11-14', { stebbias: counters(240, 49) });
    day('2026-11-15', { stebbias: counters(251, 50) });
    const first = await noteMilestones(new Date('2026-11-15T12:05:00Z'));
    expect(first.map(milestoneId).sort()).toEqual(['stebbias:deaths:50', 'stebbias:hours:100', 'stebbias:hours:250']);
    /* newest first in the store */
    expect((await readMilestones())[2].mark).toBe(100);

    /* the same day again adds nothing */
    expect(await noteMilestones(new Date('2026-11-15T18:00:00Z'))).toEqual([]);
    expect(await readMilestones()).toHaveLength(3);

    /* the next day: only what the week's copies show and the list does not hold */
    day('2026-11-16', { stebbias: counters(252, 50, 1000) });
    expect((await noteMilestones(new Date('2026-11-16T12:05:00Z'))).map(milestoneId)).toEqual(['stebbias:mobs:1000']);
    expect((await readMilestones())[0].what).toBe('mobs');
  });

  it('keeps the list short', async () => {
    lists.set(MILESTONES_KEY, Array.from({ length: MILESTONES_SIZE }, (_, i) => JSON.stringify({ who: 'joenana', what: 'km', mark: i, at: '2026-11-01T12:00:00.000Z' })));
    strings.set('stats:milestones:filled', '2026-11-01T12:00:00.000Z');
    day('2026-11-14', { stebbias: counters(49) });
    day('2026-11-15', { stebbias: counters(50) });
    await noteMilestones(new Date('2026-11-15T12:05:00Z'));
    const kept = await readMilestones();
    expect(kept).toHaveLength(MILESTONES_SIZE);
    expect(milestoneId(kept[0])).toBe('stebbias:hours:50');
  });

  it('has none without a store', async () => {
    delete process.env.REDIS_URL;
    expect(await readMilestones()).toEqual([]);
    expect(await noteMilestones()).toEqual([]);
  });
});

describe('a mark in the board\'s words', () => {
  const said = (what: Parameters<typeof milestoneWords>[0], mark: number) => { const w = milestoneWords(what, mark); return `${w.before}${w.bold}${w.after}${w.sub ? ` | ${w.sub}` : ''}`; };

  it('says the hours and what they come to in days and nights', () => {
    expect(said('hours', 500)).toBe('hefur verið 500 klukkustundir í heiminum | það eru rúmir 20 sólarhringar');
    expect(said('hours', 1000)).toBe('hefur verið 1.000 klukkustundir í heiminum | það er rúmur 41 sólarhringur');
    expect(said('hours', 3000)).toBe('hefur verið 3.000 klukkustundir í heiminum | það eru 125 sólarhringar');
  });

  it('says the rest plainly, with the thousands as Iceland writes them', () => {
    expect(said('deaths', 100)).toBe('dó í 100. sinn');
    expect(said('mobs', 10_000)).toBe('hefur fellt 10.000 verur');
    expect(said('km', 2500)).toBe('hefur farið 2.500 km á eigin fótum');
  });
});

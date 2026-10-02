import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const store = new Map<string, { value: string; ttl: number }>();
vi.mock('@/lib/redis', () => ({
  getRedis: () => ({
    set: vi.fn(async (key: string, value: string, _ex: string, ttl: number) => { store.set(key, { value, ttl }); return 'OK'; }),
    get: vi.fn(async (key: string) => store.get(key)?.value ?? null),
  }),
  rGet: vi.fn(async () => null),
  rSet: vi.fn(async () => undefined),
}));
vi.mock('@/lib/crew', () => ({
  CREW_USERNAMES: ['stebbias', 'AmmaGaur', 'joenana'],
  readAllProfiles: vi.fn(async () => []),
}));

const { GET } = await import('../../app/api/cron/daily/route');
const { readGameStats } = await import('@/lib/stats');
const { readDay, weekOf } = await import('@/lib/daily-stats');

const SECRET = '40a735829386059072566eec7b16de73';
const UUID = {
  stebbias: '11111111-1111-1111-1111-111111111111',
  AmmaGaur: '22222222-2222-2222-2222-222222222222',
  joenana:  '33333333-3333-3333-3333-333333333333',
};
const statsFile = (play: number, deaths: number) => ({
  stats: { 'minecraft:custom': {
    'minecraft:play_time': play, 'minecraft:deaths': deaths, 'minecraft:mob_kills': 7,
    'minecraft:walk_one_cm': 500, 'minecraft:damage_taken': 30, 'minecraft:damage_dealt': 60,
  } },
});

describe('the daily stats copy', () => {
  const fetchMock = vi.fn();
  /* joenana's file is on the server but won't come off it */
  let brokenFor = 'joenana';

  beforeEach(() => {
    store.clear();
    brokenFor = 'joenana';
    vi.stubEnv('CRON_SECRET', SECRET);
    vi.stubEnv('EXAROTON_API_KEY', 'exaroton-test');
    vi.stubEnv('EXAROTON_SERVER_ID', 'srv');
    vi.stubEnv('REDIS_URL', 'redis://test');
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    fetchMock.mockImplementation(async (url: string) => {
      const mojang = url.match(/api\.mojang\.com\/users\/profiles\/minecraft\/(\w+)/);
      if (mojang) {
        const name = mojang[1] as keyof typeof UUID;
        return Response.json({ id: UUID[name].replace(/-/g, ''), name });
      }
      if (url.endsWith('/files/info/world/players/stats')) {
        return Response.json({ data: { children: Object.values(UUID).map(u => ({ name: `${u}.json` })) } });
      }
      const file = url.match(/stats\/([0-9a-f-]{36})\.json$/)?.[1];
      if (file) {
        const name = Object.entries(UUID).find(([, u]) => u === file)?.[0];
        if (name === brokenFor) return new Response('nope', { status: 500 });
        return Response.json(name === 'stebbias' ? statsFile(72000, 3) : statsFile(36000, 9));
      }
      return new Response(null, { status: 404 });
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    fetchMock.mockReset();
  });

  const run = (auth?: string) => GET(new NextRequest('https://jod.test/api/cron/daily', auth ? { headers: { authorization: auth } } : {}));

  it('turns away a request without the secret', async () => {
    expect((await run()).status).toBe(401);
    expect((await run('Bearer wrong-secret-of-some-length')).status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('keeps the day, leaving out an unreadable file rather than zeroing it', async () => {
    const res = await run(`Bearer ${SECRET}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.failed).toEqual(['joenana']);

    const day = await readDay(body.day);
    expect(Object.keys(day!.counters).sort()).toEqual(['AmmaGaur', 'stebbias']);
    expect(day!.counters.stebbias).toMatchObject({ playTimeTicks: 72000, deaths: 3, mobKills: 7, damageTaken: 30, damageDealt: 60 });
    expect(day!.counters).not.toHaveProperty('joenana');
    expect(store.get(`stats:day:${body.day}`)!.ttl).toBe(400 * 24 * 3600);
  });

  it('saves nothing when no file could be read', async () => {
    fetchMock.mockImplementation(async (url: string) =>
      url.endsWith('/files/info/world/players/stats') ? new Response(null, { status: 502 }) : new Response(null, { status: 404 }));
    expect((await run(`Bearer ${SECRET}`)).status).toBe(502);
    expect(store.size).toBe(0);
  });

  it('reads the board and the counters from the same files', async () => {
    brokenFor = '';
    const stats = await readGameStats('exaroton-test');
    expect(stats.failed).toEqual([]);
    expect(stats.players.find(p => p.username === 'AmmaGaur')).toMatchObject({ playTimeTicks: 36000, deaths: 9 });
    expect(stats.counters.AmmaGaur.playTimeTicks).toBe(36000);
  });
});

describe('the week, from two copies', () => {
  const counters = (play: number, deaths: number, kills: number, taken = 0, dealt = 0) => ({
    playTimeTicks: play, deaths, mobKills: kills, playerKills: 0, travelCm: 1000 * play, damageTaken: taken, damageDealt: dealt, raidWins: 0, recordsPlayed: 0,
  });
  const copy = (day: string, c: Record<string, ReturnType<typeof counters>>) => ({ day, takenAt: `${day}T12:05:00.000Z`, counters: c, failed: [] });

  it('is how much each counter rose between the oldest and the newest copy', () => {
    const week = weekOf([
      copy('2026-10-02', { stebbias: counters(72_000 * 30 + 36_000, 12, 400, 300, 100), joenana: counters(72_000 * 10, 3, 50) }),
      copy('2026-09-28', { stebbias: counters(72_000 * 25, 11, 380, 100, 50), joenana: counters(72_000 * 10, 3, 50) }),
      copy('2026-09-25', { stebbias: counters(72_000 * 20, 10, 300, 50, 25), joenana: counters(72_000 * 9, 3, 40) }),
    ])!;
    expect(week.from).toBe('2026-09-25');
    expect(week.to).toBe('2026-10-02');
    expect(week.players).toEqual([
      { username: 'stebbias', playTimeHours: 10.5, deaths: 2, mobKills: 100, travelCm: 1000 * (72_000 * 10 + 36_000), raidWins: 0, recordsPlayed: 0, damageRatio: 3.3 },
      { username: 'joenana',  playTimeHours: 1,    deaths: 0, mobKills: 10,  travelCm: 1000 * 72_000,                 raidWins: 0, recordsPlayed: 0, damageRatio: 0 },
    ]);
  });

  it('needs two copies from two days', () => {
    expect(weekOf([])).toBeNull();
    expect(weekOf([copy('2026-10-02', { stebbias: counters(1, 1, 1) })])).toBeNull();
    expect(weekOf([copy('2026-10-02', { stebbias: counters(2, 1, 1) }), copy('2026-10-02', { stebbias: counters(1, 1, 1) })])).toBeNull();
  });

  it('leaves out a member missing from either copy, and counts a counter that fell as nothing', () => {
    const week = weekOf([
      copy('2026-10-02', { stebbias: counters(72_000, 0, 5), AmmaGaur: counters(72_000, 0, 0) }),
      copy('2026-09-30', { stebbias: counters(72_000 * 2, 4, 1) }),
    ])!;
    expect(week.players.map(p => p.username)).toEqual(['stebbias']);
    expect(week.players[0]).toMatchObject({ playTimeHours: 0, deaths: 0, mobKills: 4 });
  });
});

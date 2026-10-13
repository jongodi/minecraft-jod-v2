import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/* Redis, in memory */
const kv = new Map<string, string>();
vi.mock('@/lib/redis', () => ({
  rGet: async (k: string) => (kv.has(k) ? JSON.parse(kv.get(k)!) : null),
  rGetStrict: async (k: string) => (kv.has(k) ? JSON.parse(kv.get(k)!) : null),
  rSet: async (k: string, v: unknown) => { kv.set(k, JSON.stringify(v)); },
}));
vi.mock('@/lib/exaroton', () => ({ getExarotonServerId: async () => 'srv' }));
vi.mock('@/lib/stats', () => ({ crewUuids: async () => ({ 'u-stebbi': 'stebbias', 'u-amma': 'AmmaGaur', 'u-jo': 'joenana' }) }));

const adv = await import('@/lib/advancements');

const done = (...times: string[]) => ({ criteria: Object.fromEntries(times.map((t, i) => [`c${i}`, t])), done: true });

describe('reading a player\'s file', () => {
  it('reads the game\'s way of writing a moment', () => {
    expect(adv.gameTime('2024-06-01 20:11:02 +0000')).toBe('2024-06-01T20:11:02.000Z');
    expect(adv.gameTime('2024-06-01 22:11:02 +0200')).toBe('2024-06-01T20:11:02.000Z');
    expect(adv.gameTime('yesterday')).toBeNull();
    expect(adv.gameTime(7)).toBeNull();
  });

  it('dates an advancement by its last criterion, and keeps only the done ones the site can name', () => {
    expect(adv.doneOf({
      'minecraft:husbandry/balanced_diet': done('2024-07-01 20:00:00 +0000', '2024-08-15 21:30:00 +0000', '2024-07-20 19:00:00 +0000'),
      'minecraft:story/mine_diamond': { criteria: { diamond: '2024-06-02 18:00:00 +0000' }, done: false },
      'minecraft:recipes/misc/bread': done('2024-06-01 12:00:00 +0000'),
      'minecraft:story/root': done('2024-06-01 12:00:00 +0000'),
      'blazeandcave:mining/stone': done('2024-06-01 12:00:00 +0000'),
      DataVersion: 4440,
    })).toEqual({ 'minecraft:husbandry/balanced_diet': '2024-08-15T21:30:00.000Z' });
    expect(adv.doneOf(null)).toEqual({});
  });
});

describe('who was first', () => {
  const players = {
    stebbias: { 'minecraft:story/mine_diamond': '2024-06-02T18:00:00.000Z', 'minecraft:story/enter_the_nether': '2024-06-10T20:00:00.000Z' },
    AmmaGaur: { 'minecraft:story/mine_diamond': '2024-06-01T18:00:00.000Z', 'minecraft:story/enter_the_nether': '2024-06-10T20:00:00.000Z' },
    joenana:  { 'minecraft:end/kill_dragon': '2025-01-04T21:00:00.000Z' },
  };

  it('counts the earliest, and both when two share the second', () => {
    expect(adv.firstsOf(players).get('minecraft:story/mine_diamond')).toEqual(['AmmaGaur']);
    expect(adv.firstsOf(players).get('minecraft:story/enter_the_nether')).toEqual(['stebbias', 'AmmaGaur']);
    expect(adv.firstCounts(players)).toEqual({ AmmaGaur: 2, stebbias: 1, joenana: 1 });
  });

  it('lists a member\'s advancements newest first, named, with the ones they were first to', () => {
    const list = adv.wallAdvancements('STEBBIAS', { readAt: '', players });
    expect(list.map(a => [a.id, a.first])).toEqual([
      ['minecraft:story/enter_the_nether', true],
      ['minecraft:story/mine_diamond', false],
    ]);
    expect(list[1]).toMatchObject({ title: 'Demantar!', frame: 'task' });
    expect(adv.wallAdvancements('joenana', { readAt: '', players })[0]).toMatchObject({ frame: 'task', first: true });
    expect(adv.wallAdvancements('nobody', { readAt: '', players })).toEqual([]);
    expect(adv.wallAdvancements('stebbias', null)).toEqual([]);
  });

  it('names every advancement the version ships, roots and recipes left out', () => {
    expect(adv.ADVANCEMENT_COUNT).toBe(121);
    expect(adv.advancementOf('minecraft:nether/all_effects')).toMatchObject({ frame: 'challenge', hidden: true });
    expect(adv.advancementOf('minecraft:story/root')).toBeNull();
  });
});

describe('the daily read', () => {
  const fetchMock = vi.fn();
  const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
  const NOW = new Date('2026-10-13T12:05:00Z');

  beforeEach(() => {
    kv.clear();
    vi.stubGlobal('fetch', fetchMock);
    vi.stubEnv('REDIS_URL', 'redis://test');
  });
  afterEach(() => { fetchMock.mockReset(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

  it('finds the folder where the version keeps it, and a file it cannot read keeps the last copy of it', async () => {
    kv.set('adv:crew', JSON.stringify({ readAt: 'x', players: { AmmaGaur: { 'minecraft:story/mine_stone': '2024-06-01T10:00:00.000Z' }, olddroppedname: {} } }));
    fetchMock.mockImplementation(async (url: string) => {
      if (url.endsWith('info/world/players/advancements')) return reply({}, 404);
      if (url.endsWith('info/world/advancements')) return reply({ data: { children: [{ name: 'u-stebbi.json' }, { name: 'u-amma.json' }] } });
      if (url.endsWith('u-stebbi.json')) return reply({ 'minecraft:story/mine_diamond': done('2024-06-02 18:00:00 +0000') });
      if (url.endsWith('u-amma.json')) return reply({}, 500);
      throw new Error(`unexpected ${url}`);
    });
    expect(await adv.refreshAdvancements('t', NOW)).toEqual({ read: ['stebbias'], failed: ['AmmaGaur'] });
    expect(JSON.parse(kv.get('adv:crew')!)).toEqual({
      readAt: NOW.toISOString(),
      players: {
        AmmaGaur: { 'minecraft:story/mine_stone': '2024-06-01T10:00:00.000Z' },
        stebbias: { 'minecraft:story/mine_diamond': '2024-06-02T18:00:00.000Z' },
      },
    });
    /* joenana never played on this world: no file was asked for */
    expect(fetchMock.mock.calls.some(([u]) => String(u).includes('u-jo'))).toBe(false);
  });

  it('writes nothing when no file could be read, and throws when there is no folder', async () => {
    fetchMock.mockImplementation(async (url: string) =>
      url.includes('info/world/players/advancements') ? reply({ data: { children: [{ name: 'u-amma.json' }] } }) : reply({}, 500));
    expect(await adv.refreshAdvancements('t', NOW)).toEqual({ read: [], failed: ['AmmaGaur'] });
    expect(kv.has('adv:crew')).toBe(false);

    fetchMock.mockImplementation(async () => reply({}, 404));
    await expect(adv.refreshAdvancements('t', NOW)).rejects.toThrow('advancements folder not found');
  });
});

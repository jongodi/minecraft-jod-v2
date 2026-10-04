import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EMPTY, type PlayerStat } from '@/lib/stats';

/* A stats file that could not be read this time is not a player who has
   never played: the board keeps their last numbers, and the snapshot the
   board falls back on (and the wall's bounty) is not overwritten with zeros. */

const stat = (username: string, hours: number): PlayerStat => ({ username, ...EMPTY, playTimeHours: hours, playTimeTicks: hours * 72000 });
let read: { players: PlayerStat[]; counters: object; failed: string[] };
const cache = { players: [stat('stebbias', 80), stat('joenana', 120)], cachedAt: '2026-10-01T12:05:00.000Z' };
const saved: PlayerStat[][] = [];

vi.mock('@/lib/stats', async (orig) => ({
  ...(await orig<typeof import('@/lib/stats')>()),
  readGameStats: vi.fn(async () => read),
  getCachedStats: vi.fn(async () => cache),
  setCachedStats: vi.fn(async (players: PlayerStat[]) => { saved.push(players); }),
  readWeek: vi.fn(async () => null),
  withDraws: vi.fn(async (players: PlayerStat[]) => players),
}));

const { GET } = await import('../../app/api/stats/route');

describe('/api/stats', () => {
  beforeEach(() => { vi.stubEnv('EXAROTON_API_KEY', 'k'); saved.length = 0; });
  afterEach(() => { vi.unstubAllEnvs(); });

  it('keeps the last numbers of a member whose file could not be read', async () => {
    read = { players: [stat('stebbias', 81), { username: 'joenana', ...EMPTY }], counters: {}, failed: ['joenana'] };
    const body = await (await GET()).json() as { players: PlayerStat[] };
    expect(body.players.find(p => p.username === 'joenana')?.playTimeHours).toBe(120);
    expect(body.players.find(p => p.username === 'stebbias')?.playTimeHours).toBe(81);
    expect(saved).toEqual([]);
  });

  it('saves the snapshot when every file was read', async () => {
    read = { players: [stat('stebbias', 81), stat('joenana', 121)], counters: {}, failed: [] };
    await GET();
    expect(saved).toHaveLength(1);
  });
});

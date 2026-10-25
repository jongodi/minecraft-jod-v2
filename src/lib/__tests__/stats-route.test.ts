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
  withCharges: vi.fn(async (players: PlayerStat[]) => players),
}));

const { GET } = await import('../../app/api/stats/route');

describe('/api/stats', () => {
  beforeEach(() => { vi.stubEnv('EXAROTON_API_KEY', 'k'); saved.length = 0; });
  afterEach(() => { vi.unstubAllEnvs(); });

  it('keeps the last numbers of a member whose file could not be read', async () => {
    read = { players: [stat('stebbias', 81), { username: 'joenana', ...EMPTY }], counters: { stebbias: {} }, failed: ['joenana'] };
    const body = await (await GET()).json() as { players: PlayerStat[] };
    expect(body.players.find(p => p.username === 'joenana')?.playTimeHours).toBe(120);
    expect(body.players.find(p => p.username === 'stebbias')?.playTimeHours).toBe(81);
  });

  /* a member who renamed is never found again; the rest of the crew's numbers must still move */
  it('saves the snapshot with them kept, not frozen and not zeroed', async () => {
    read = { players: [stat('stebbias', 81), { username: 'joenana', ...EMPTY }], counters: { stebbias: {} }, failed: ['joenana'] };
    await GET();
    expect(saved).toHaveLength(1);
    expect(saved[0].find(p => p.username === 'joenana')?.playTimeHours).toBe(120);
    expect(saved[0].find(p => p.username === 'stebbias')?.playTimeHours).toBe(81);
  });

  it('saves nothing when no file came through', async () => {
    read = { players: [{ username: 'stebbias', ...EMPTY }, { username: 'joenana', ...EMPTY }], counters: {}, failed: ['stebbias', 'joenana'] };
    await GET();
    expect(saved).toEqual([]);
  });

  it('saves the snapshot when every file was read', async () => {
    read = { players: [stat('stebbias', 81), stat('joenana', 121)], counters: { stebbias: {}, joenana: {} }, failed: [] };
    await GET();
    expect(saved).toHaveLength(1);
  });

  it('lets the CDN keep a fallback answer a minute, so a failing exaroton is not asked on every view', async () => {
    const { readGameStats } = await import('@/lib/stats');
    vi.mocked(readGameStats).mockRejectedValueOnce(new Error('exaroton down'));
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const res = await GET();
    expect((await res.json()).source).toBe('cached');
    expect(res.headers.get('Cache-Control')).toContain('s-maxage=60');
  });
});

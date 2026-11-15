import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/* a store with the two things the beat asks of it: a key set only if it is free, and a key taken away */
const keys = new Map<string, string>();
vi.mock('@/lib/redis', () => ({
  getRedis: () => ({
    set: async (k: string, v: string, ...opts: (string | number)[]) => {
      if (opts.includes('NX') && keys.has(k)) return null;
      keys.set(k, v);
      return 'OK';
    },
    del: async (k: string) => (keys.delete(k) ? 1 : 0),
  }),
}));
const reads: string[] = [];
let fail = false;
vi.mock('@/lib/advancements', () => ({
  refreshAdvancements: async (_token: string, now: Date) => {
    if (fail) throw new Error('files unreachable');
    reads.push(now.toISOString());
    return { read: [], failed: [] };
  },
}));

const { advancementsBeat, crewOnline } = await import('@/lib/advancements-beat');

const status = (names: string[], extra: Record<string, unknown> = {}) => ({
  source: 'exaroton' as const, online: true,
  players: { online: names.length, max: 20, list: names.map(name => ({ name, uuid: name })) },
  ...extra,
});
const empty = { source: 'exaroton' as const, online: false };
const at = (hhmm: string) => new Date(`2026-11-15T${hhmm}:00.000Z`);

describe('how many of the crew an answer shows in', () => {
  it('counts the crew, whatever the case, and nobody else', () => {
    expect(crewOnline(status(['STEBBIAS', 'joenana', 'Herobrine']))).toBe(2);
    expect(crewOnline(empty)).toBe(0);
  });

  it('cannot say from a failed lookup or the fallback', () => {
    expect(crewOnline({ source: 'error', online: false })).toBeNull();
    expect(crewOnline({ ...status(['stebbias']), source: 'mcsrvstat' })).toBeNull();
  });
});

describe('the advancements read while the crew plays', () => {
  beforeEach(() => {
    keys.clear(); reads.length = 0; fail = false;
    vi.stubEnv('EXAROTON_API_KEY', 'key');
    vi.stubEnv('REDIS_URL', 'redis://test');
  });
  afterEach(() => { vi.unstubAllEnvs(); });

  it('reads when one of the crew is first seen in, and not again within the half hour', async () => {
    expect(await advancementsBeat(status(['stebbias']), at('20:00'))).toBe('read');
    expect(await advancementsBeat(status(['stebbias', 'joenana']), at('20:05'))).toBe('idle');
    expect(reads).toEqual(['2026-11-15T20:00:00.000Z']);
  });

  it('reads again once the half hour is up', async () => {
    await advancementsBeat(status(['stebbias']), at('20:00'));
    keys.delete('adv:beat');   // the store lets the key go after BEAT_S
    expect(await advancementsBeat(status(['stebbias']), at('20:30'))).toBe('read');
    expect(reads).toHaveLength(2);
  });

  it('reads once more on the first beat that finds the world empty, and then leaves it alone', async () => {
    await advancementsBeat(status(['stebbias']), at('20:00'));
    expect(await advancementsBeat(empty, at('20:10'))).toBe('read');
    expect(await advancementsBeat(empty, at('20:15'))).toBe('idle');
    expect(await advancementsBeat(status([]), at('20:20'))).toBe('idle');
    expect(reads).toEqual(['2026-11-15T20:00:00.000Z', '2026-11-15T20:10:00.000Z']);
  });

  it('never reads a world none of the crew has been in', async () => {
    expect(await advancementsBeat(status(['Herobrine']), at('20:00'))).toBe('idle');
    expect(await advancementsBeat(empty, at('20:05'))).toBe('idle');
    expect(reads).toEqual([]);
  });

  it('does not take an answer that cannot say who is in for an empty world', async () => {
    await advancementsBeat(status(['stebbias']), at('20:00'));
    expect(await advancementsBeat({ source: 'error', online: false }, at('20:05'))).toBe('idle');
    /* the note that someone was in is still there for the beat that can say */
    expect(await advancementsBeat(empty, at('20:10'))).toBe('read');
  });

  it('raises a read that failed, for the job to log', async () => {
    fail = true;
    await expect(advancementsBeat(status(['stebbias']), at('20:00'))).rejects.toThrow('files unreachable');
  });

  it('is off without the key or the store', async () => {
    vi.stubEnv('EXAROTON_API_KEY', '');
    expect(await advancementsBeat(status(['stebbias']), at('20:00'))).toBe('off');
    expect(reads).toEqual([]);
  });
});

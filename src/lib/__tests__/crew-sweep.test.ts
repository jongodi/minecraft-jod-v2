import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/* Pictures that went up to a wall's pin slot and were never pinned are swept
   out of the store once they are three days old, and only those: a picture
   any wall names stays, a young one stays, one outside a member's own folder
   stays, and a sweep that cannot read every wall, or would take most of what
   is stored, takes nothing. */
const blobs: Array<{ url: string; pathname: string; uploadedAt: Date }> = [];
const deleted: string[] = [];
let walls: Array<string | null> = [];
let wallsDown = false;
vi.mock('@vercel/blob', () => ({
  list: vi.fn(async ({ prefix }: { prefix: string }) => ({ blobs: blobs.filter(b => b.pathname.startsWith(prefix)), hasMore: false })),
  del: vi.fn(async (urls: string[]) => { deleted.push(...urls); }),
}));
vi.mock('@/lib/redis', () => ({
  getRedis: () => ({ mget: async () => { if (wallsDown) throw new Error('ECONNRESET'); return walls; } }),
}));

const { planSweep, pinnedPaths, sweepUnpinned, SWEEP_AFTER_MS } = await import('@/lib/crew-sweep');
const { CREW_USERNAMES } = await import('@/lib/crew-types');

const NOW = Date.parse('2026-10-11T12:05:00Z');
const DAY = 24 * 3600_000;
const STORE = 'https://abc123.public.blob.vercel-storage.com';
const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const print = (user: string, n: number, ageDays: number, ext = 'webp') => {
  const pathname = `crew/${user}/${uuid(n)}.${ext}`;
  return { url: `${STORE}/${pathname}`, pathname, uploadedAt: new Date(NOW - ageDays * DAY) };
};
const wallWith = (...filenames: string[]) => JSON.stringify({ username: 'x', entries: [{ id: 'e', photos: filenames.map((f, i) => ({ id: String(i), filename: f })) }] });

describe('planning a sweep', () => {
  it('takes only the old pictures in a member folder that no wall names', () => {
    const pinned = print('stebbias', 1, 30), orphan = print('stebbias', 2, 30), young = print('stebbias', 3, 1);
    const plan = planSweep([pinned, orphan, young], pinnedPaths([wallWith(pinned.url)]), NOW);
    expect(plan.remove).toEqual([orphan]);
    expect(plan.old).toBe(2);
  });

  it('waits three days, so a slot still open in a tab keeps its pictures', () => {
    const p = print('joenana', 1, 0);
    const pinned = print('joenana', 2, 30);
    const at = (ms: number) => planSweep([{ ...p, uploadedAt: new Date(NOW - ms) }, pinned], pinnedPaths([wallWith(pinned.url)]), NOW).remove.length;
    expect(at(SWEEP_AFTER_MS - 60_000)).toBe(0);
    expect(at(SWEEP_AFTER_MS + 60_000)).toBe(1);
  });

  it('knows a print by any way a wall names it: its own URL, the proxy, or an older shape', () => {
    const a = print('stebbias', 1, 30), b = print('AmmaGaur'.toLowerCase(), 2, 30), c = print('eikibleiki', 3, 30, 'png'), keep = print('joenana', 4, 30);
    const named = pinnedPaths([
      wallWith(a.url),
      wallWith(`/api/blob/${b.pathname}`),
      JSON.stringify({ username: 'eikibleiki', photos: [{ id: 'old', filename: `/api/blob/${c.pathname.toUpperCase()}` }] }),
      wallWith(keep.url),
    ]);
    expect(planSweep([a, b, c, keep], named, NOW).remove).toEqual([]);
  });

  it('leaves alone what is not a member folder or not named as the pin slot names it', () => {
    const pinned = print('stebbias', 9, 30);
    const stranger = print('someone_else', 1, 30);
    const other = { url: `${STORE}/crew/stebbias/legacy-photo.png`, pathname: 'crew/stebbias/legacy-photo.png', uploadedAt: new Date(NOW - 30 * DAY) };
    expect(planSweep([pinned, stranger, other], pinnedPaths([wallWith(pinned.url)]), NOW).remove).toEqual([]);
  });

  it('takes nothing when no wall names any picture, which looks like a read gone wrong', () => {
    const plan = planSweep([print('stebbias', 1, 30)], pinnedPaths(['', '']), NOW);
    expect(plan.remove).toEqual([]);
    expect(plan.held).toMatch(/no wall/);
  });

  it('takes nothing when it would take most of what is stored, above a handful', () => {
    const pinned = Array.from({ length: 5 }, (_, i) => print('stebbias', i, 30));
    const orphans = Array.from({ length: 11 }, (_, i) => print('joenana', 100 + i, 30));
    const plan = planSweep([...pinned, ...orphans], pinnedPaths([wallWith(...pinned.map(p => p.url))]), NOW);
    expect(plan.remove).toEqual([]);
    expect(plan.held).toBe('11 of 16 would go');
    /* a handful is taken even when it is most of a small store */
    const few = planSweep([pinned[0], ...orphans.slice(0, 3)], pinnedPaths([wallWith(pinned[0].url)]), NOW);
    expect(few.remove).toHaveLength(3);
  });
});

describe('sweeping the store', () => {
  beforeEach(() => {
    vi.stubEnv('BLOB_READ_WRITE_TOKEN', 'vercel_blob_rw_abc123_secret');
    vi.stubEnv('REDIS_URL', 'redis://test');
    blobs.length = 0; deleted.length = 0; wallsDown = false;
    walls = CREW_USERNAMES.map(() => null);
  });
  afterEach(() => { vi.unstubAllEnvs(); });

  it('deletes the old unpinned pictures and nothing else', async () => {
    const pinned = print('stebbias', 1, 40), orphan = print('stebbias', 2, 40), young = print('joenana', 3, 1);
    blobs.push(pinned, orphan, young, { url: `${STORE}/gallery/x.png`, pathname: 'gallery/x.png', uploadedAt: new Date(NOW - 90 * DAY) });
    walls[0] = wallWith(`/api/blob/${pinned.pathname}`);
    vi.spyOn(console, 'log').mockImplementation(() => {});
    expect(await sweepUnpinned(NOW)).toEqual({ stored: 3, old: 2, removed: 1, held: null });
    expect(deleted).toEqual([orphan.url]);
  });

  it('deletes nothing when the walls cannot be read', async () => {
    blobs.push(print('stebbias', 1, 40));
    wallsDown = true;
    await expect(sweepUnpinned(NOW)).rejects.toThrow();
    expect(deleted).toEqual([]);
  });

  it('does nothing without a picture store', async () => {
    vi.stubEnv('BLOB_READ_WRITE_TOKEN', '');
    blobs.push(print('stebbias', 1, 40));
    expect(await sweepUnpinned(NOW)).toBeNull();
    expect(deleted).toEqual([]);
  });
});

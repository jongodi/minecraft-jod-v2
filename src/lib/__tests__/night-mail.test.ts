import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Night } from '@/lib/play-night';

/* Redis, in memory: strings, hashes and sets */
const kv = new Map<string, string>();
const hashes = new Map<string, Map<string, string>>();
const sets = new Map<string, Set<string>>();
const hash = (k: string) => { if (!hashes.has(k)) hashes.set(k, new Map()); return hashes.get(k)!; };
const set = (k: string) => { if (!sets.has(k)) sets.set(k, new Set()); return sets.get(k)!; };
vi.mock('@/lib/redis', () => ({
  getRedis: () => ({
    get: async (k: string) => kv.get(k) ?? null,
    del: async (k: string) => (kv.delete(k) ? 1 : 0),
    hgetall: async (k: string) => Object.fromEntries(hash(k)),
    hset: async (k: string, f: string, v: string) => { hash(k).set(f, v); return 1; },
    hdel: async (k: string, f: string) => (hash(k).delete(f) ? 1 : 0),
    sadd: async (k: string, ...v: string[]) => v.filter(x => !set(k).has(x) && !!set(k).add(x)).length,
    srem: async (k: string, ...v: string[]) => v.filter(x => set(k).delete(x)).length,
    smembers: async (k: string) => [...set(k)],
    expire: async () => 1,
  }),
}));
const readers = [
  { username: 'stebbias', address: 'stebbi@dæmi.is' },
  { username: 'joenana', address: 'jo@dæmi.is' },
  { username: 'AmmaGaur', address: 'amma@dæmi.is' },
];
vi.mock('@/lib/crew-email', () => ({ nightReaders: async () => readers }));

const { dueNotices, recipientsOf, nightLetter, mailNights, mailNightOut } = await import('@/lib/night-mail');

const H = 3600_000;
const iso = (ms: number) => new Date(ms).toISOString();
const night = (over: Partial<Night> = {}): Night => ({
  id: 'n1', by: 'stebbias', createdAt: iso(0), note: '', chosen: null, chosenBy: null, cancelled: false, startedBy: null, outcome: null,
  options: [{ id: 'a', at: iso(100 * H) }, { id: 'b', at: iso(124 * H) }],
  ...over,
});

describe('which letters a night owes', () => {
  it('tells of a fresh fire, and not of an old one', () => {
    expect(dueNotices(night(), 1 * H)).toEqual(['lit']);
    expect(dueNotices(night(), 13 * H)).toEqual([]);
  });

  it('tells when a night of several times is decided, and half an hour before', () => {
    expect(dueNotices(night({ chosen: 'a', chosenBy: 'auto' }), 98 * H)).toEqual(['chosen']);
    expect(dueNotices(night({ chosen: 'a', chosenBy: 'auto' }), 99.6 * H)).toEqual(['chosen', 'soon']);
  });

  it('says nothing more of a night of one time until the half hour', () => {
    const one = night({ chosen: 'a', chosenBy: 'stebbias', options: [{ id: 'a', at: iso(100 * H) }] });
    expect(dueNotices(one, 1 * H)).toEqual(['lit']);
    expect(dueNotices(one, 50 * H)).toEqual([]);
    expect(dueNotices(one, 99.6 * H)).toEqual(['soon']);
  });

  it('sends no half-hour word for a fire lit inside the half hour', () => {
    const late = night({ createdAt: iso(99.8 * H), chosen: 'a', options: [{ id: 'a', at: iso(100 * H) }] });
    expect(dueNotices(late, 99.9 * H)).toEqual(['lit']);
  });

  it('owes nothing once a night is put out, under way or over', () => {
    expect(dueNotices(night({ cancelled: true }), 1 * H)).toEqual([]);
    expect(dueNotices(night({ chosen: 'a', createdAt: iso(99 * H) }), 100.5 * H)).toEqual([]);
    expect(dueNotices(night({ chosen: 'a' }), 107 * H)).toEqual([]);
  });
});

describe('who gets them', () => {
  const names = (rs: { username: string }[]) => rs.map(r => r.username);
  const votes = { stebbias: ['a', 'b'], ammagaur: ['b'], joenana: [] };

  it('a fire lit goes to everyone but the one who lit it', () => {
    expect(names(recipientsOf('lit', night(), votes, readers))).toEqual(['joenana', 'AmmaGaur']);
  });

  it('a night chosen goes to everyone but the one who chose, and to all when it chose itself', () => {
    expect(names(recipientsOf('chosen', night({ chosen: 'b', chosenBy: 'joenana' }), votes, readers))).toEqual(['stebbias', 'AmmaGaur']);
    expect(names(recipientsOf('chosen', night({ chosen: 'b', chosenBy: 'auto' }), votes, readers))).toHaveLength(3);
  });

  it('the half hour goes to those who said they would come to the chosen time', () => {
    expect(names(recipientsOf('soon', night({ chosen: 'b' }), votes, readers))).toEqual(['stebbias', 'AmmaGaur']);
    expect(names(recipientsOf('soon', night({ chosen: 'a' }), votes, readers))).toEqual(['stebbias']);
  });

  it('a fire put out goes to those who said yes to any time, not to the one who put it out', () => {
    expect(names(recipientsOf('out', night(), votes, readers))).toEqual(['AmmaGaur']);
  });
});

describe('the letters', () => {
  const reader = readers[1];

  it('a fire lit lists its times and asks for an answer', () => {
    const m = nightLetter('lit', night({ note: 'Byggjum brúna' }), {}, reader);
    expect(m.to).toBe('jo@dæmi.is');
    expect(m.subject).toBe('stebbias kveikti bál: Byggjum brúna');
    expect(m.text).toContain('„Byggjum brúna“');
    expect(m.text).toContain('kl. 04:00');
    expect(m.text).toContain('Svara: https://jodcraft.world/kvold/n1#hopur');
    expect(m.text).toContain('https://jodcraft.world/crew/joenana');
  });

  it('a night decided carries the calendar entry and who is coming', () => {
    const m = nightLetter('chosen', night({ chosen: 'b', chosenBy: 'auto' }), { stebbias: ['b'], AmmaGaur: ['b'] }, reader);
    expect(m.subject).toMatch(/^Spilakvöldið er ákveðið: /);
    expect(m.text).toContain('2 ætla að mæta: AmmaGaur, stebbias.');
    expect(m.text).toContain('https://jodcraft.world/kvold/n1/dagatal.ics');
  });

  it('the half hour names the others coming, not the reader', () => {
    const m = nightLetter('soon', night({ chosen: 'a' }), { stebbias: ['a'], joenana: ['a'] }, reader);
    expect(m.subject).toBe('Spilakvöldið hefst kl. 04:00');
    expect(m.text).toContain('1 ætlar að mæta: stebbias.');
  });

  it('a fire put out says which evening falls through', () => {
    const m = nightLetter('out', night({ chosen: 'a', note: 'Brúin' }), {}, reader);
    expect(m.subject).toBe('Spilakvöldinu var aflýst: Brúin');
    expect(m.text).toContain('Kvöldið á mánudag 5. jan. kl. 04:00 fellur niður.');
  });
});

describe('sending, once', () => {
  const fetchMock = vi.fn();
  const NOW = Date.parse('2026-10-03T12:00:00Z');
  const ok = () => new Response(JSON.stringify({ data: [{ id: 'e1' }, { id: 'e2' }] }), { status: 200 });
  const lit = (id: string): Night => night({ id, createdAt: iso(NOW - H), options: [{ id: 'a', at: iso(NOW + 48 * H) }, { id: 'b', at: iso(NOW + 72 * H) }] });
  const store = (n: Night) => hash('playnight:nights').set(n.id, JSON.stringify(n));

  beforeEach(() => {
    kv.clear(); hashes.clear(); sets.clear();
    vi.stubGlobal('fetch', fetchMock);
    vi.stubEnv('REDIS_URL', 'redis://test');
    vi.stubEnv('RESEND_API_KEY', 're_test');
  });
  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('sends a letter once however often it is asked', async () => {
    store(lit('n1'));
    fetchMock.mockResolvedValue(ok());
    expect(await mailNights(NOW)).toEqual([{ id: 'n1', kind: 'lit', to: 2 }]);
    expect(await mailNights(NOW + 5 * 60_000)).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).map((m: { to: string[] }) => m.to[0])).toEqual(['jo@dæmi.is', 'amma@dæmi.is']);
  });

  it('lets a letter that did not go be tried again on the next run', async () => {
    store(lit('n2'));
    fetchMock.mockResolvedValueOnce(new Response('{"message":"down"}', { status: 500 })).mockResolvedValueOnce(ok());
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await mailNights(NOW)).toEqual([]);
    expect(await mailNights(NOW)).toEqual([{ id: 'n2', kind: 'lit', to: 2 }]);
  });

  it('sends nothing without a key', async () => {
    vi.stubEnv('RESEND_API_KEY', '');
    store(lit('n3'));
    expect(await mailNights(NOW)).toEqual([]);
    expect(await mailNightOut(lit('n3'), { joenana: ['a'] })).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('tells those who said yes when the fire is put out, once', async () => {
    fetchMock.mockResolvedValue(new Response('{"id":"e1"}', { status: 200 }));
    const n = lit('n4');
    expect(await mailNightOut(n, { stebbias: ['a'], joenana: ['b'], AmmaGaur: [] })).toEqual([{ id: 'n4', kind: 'out', to: 1 }]);
    expect(await mailNightOut(n, { stebbias: ['a'], joenana: ['b'] })).toEqual([]);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).to).toEqual(['jo@dæmi.is']);
  });
});

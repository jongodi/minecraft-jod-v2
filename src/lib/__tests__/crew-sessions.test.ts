import { describe, expect, it, vi } from 'vitest';

/* Every session a member holds is on one list, so a new password (or the
   admin clearing one) signs the other devices out: without that, whoever got
   in on an old link kept the wall for a year, whatever the member changed. */
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => undefined }) }));
const { createCrewSession, deleteCrewSession, revokeCrewSessions } = await import('@/lib/crew');
const g = globalThis as typeof globalThis & { __jodSessions?: Map<string, { username: string }> };
const held = (name: string) => [...(g.__jodSessions ?? new Map()).values()].filter(s => s.username === name).length;

describe('a member’s sessions', () => {
  it('all go on a password change but the one it was changed on', async () => {
    const phone = await createCrewSession('joenana');
    const laptop = await createCrewSession('JOENANA');
    const other = await createCrewSession('stebbias');
    expect(held('joenana')).toBe(2);
    expect(await revokeCrewSessions('joenana', laptop)).toBe(1);
    expect(g.__jodSessions?.has(phone)).toBe(false);
    expect(g.__jodSessions?.has(laptop)).toBe(true);
    expect(g.__jodSessions?.has(other)).toBe(true);
  });

  it('all go when the admin clears the password', async () => {
    await createCrewSession('AmmaGaur');
    await createCrewSession('AmmaGaur');
    expect(await revokeCrewSessions('ammagaur')).toBe(2);
    expect(held('AmmaGaur')).toBe(0);
    expect(await revokeCrewSessions('ammagaur')).toBe(0);
  });

  it('one signed out on its own goes alone', async () => {
    const a = await createCrewSession('Gamla123');
    const b = await createCrewSession('Gamla123');
    await deleteCrewSession(a);
    expect(g.__jodSessions?.has(a)).toBe(false);
    expect(g.__jodSessions?.has(b)).toBe(true);
  });
});

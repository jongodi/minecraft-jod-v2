import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword, passwordProblem, createInvite, consumeInvite, closeInvite, listInvites, INVITE_USES } from '@/lib/crew-access';

describe('passwords', () => {
  it('verifies the password it hashed and nothing else', async () => {
    const hash = await hashPassword('kastali-42');
    expect(hash.startsWith('scrypt$')).toBe(true);
    expect(await verifyPassword('kastali-42', hash)).toBe(true);
    expect(await verifyPassword('kastali-43', hash)).toBe(false);
    expect(await verifyPassword('kastali-42', null)).toBe(false);
    expect(await verifyPassword('kastali-42', 'garbage')).toBe(false);
  });

  it('salts, so the same password never hashes the same twice', async () => {
    expect(await hashPassword('sama')).not.toBe(await hashPassword('sama'));
  });

  it('turns away passwords that are too short, too long or not text', () => {
    expect(passwordProblem('abc')).toMatch(/minnst/);
    expect(passwordProblem('x'.repeat(200))).toMatch(/mest/);
    expect(passwordProblem(42)).toMatch(/texti/);
    expect(passwordProblem('nógu langt')).toBeNull();
  });
});

describe('sign-in links', () => {
  it('carries several devices, then closes', async () => {
    const inv = await createInvite('joenana', 2);
    expect(inv.maxUses).toBe(2);
    expect(await consumeInvite(inv.key)).toBe('joenana');
    expect(await consumeInvite(inv.key)).toBe('joenana');
    expect(await consumeInvite(inv.key)).toBeNull();
    expect(await consumeInvite('not-a-real-key-at-all-xx')).toBeNull();
  });

  it('can be shut early and then drops off the list', async () => {
    const inv = await createInvite('AmmaGaur');
    expect(inv.maxUses).toBe(INVITE_USES);
    expect((await listInvites('ammagaur')).some(i => i.key === inv.key)).toBe(true);
    expect(await closeInvite(inv.key)).toBe(true);
    expect(await consumeInvite(inv.key)).toBeNull();
    expect((await listInvites('AmmaGaur')).some(i => i.key === inv.key)).toBe(false);
  });
});

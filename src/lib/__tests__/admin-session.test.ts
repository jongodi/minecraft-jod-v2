import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ADMIN_SESSION_S, isValidAdminSession, isValidAdminToken, issueAdminSession } from '@/lib/auth';

/* The panel's session: a signed note of when it ends, never the token itself. */
describe('admin session', () => {
  const token = 'a-long-enough-admin-token';
  beforeEach(() => { process.env.ADMIN_TOKEN = token; });
  afterEach(() => { delete process.env.ADMIN_TOKEN; });

  it('issues a session that is not the token and verifies it', async () => {
    const s = await issueAdminSession();
    expect(s).not.toContain(token);
    expect(s).toMatch(/^[0-9a-z]+\.[A-Za-z0-9_-]{40,}$/);
    expect(await isValidAdminSession(s)).toBe(true);
  });

  it('refuses the raw token as a session, as the old cookies carried it', async () => {
    expect(isValidAdminToken(token)).toBe(true);
    expect(await isValidAdminSession(token)).toBe(false);
  });

  it('ends eight hours after it was issued', async () => {
    const now = Date.UTC(2026, 10, 3, 20, 0, 0);
    const s = await issueAdminSession(now);
    expect(await isValidAdminSession(s, now + ADMIN_SESSION_S * 1000 - 1000)).toBe(true);
    expect(await isValidAdminSession(s, now + ADMIN_SESSION_S * 1000 + 1000)).toBe(false);
  });

  it('refuses a session whose end was moved or whose signature is off', async () => {
    const s = await issueAdminSession();
    const [exp, sig] = s.split('.');
    const later = (parseInt(exp, 36) + 3600_000).toString(36);
    expect(await isValidAdminSession(`${later}.${sig}`)).toBe(false);
    expect(await isValidAdminSession(`${exp}.${sig.slice(0, -1)}${sig.endsWith('A') ? 'B' : 'A'}`)).toBe(false);
    expect(await isValidAdminSession('')).toBe(false);
    expect(await isValidAdminSession('nodot')).toBe(false);
  });

  it('is void once the token changes or is unset', async () => {
    const s = await issueAdminSession();
    process.env.ADMIN_TOKEN = 'another-admin-token-xyz';
    expect(await isValidAdminSession(s)).toBe(false);
    delete process.env.ADMIN_TOKEN;
    expect(await isValidAdminSession(s)).toBe(false);
  });
});

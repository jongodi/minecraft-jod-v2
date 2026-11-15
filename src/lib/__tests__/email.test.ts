import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_FROM, cleanEmail, emailProblem, sendEmail, sendEmails } from '@/lib/email';

describe('addresses', () => {
  it('keeps an address trimmed and in lower case', () => {
    expect(cleanEmail('  Jon@Dæmi.IS ')).toBe('jon@dæmi.is');
  });

  it('turns away what is not an address', () => {
    expect(emailProblem('jon@gmail.com')).toBeNull();
    expect(emailProblem(' Jon.Jonsson+jod@simnet.is ')).toBeNull();
    expect(emailProblem('')).toMatch(/vantar/);
    expect(emailProblem('jon')).toMatch(/netfang/);
    expect(emailProblem('jon@gmail')).toMatch(/netfang/);
    expect(emailProblem('jon @gmail.com')).toMatch(/netfang/);
    expect(emailProblem('a@b.is, c@d.is')).toMatch(/netfang/);
    expect(emailProblem(`${'x'.repeat(250)}@b.is`)).toMatch(/mest/);
    expect(emailProblem(42)).toMatch(/texti/);
  });

  it('turns away what looks like an address and no post office takes', () => {
    expect(emailProblem('jon@gmail..com')).toMatch(/netfang/);
    expect(emailProblem('jon..jonsson@gmail.com')).toMatch(/netfang/);
    expect(emailProblem('.jon@gmail.com')).toMatch(/netfang/);
    expect(emailProblem('jon.@gmail.com')).toMatch(/netfang/);
    expect(emailProblem('jon@.gmail.com')).toMatch(/netfang/);
    /* a zero-width space pasted in with the address */
    expect(emailProblem('jon@gmail.com\u200b')).toMatch(/netfang/);
    expect(emailProblem('jo\u00adn@gmail.com')).toMatch(/netfang/);
    expect(emailProblem('jon.jonsson@mail.simnet.is')).toBeNull();
  });
});

describe('sending', () => {
  const fetchMock = vi.fn();
  const mail = (to: string) => ({ to, subject: 'Halló', html: '<p>hæ</p>', text: 'hæ' });
  const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    vi.stubEnv('RESEND_API_KEY', 're_test');
    vi.stubEnv('EMAIL_FROM', '');
    vi.stubEnv('EMAIL_REPLY_TO', '');
  });
  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('sends nothing without a key, and says why', async () => {
    vi.stubEnv('RESEND_API_KEY', '');
    expect(await sendEmail(mail('a@b.is'))).toMatchObject({ sent: false, reason: expect.stringMatching(/RESEND_API_KEY/) });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sends one letter from the default address with the key as a bearer token', async () => {
    fetchMock.mockResolvedValueOnce(ok({ id: 'e1' }));
    expect(await sendEmail(mail('a@b.is'))).toEqual({ sent: true, ids: ['e1'] });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.resend.com/emails');
    expect(init.headers.Authorization).toBe('Bearer re_test');
    const body = JSON.parse(init.body);
    expect(body).toMatchObject({ from: DEFAULT_FROM, to: ['a@b.is'], subject: 'Halló', text: 'hæ' });
    expect(body).not.toHaveProperty('reply_to');
  });

  it('takes the sender and the reply address from the environment', async () => {
    vi.stubEnv('EMAIL_FROM', 'Bálið <bal@jodcraft.world>');
    vi.stubEnv('EMAIL_REPLY_TO', 'hallo@jodcraft.world');
    fetchMock.mockResolvedValueOnce(ok({ id: 'e1' }));
    await sendEmail(mail('a@b.is'));
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({ from: 'Bálið <bal@jodcraft.world>', reply_to: 'hallo@jodcraft.world' });
  });

  it('sends several in one batch, each to its own address', async () => {
    fetchMock.mockResolvedValueOnce(ok({ data: [{ id: 'e1' }, { id: 'e2' }] }));
    expect(await sendEmails([mail('a@b.is'), mail('c@d.is')])).toEqual({ sent: true, ids: ['e1', 'e2'] });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.resend.com/emails/batch');
    expect(JSON.parse(init.body).map((m: { to: string[] }) => m.to)).toEqual([['a@b.is'], ['c@d.is']]);
    expect(await sendEmails([])).toEqual({ sent: true, ids: [] });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('sends a batch refused as invalid again letter by letter, so one bad address does not keep the rest', async () => {
    vi.useFakeTimers();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const refusal = (status: number) => new Response(JSON.stringify({ message: 'Invalid `to` field.' }), { status });
    fetchMock
      .mockResolvedValueOnce(refusal(422))               // the batch
      .mockResolvedValueOnce(ok({ id: 'e1' }))           // a@b.is
      .mockResolvedValueOnce(refusal(422))               // the bad one
      .mockResolvedValueOnce(ok({ id: 'e3' }));          // e@f.is
    const going = sendEmails([mail('a@b.is'), mail('bad@address.is'), mail('e@f.is')]);
    await vi.runAllTimersAsync();
    expect(await going).toEqual({ sent: true, ids: ['e1', 'e3'] });
    expect(fetchMock.mock.calls.map(c => c[0])).toEqual(['https://api.resend.com/emails/batch', 'https://api.resend.com/emails', 'https://api.resend.com/emails', 'https://api.resend.com/emails']);
    /* the log names the address without spelling it out */
    expect(vi.mocked(console.error).mock.calls.flat().join(' ')).toContain('b…@address.is');
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('passes on a refusal that is not about the letters, and a batch nobody of which went', async () => {
    vi.useFakeTimers();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ message: 'Too many requests' }), { status: 429 }));
    expect(await sendEmails([mail('a@b.is'), mail('c@d.is')])).toMatchObject({ sent: false, status: 429 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    fetchMock.mockImplementation(async () => new Response(JSON.stringify({ message: 'Invalid `to` field.' }), { status: 422 }));
    const going = sendEmails([mail('a@b.is'), mail('c@d.is')]);
    await vi.runAllTimersAsync();
    expect(await going).toMatchObject({ sent: false, status: 422 });
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('reports a refusal or a lost connection instead of throwing', async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ message: 'The jodcraft.world domain is not verified.' }), { status: 403 }));
    const refused = await sendEmail(mail('a@b.is'));
    expect(refused).toMatchObject({ sent: false, reason: expect.stringContaining('not verified') });
    fetchMock.mockRejectedValueOnce(new Error('ECONNRESET'));
    expect(await sendEmail(mail('a@b.is'))).toMatchObject({ sent: false });
  });
});

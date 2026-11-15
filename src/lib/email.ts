// Email from the site: sign-in links and word of the play nights, sent
// through Resend (resend.com) from the jodcraft.world domain verified there.
// Server only.
//
// Without RESEND_API_KEY nothing is sent and the caller is told so, which is
// how local development and preview deployments (the key is set for
// production only) stay quiet.

export const DEFAULT_FROM = 'JOÐcraft <hallo@jodcraft.world>';
const API = 'https://api.resend.com';

/** The site's own address, for links in a letter: there is no request to read it off when the cron job writes. */
export const siteUrl = () => (process.env.NEXT_PUBLIC_SITE_URL || 'https://jodcraft.world').replace(/\/$/, '');

export const canSendEmail = () => !!process.env.RESEND_API_KEY;

export interface Mail {
  to:      string;
  subject: string;
  html:    string;
  text:    string;
}

export type SendResult = { sent: true; ids: string[] } | { sent: false; reason: string; /** the service's own status, when it answered */ status?: number };

const NO_KEY = 'Póstur er ekki tengdur (RESEND_API_KEY vantar).';

/* ─── addresses ───────────────────────────────────────────────────────────── */

export const EMAIL_MAX = 254;
const SHAPE = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:".]{2,}$/;

/* What the shape lets through and no post office takes: two dots in a row, a
   dot at either end of the name or at the head of the domain, and letters
   nobody can see (a zero-width space pasted in with the address, a control
   character). The service refuses a letter to such an address, and a letter
   refused took the rest of its batch with it (sendEmails). */
const ODD = /\.\.|^\.|\.@|@\.|[\u0000-\u001f\u007f-\u009f\u00ad\u200b-\u200f\u2028-\u202f\u2060-\u206f\ufeff]/;

/** An address as it is kept: trimmed and in lower case. */
export const cleanEmail = (address: string) => address.trim().toLowerCase();

/** What is wrong with an address someone wants to keep, or null if nothing. */
export function emailProblem(address: unknown): string | null {
  if (typeof address !== 'string') return 'Netfangið verður að vera texti.';
  const a = cleanEmail(address);
  if (!a) return 'Netfang vantar.';
  if (a.length > EMAIL_MAX) return `Netfangið má mest vera ${EMAIL_MAX} stafir.`;
  if (!SHAPE.test(a) || ODD.test(a)) return 'Þetta lítur ekki út eins og netfang.';
  return null;
}

/* ─── sending ─────────────────────────────────────────────────────────────── */

const fields = (m: Mail) => {
  const replyTo = process.env.EMAIL_REPLY_TO;
  return {
    from: process.env.EMAIL_FROM || DEFAULT_FROM,
    to: [m.to], subject: m.subject, html: m.html, text: m.text,
    ...(replyTo ? { reply_to: replyTo } : {}),
  };
};

async function post(path: string, body: unknown): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { sent: false, reason: NO_KEY };
  let res: Response;
  try {
    res = await fetch(`${API}${path}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return { sent: false, reason: 'Náði ekki sambandi við póstþjónustuna.' };
  }
  const data = await res.json().catch(() => null) as { id?: string; data?: { id: string }[]; message?: string } | null;
  if (!res.ok) {
    console.error(`[email] Resend answered ${res.status}: ${data?.message ?? 'no message'}`);
    return { sent: false, status: res.status, reason: `Pósturinn fór ekki (${res.status}${data?.message ? `: ${data.message}` : ''}).` };
  }
  return { sent: true, ids: data?.id ? [data.id] : (data?.data ?? []).map(d => d.id) };
}

/** One letter to one address. */
export const sendEmail = (mail: Mail) => post('/emails', fields(mail));

/* the service takes two requests a second: letters sent one by one keep under it */
const ONE_BY_ONE_MS = 600;
/** An address as a log may carry it: "j…@simnet.is". */
const masked = (address: string) => address.replace(/^(.)[^@]*/, '$1…');

/** Several letters in one request, each to its own address, so nobody sees
    who else it went to and the service's rate limit is asked once.

    The service refuses a whole batch for one letter it will not take (an
    address it finds wrong), and the play nights' letters go as a batch that
    is tried again every five minutes until it goes: one such address kept
    every letter of every night from everyone, with a line in the log the
    only sign. A batch refused as invalid (400 or 422) is sent again letter
    by letter, and counts as sent if any of them went; the ones refused are
    logged by their masked address. A refusal that is not about the letters
    (the key, the domain, the rate limit) is passed on as it is. */
export async function sendEmails(mails: Mail[]): Promise<SendResult> {
  if (mails.length === 0) return { sent: true, ids: [] };
  if (mails.length === 1) return sendEmail(mails[0]);
  const batch = await post('/emails/batch', mails.map(fields));
  if (batch.sent || (batch.status !== 400 && batch.status !== 422)) return batch;
  const ids: string[] = [];
  let last = batch;
  for (const [i, mail] of mails.entries()) {
    if (i > 0) await new Promise(resolve => setTimeout(resolve, ONE_BY_ONE_MS));
    const one = await sendEmail(mail);
    if (one.sent) ids.push(...one.ids);
    else { last = one; console.error(`[email] no letter to ${masked(mail.to)}: ${one.reason}`); }
  }
  return ids.length ? { sent: true, ids } : last;
}

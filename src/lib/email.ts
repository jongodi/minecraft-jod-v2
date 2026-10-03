// Email from the site: sign-in links and word of the play nights, sent
// through Resend (resend.com) from the jodcraft.world domain verified there.
// Server only.
//
// Without RESEND_API_KEY nothing is sent and the caller is told so, which is
// how local development and preview deployments (the key is set for
// production only) stay quiet.

export const DEFAULT_FROM = 'JOÐ <hallo@jodcraft.world>';
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

export type SendResult = { sent: true; ids: string[] } | { sent: false; reason: string };

const NO_KEY = 'Póstur er ekki tengdur (RESEND_API_KEY vantar).';

/* ─── addresses ───────────────────────────────────────────────────────────── */

export const EMAIL_MAX = 254;
const SHAPE = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:".]{2,}$/;

/** An address as it is kept: trimmed and in lower case. */
export const cleanEmail = (address: string) => address.trim().toLowerCase();

/** What is wrong with an address someone wants to keep, or null if nothing. */
export function emailProblem(address: unknown): string | null {
  if (typeof address !== 'string') return 'Netfangið verður að vera texti.';
  const a = cleanEmail(address);
  if (!a) return 'Netfang vantar.';
  if (a.length > EMAIL_MAX) return `Netfangið má mest vera ${EMAIL_MAX} stafir.`;
  if (!SHAPE.test(a)) return 'Þetta lítur ekki út eins og netfang.';
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
    return { sent: false, reason: `Pósturinn fór ekki (${res.status}${data?.message ? `: ${data.message}` : ''}).` };
  }
  return { sent: true, ids: data?.id ? [data.id] : (data?.data ?? []).map(d => d.id) };
}

/** One letter to one address. */
export const sendEmail = (mail: Mail) => post('/emails', fields(mail));

/** Several letters in one request, each to its own address, so nobody sees
    who else it went to and the service's rate limit is asked once. */
export async function sendEmails(mails: Mail[]): Promise<SendResult> {
  if (mails.length === 0) return { sent: true, ids: [] };
  if (mails.length === 1) return sendEmail(mails[0]);
  return post('/emails/batch', mails.map(fields));
}

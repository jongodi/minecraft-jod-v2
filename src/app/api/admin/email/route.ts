// The letters, from the admin's side (Póstur): each one as it will arrive,
// which look it wears, and a test sent to any address.
//   GET                      the letters, their looks and subjects
//   GET ?kind=&theme=        one letter as HTML, for the preview frame
//                            (&fonts=0 without the site's fonts, as Gmail shows it)
//   PUT { kind, theme }      the look a letter wears from now on
//   POST { kind, theme, to } a test, with made-up words, to `to`
import { NextRequest, NextResponse } from 'next/server';
import { badJson, jsonObject } from '@/lib/http';
import { requireAdmin, unauthorizedResponse } from '@/lib/auth';
import { MAIL_KINDS, MAIL_NAMES, type MailKind } from '@/lib/email-copy';
import { THEMES, THEME_NAMES, isTheme, renderLetter, type Theme } from '@/lib/email-design';
import { readThemes, setTheme } from '@/lib/email-settings';
import { sampleLetter } from '@/lib/email-samples';
import { getNames } from '@/lib/crew-email';
import { canSendEmail, emailProblem, sendEmail, siteUrl } from '@/lib/email';

export const dynamic = 'force-dynamic';

const isKind = (v: unknown): v is MailKind => typeof v === 'string' && (MAIL_KINDS as string[]).includes(v);

export interface AdminMail { kind: MailKind; name: string; when: string; theme: Theme; subject: string; preheader: string }
export interface AdminMailResponse { mails: AdminMail[]; themes: { id: Theme; name: string }[]; canSend: boolean }

export async function GET(req: NextRequest) {
  if (!(await requireAdmin())) return unauthorizedResponse();
  const kind = req.nextUrl.searchParams.get('kind');
  const theme = req.nextUrl.searchParams.get('theme');
  /* the preview is drawn from this site, so it shows before the letters' pictures are live */
  const here = req.nextUrl.origin;

  if (kind !== null || theme !== null) {
    if (!isKind(kind) || !isTheme(theme)) return NextResponse.json({ error: 'Óþekkt bréf eða útlit.' }, { status: 400 });
    const { html } = renderLetter(sampleLetter(kind, here, await getNames()), theme, here, { webFonts: req.nextUrl.searchParams.get('fonts') !== '0' });
    return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
  }

  const [themes, names] = await Promise.all([readThemes(), getNames()]);
  const mails = MAIL_KINDS.map(k => {
    const l = sampleLetter(k, here, names);
    return { kind: k, ...MAIL_NAMES[k], theme: themes[k], subject: l.subject, preheader: l.preheader };
  });
  return NextResponse.json({ mails, themes: THEMES.map(t => ({ id: t, name: THEME_NAMES[t] })), canSend: canSendEmail() } satisfies AdminMailResponse, { headers: { 'Cache-Control': 'no-store' } });
}

export async function PUT(req: NextRequest) {
  if (!(await requireAdmin())) return unauthorizedResponse();
  const body = await jsonObject(req);
  if (!body) return badJson();
  if (!isKind(body.kind) || !isTheme(body.theme)) return NextResponse.json({ error: 'Óþekkt bréf eða útlit.' }, { status: 400 });
  await setTheme(body.kind, body.theme);
  return NextResponse.json({ ok: true, themes: await readThemes() });
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return unauthorizedResponse();
  const body = await jsonObject(req);
  if (!body) return badJson();
  if (!isKind(body.kind)) return NextResponse.json({ error: 'Óþekkt bréf.' }, { status: 400 });
  const problem = emailProblem(body.to);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });
  if (!canSendEmail()) return NextResponse.json({ error: 'Póstur er ekki tengdur (RESEND_API_KEY vantar).' }, { status: 503 });

  const theme = isTheme(body.theme) ? body.theme : (await readThemes())[body.kind];
  /* a real letter's pictures and links point at the live site */
  const site = siteUrl();
  const { subject, html, text } = renderLetter(sampleLetter(body.kind, site, await getNames()), theme, site);
  const sent = await sendEmail({ to: (body.to as string).trim(), subject: `[Prufa] ${subject}`, html, text });
  if (!sent.sent) return NextResponse.json({ error: sent.reason }, { status: 502 });
  return NextResponse.json({ ok: true });
}

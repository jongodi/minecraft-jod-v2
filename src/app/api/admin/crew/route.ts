// The crew, from the admin's side: who has a token, how much hangs on each
// wall, each member's email address, and a sign-in link (with its QR code,
// or by post) for any member.
import { NextRequest, NextResponse } from 'next/server';
import { badJson, jsonObject } from '@/lib/http';
import QRCode from 'qrcode';
import { requireAdmin, unauthorizedResponse } from '@/lib/auth';
import { readAllProfiles, allPhotos, createInvite, closeInvite, listInvites, inviteUrl, getCrewToken, isCrewUsername, canonicalUsername, type Invite } from '@/lib/crew';
import { hasPassword, setPasswordHash } from '@/lib/crew-access';
import { getEmail, getNames, mailSignInLink, updateContact, type CrewEmail } from '@/lib/crew-email';
import { canSendEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

export interface AdminCrewRow {
  username:    string;
  hasToken:    boolean;
  hasPassword: boolean;
  entryCount:  number;
  photoCount:  number;
  lastEntry:   string | null;
  /** where sign-in links and word of the play nights go; null without one */
  email:       CrewEmail | null;
  /** what the letters call them; null uses the username */
  name:        string | null;
  /** open sign-in links, newest first */
  invites:     Array<Omit<Invite, 'key'> & { url: string }>;
}

export async function GET(req: NextRequest) {
  if (!(await requireAdmin())) return unauthorizedResponse();
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? req.nextUrl.origin;
  const names = await getNames();
  const rows: AdminCrewRow[] = await Promise.all((await readAllProfiles()).map(async p => ({
    username:    p.username,
    hasToken:    !!getCrewToken(p.username),
    hasPassword: await hasPassword(p.username),
    entryCount:  p.entries.length,
    photoCount:  allPhotos(p).length,
    lastEntry:   p.entries[0]?.createdAt ?? null,
    email:       await getEmail(p.username),
    name:        names[p.username.toLowerCase()] ?? null,
    invites:     (await listInvites(p.username)).map(({ key, ...inv }) => ({ ...inv, url: inviteUrl(origin, key) })),
  })));
  return NextResponse.json(rows, { headers: { 'Cache-Control': 'no-store' } });
}

export interface InviteResponse {
  url: string; expiresAt: string; maxUses: number; svg: string;
  /** the address the link was mailed to, when it was sent by post */
  sentTo?: string;
}

const qr = (url: string) => QRCode.toString(url, { type: 'svg', errorCorrectionLevel: 'M', margin: 1, color: { dark: '#1E1611', light: '#E8DCC4' } });

/** A new sign-in link for a member: good for a week and a handful of devices.
    With `send: true` it is mailed to the member's address instead of only shown. */
export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return unauthorizedResponse();
  let body: { username?: unknown; maxUses?: unknown; send?: unknown };
  { const parsed = await jsonObject(req); if (!parsed) return badJson(); body = parsed; }
  if (typeof body.username !== 'string' || !isCrewUsername(body.username)) return NextResponse.json({ error: 'Þessi félagi er ekki á listanum.' }, { status: 400 });

  const username = canonicalUsername(body.username);
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? req.nextUrl.origin;
  if (body.send === true) {
    if (!(await getEmail(username))) return NextResponse.json({ error: `${username} er ekki með netfang. Settu það inn fyrst.` }, { status: 409 });
    if (!canSendEmail()) return NextResponse.json({ error: 'Póstur er ekki tengdur (RESEND_API_KEY vantar).' }, { status: 503 });
    const mailed = await mailSignInLink(username, origin);
    if (!mailed.sent) return NextResponse.json({ error: mailed.reason }, { status: 502 });
    const { invite, url } = mailed;
    return NextResponse.json({ url, expiresAt: invite.expiresAt, maxUses: invite.maxUses, svg: await qr(url), sentTo: mailed.to } satisfies InviteResponse, { status: 201 });
  }
  const inv = await createInvite(username, typeof body.maxUses === 'number' ? body.maxUses : undefined);
  const url = inviteUrl(origin, inv.key);
  return NextResponse.json({ url, expiresAt: inv.expiresAt, maxUses: inv.maxUses, svg: await qr(url) } satisfies InviteResponse, { status: 201 });
}

/** A member's name and email address: `{ username, name, email, nights }`;
    an empty name or address clears it, a field left out is left alone. */
export async function PUT(req: NextRequest) {
  if (!(await requireAdmin())) return unauthorizedResponse();
  let body: { username?: unknown; email?: unknown; nights?: unknown; name?: unknown };
  { const parsed = await jsonObject(req); if (!parsed) return badJson(); body = parsed; }
  if (typeof body.username !== 'string' || !isCrewUsername(body.username)) return NextResponse.json({ error: 'Þessi félagi er ekki á listanum.' }, { status: 400 });

  const problem = await updateContact(body.username, body);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });
  return NextResponse.json({ ok: true });
}

/** Close a link early (`{ url }`), or clear a member's password (`{ username, password: null }`) when they have forgotten it. */
export async function DELETE(req: NextRequest) {
  if (!(await requireAdmin())) return unauthorizedResponse();
  let body: { url?: unknown; username?: unknown; password?: unknown };
  { const parsed = await jsonObject(req); if (!parsed) return badJson(); body = parsed; }

  if (typeof body.url === 'string') {
    let key = '';
    try { key = new URL(body.url).searchParams.get('lykill') ?? ''; } catch { /* not a url */ }
    if (!key || !(await closeInvite(key))) return NextResponse.json({ error: 'Tengillinn fannst ekki.' }, { status: 404 });
    return NextResponse.json({ ok: true });
  }
  if (typeof body.username === 'string' && body.password === null) {
    if (!isCrewUsername(body.username)) return NextResponse.json({ error: 'Þessi félagi er ekki á listanum.' }, { status: 400 });
    await setPasswordHash(body.username, null);
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: 'Vantar tengil eða félaga.' }, { status: 400 });
}

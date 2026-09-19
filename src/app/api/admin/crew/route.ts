// The crew, from the admin's side: who has a token, how much hangs on each
// wall, and a one-time sign-in link (with its QR code) for any member.
import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { requireAdmin, unauthorizedResponse } from '@/lib/auth';
import { readAllProfiles, allPhotos, createInvite, closeInvite, listInvites, inviteUrl, getCrewToken, isCrewUsername, canonicalUsername, type Invite } from '@/lib/crew';
import { hasPassword, setPasswordHash } from '@/lib/crew-access';

export const dynamic = 'force-dynamic';

export interface AdminCrewRow {
  username:    string;
  hasToken:    boolean;
  hasPassword: boolean;
  entryCount:  number;
  photoCount:  number;
  lastEntry:   string | null;
  /** open sign-in links, newest first */
  invites:     Array<Omit<Invite, 'key'> & { url: string }>;
}

export async function GET(req: NextRequest) {
  if (!(await requireAdmin())) return unauthorizedResponse();
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? req.nextUrl.origin;
  const rows: AdminCrewRow[] = await Promise.all((await readAllProfiles()).map(async p => ({
    username:    p.username,
    hasToken:    !!getCrewToken(p.username),
    hasPassword: await hasPassword(p.username),
    entryCount:  p.entries.length,
    photoCount:  allPhotos(p).length,
    lastEntry:   p.entries[0]?.createdAt ?? null,
    invites:     (await listInvites(p.username)).map(({ key, ...inv }) => ({ ...inv, url: inviteUrl(origin, key) })),
  })));
  return NextResponse.json(rows, { headers: { 'Cache-Control': 'no-store' } });
}

export interface InviteResponse { url: string; expiresAt: string; maxUses: number; svg: string }

/** A new sign-in link for a member: good for a week and a handful of devices. */
export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return unauthorizedResponse();
  let body: { username?: unknown; maxUses?: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Ógilt JSON.' }, { status: 400 }); }
  if (typeof body.username !== 'string' || !isCrewUsername(body.username)) return NextResponse.json({ error: 'Þessi félagi er ekki á listanum.' }, { status: 400 });

  const username = canonicalUsername(body.username);
  const inv = await createInvite(username, typeof body.maxUses === 'number' ? body.maxUses : undefined);
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? req.nextUrl.origin;
  const url = inviteUrl(origin, inv.key);
  const svg = await QRCode.toString(url, { type: 'svg', errorCorrectionLevel: 'M', margin: 1, color: { dark: '#1E1611', light: '#E8DCC4' } });
  return NextResponse.json({ url, expiresAt: inv.expiresAt, maxUses: inv.maxUses, svg } satisfies InviteResponse, { status: 201 });
}

/** Close a link early (`{ url }`), or clear a member's password (`{ username, password: null }`) when they have forgotten it. */
export async function DELETE(req: NextRequest) {
  if (!(await requireAdmin())) return unauthorizedResponse();
  let body: { url?: unknown; username?: unknown; password?: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Ógilt JSON.' }, { status: 400 }); }

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

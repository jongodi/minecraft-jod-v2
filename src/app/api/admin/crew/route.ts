// The crew, from the admin's side: who has a token, how much hangs on each
// wall, and a one-time sign-in link (with its QR code) for any member.
import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { requireAdmin, unauthorizedResponse } from '@/lib/auth';
import { readAllProfiles, allPhotos, createInvite, getCrewToken, isCrewUsername, canonicalUsername } from '@/lib/crew';

export const dynamic = 'force-dynamic';

export interface AdminCrewRow {
  username:   string;
  hasToken:   boolean;
  entryCount: number;
  photoCount: number;
  lastEntry:  string | null;
}

export async function GET() {
  if (!(await requireAdmin())) return unauthorizedResponse();
  const rows: AdminCrewRow[] = (await readAllProfiles()).map(p => ({
    username:   p.username,
    hasToken:   !!getCrewToken(p.username),
    entryCount: p.entries.length,
    photoCount: allPhotos(p).length,
    lastEntry:  p.entries[0]?.createdAt ?? null,
  }));
  return NextResponse.json(rows, { headers: { 'Cache-Control': 'no-store' } });
}

export interface InviteResponse { url: string; expiresAt: string; svg: string }

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return unauthorizedResponse();
  let body: { username?: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Ógilt JSON.' }, { status: 400 }); }
  if (typeof body.username !== 'string' || !isCrewUsername(body.username)) return NextResponse.json({ error: 'Þessi félagi er ekki á listanum.' }, { status: 400 });

  const username = canonicalUsername(body.username);
  const { key, expiresAt } = await createInvite(username);
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? req.nextUrl.origin;
  const url = `${origin.replace(/\/$/, '')}/api/crew/invite?lykill=${key}`;
  const svg = await QRCode.toString(url, { type: 'svg', errorCorrectionLevel: 'M', margin: 1, color: { dark: '#1E1611', light: '#E8DCC4' } });
  return NextResponse.json({ url, expiresAt, svg } satisfies InviteResponse, { status: 201 });
}

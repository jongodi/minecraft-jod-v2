import { NextResponse } from 'next/server';
import type { ChatLine } from '@/lib/chat';
import { chatLines } from '@/lib/chat-server';
import { readAllProfiles } from '@/lib/crew';
import { readStoredAdvancements } from '@/lib/advancements';
import { readNights } from '@/lib/play-night';
import { readMap } from '@/lib/map';
import { titleCase } from '@/components/badlands/data';

/* Spjallið: what happened on JOÐ lately, as the game's chat prints it over
   the world (src/lib/chat-server.ts, Chat.tsx). Asked for once the page is idle,
   never with it. The same for everyone, so it is shared at the CDN for a
   minute; each source that can't be read is left out rather than failing
   the rest. */

export interface ChatResponse { lines: ChatLine[] }

export async function GET() {
  const [walls, advancements, nights, map] = await Promise.all([
    readAllProfiles().catch(() => []),
    readStoredAdvancements(),
    process.env.REDIS_URL ? readNights().catch(() => []) : Promise.resolve([]),
    readMap().catch(() => null),
  ]);
  const places = new Map((map?.locations ?? []).map(l => [l.id, titleCase(l.label)]));
  return NextResponse.json(
    { lines: chatLines({ walls, advancements, nights, places }) } satisfies ChatResponse,
    { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=600' } },
  );
}

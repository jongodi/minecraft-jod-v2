import { NextRequest, NextResponse } from 'next/server';
import { readBoard } from '@/lib/board';
import { stampsOf, type BoardBrief } from '@/lib/board-types';

export const dynamic = 'force-dynamic';

/* Taflan (src/lib/board.ts): everything on the board, newest first, with the
   places a post can be pinned at. The same for everyone; signed-in members'
   own changes (a post, a lantern, a vote) are drawn on the board in the
   browser from their own answers, so the whole board is never kept stale
   behind them. `?brief=1` is only when and by whom (each item and each
   reply), for the count on the door's lantern on every page: that one is
   shared at the CDN for half a minute. */
export async function GET(req: NextRequest) {
  const board = await readBoard();
  if (req.nextUrl.searchParams.get('brief') === '1') {
    const brief: BoardBrief = { stamps: stampsOf(board.items) };
    return NextResponse.json(brief, { headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=300' } });
  }
  return NextResponse.json(board, { headers: { 'Cache-Control': 'no-store' } });
}

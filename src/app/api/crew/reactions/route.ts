// Photo reactions API
// GET  /api/crew/reactions?photoId=xxx  — returns { "🔥": 3, "💚": 1, ... }
// POST /api/crew/reactions               — { photoId, emoji } — toggle reaction (requires auth)

import { NextRequest, NextResponse } from 'next/server';
import { getCrewSession } from '@/lib/crew';
import { checkRateLimit } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

const ALLOWED_EMOJIS = ['🔥', '💚', '⚔️', '🏗️', '👑', '💀'];

function reactionKey(photoId: string) {
  return `crew:reactions:${photoId}`;
}
function userVoteKey(photoId: string, username: string) {
  return `crew:reactions:voted:${photoId}:${username.toLowerCase()}`;
}

function hasRedis() {
  return !!process.env.REDIS_URL;
}

export async function GET(req: NextRequest) {
  const photoId = req.nextUrl.searchParams.get('photoId');
  if (!photoId) return NextResponse.json({});
  if (!hasRedis()) return NextResponse.json({});

  try {
    const { getRedis } = await import('@/lib/redis');
    const redis = getRedis();
    const raw = await redis.hgetall(reactionKey(photoId));
    const result: Record<string, number> = {};
    for (const [emoji, count] of Object.entries(raw ?? {})) {
      result[emoji] = parseInt(count as string, 10) || 0;
    }
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({});
  }
}

export async function POST(req: NextRequest) {
  const session = await getCrewSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const { limited } = await checkRateLimit(ip, 'reactions', { max: 30, windowSeconds: 60 });
  if (limited) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

  const { photoId, emoji } = await req.json() as { photoId?: string; emoji?: string };
  if (!photoId || !emoji || !ALLOWED_EMOJIS.includes(emoji)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  if (!hasRedis()) return NextResponse.json({ error: 'Storage unavailable' }, { status: 503 });

  try {
    const { getRedis } = await import('@/lib/redis');
    const redis = getRedis();
    const voteKey = userVoteKey(photoId, session.username);

    // Check if already voted this emoji → toggle off
    const existing = await redis.hget(voteKey, 'emoji');
    if (existing === emoji) {
      // Remove vote
      await redis.hincrby(reactionKey(photoId), emoji, -1);
      await redis.del(voteKey);
    } else {
      // Remove old vote if any
      if (existing && ALLOWED_EMOJIS.includes(existing)) {
        await redis.hincrby(reactionKey(photoId), existing, -1);
      }
      // Add new vote
      await redis.hincrby(reactionKey(photoId), emoji, 1);
      await redis.hset(voteKey, 'emoji', emoji);
    }

    // Return updated counts
    const raw = await redis.hgetall(reactionKey(photoId));
    const result: Record<string, number> = {};
    for (const [e, count] of Object.entries(raw ?? {})) {
      const n = parseInt(count as string, 10) || 0;
      if (n > 0) result[e] = n;
    }
    return NextResponse.json(result);
  } catch (e) {
    console.error('Reactions error:', e);
    return NextResponse.json({ error: 'Storage error' }, { status: 500 });
  }
}

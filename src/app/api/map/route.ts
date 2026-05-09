import { NextResponse } from 'next/server';
import { readMap } from '@/lib/map';

export const dynamic = 'force-dynamic';

export async function GET() {
  const cfg = await readMap();
  return NextResponse.json(cfg);
}

import { NextResponse } from 'next/server';
import { readMap } from '@/lib/map';

export async function GET() {
  const cfg = await readMap();
  return NextResponse.json(cfg);
}

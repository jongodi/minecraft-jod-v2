import { NextResponse } from 'next/server';
import { requireAdmin, unauthorizedResponse } from '@/lib/auth';
import { getAnalytics } from '@/lib/analytics';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!(await requireAdmin())) return unauthorizedResponse();
  const data = await getAnalytics();
  return NextResponse.json(data);
}

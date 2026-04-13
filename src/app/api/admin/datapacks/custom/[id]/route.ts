import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, unauthorizedResponse } from '@/lib/auth';
import { deleteCustomPack } from '@/lib/custom-datapacks';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin())) return unauthorizedResponse();
  const { id } = await params;
  const numId = Number(id);
  if (!Number.isInteger(numId) || numId < 1000) {
    return NextResponse.json({ error: 'invalid id — only custom packs (id ≥ 1000) can be deleted' }, { status: 400 });
  }
  await deleteCustomPack(numId);
  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, unauthorizedResponse } from '@/lib/auth';
import { getAllPacks } from '@/lib/custom-datapacks';

const KV_KEY = 'datapacks:versions';

/** Returns id→version override map stored in Redis. */
async function readOverrides(): Promise<Record<number, string>> {
  if (!process.env.REDIS_URL) return {};
  try {
    const { rGet } = await import('@/lib/redis');
    return (await rGet<Record<number, string>>(KV_KEY)) ?? {};
  } catch { return {}; }
}

async function writeOverrides(overrides: Record<number, string>): Promise<void> {
  if (!process.env.REDIS_URL) return;
  const { rSet } = await import('@/lib/redis');
  await rSet(KV_KEY, overrides);
}

// GET — return all packs (static + custom) with effective currentVersion (override → default)
export async function GET(_req: NextRequest) {
  if (!(await requireAdmin())) return unauthorizedResponse();
  const [all, overrides] = await Promise.all([getAllPacks(), readOverrides()]);
  return NextResponse.json(
    all.map(p => ({
      id:             p.id,
      name:           p.name,
      source:         p.source,
      currentVersion: overrides[p.id] ?? p.currentVersion ?? null,
      isOverridden:   overrides[p.id] !== undefined,
      isCustom:       p.id >= 1000,
    }))
  );
}

// PUT — save version overrides; body: { versions: { [id: string]: string } }
export async function PUT(req: NextRequest) {
  if (!(await requireAdmin())) return unauthorizedResponse();
  const { versions } = await req.json() as { versions?: Record<string, string> };
  if (!versions || typeof versions !== 'object') {
    return NextResponse.json({ error: 'versions object required' }, { status: 400 });
  }

  // Only keep entries for known pack IDs (static + custom) and non-empty values
  const validIds = new Set((await getAllPacks()).map(p => String(p.id)));
  const cleaned: Record<number, string> = {};
  for (const [id, ver] of Object.entries(versions)) {
    if (validIds.has(id) && typeof ver === 'string' && ver.trim()) {
      cleaned[Number(id)] = ver.trim();
    }
  }

  await writeOverrides(cleaned);
  return NextResponse.json({ ok: true });
}

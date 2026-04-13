import { NextResponse } from 'next/server';
import { requireAdmin, unauthorizedResponse } from '@/lib/auth';
import { getExarotonServerId } from '@/lib/exaroton';
import { DATAPACKS } from '@/data/datapacks';

export const dynamic = 'force-dynamic';

const KV_KEY = 'datapacks:versions';

export interface RefreshResult {
  scanned:   string[];
  matched:   Array<{ id: number; name: string; version: string; filename: string }>;
  unmatched: string[];
  updated:   number;
}

// "hopo-better-mineshaft-1.3.6-datapack.zip"
//   → { slug: "hopo-better-mineshaft", version: "1.3.6-datapack" }
function parseFilename(filename: string): { slug: string; version: string } | null {
  const base  = filename.replace(/\.zip$/i, '');
  const parts = base.split('-');
  const vi    = parts.findIndex(p => /^\d/.test(p));
  if (vi <= 0) return null;
  return { slug: parts.slice(0, vi).join('-'), version: parts.slice(vi).join('-') };
}

function normalizeForMatch(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '-');
}

export async function POST() {
  if (!(await requireAdmin())) return unauthorizedResponse();

  const token = process.env.EXAROTON_API_KEY;
  if (!token) {
    return NextResponse.json({ error: 'EXAROTON_API_KEY not configured' }, { status: 503 });
  }

  try {
    const id = await getExarotonServerId(token);

    const listRes = await fetch(
      `https://api.exaroton.com/v1/servers/${id}/files/info/world/datapacks`,
      { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' }
    );
    if (!listRes.ok) {
      return NextResponse.json(
        { error: 'datapacks folder not found — is the server online and world loaded?' },
        { status: 404 }
      );
    }

    const listData = await listRes.json() as {
      data?: { children?: Array<{ name: string; isDirectory: boolean }> }
    };
    const zipFiles = (listData.data?.children ?? [])
      .filter(f => !f.isDirectory && f.name.endsWith('.zip'))
      .map(f => f.name);

    const matched:   RefreshResult['matched'] = [];
    const unmatched: string[]                 = [];

    for (const filename of zipFiles) {
      const parsed = parseFilename(filename);
      if (!parsed) { unmatched.push(filename); continue; }

      const pack =
        DATAPACKS.find(p => p.modrinthSlug === parsed.slug) ??
        DATAPACKS.find(p => normalizeForMatch(p.name) === parsed.slug);

      if (pack) matched.push({ id: pack.id, name: pack.name, version: parsed.version, filename });
      else      unmatched.push(filename);
    }

    // Merge into existing overrides, count actual changes
    let existing: Record<number, string> = {};
    if (process.env.REDIS_URL) {
      try {
        const { rGet } = await import('@/lib/redis');
        existing = (await rGet<Record<number, string>>(KV_KEY)) ?? {};
      } catch { /* non-fatal */ }
    }

    let updated = 0;
    const newOverrides = { ...existing };
    for (const m of matched) {
      if (newOverrides[m.id] !== m.version) { newOverrides[m.id] = m.version; updated++; }
    }

    if (updated > 0 && process.env.REDIS_URL) {
      const { rSet } = await import('@/lib/redis');
      await rSet(KV_KEY, newOverrides);
    }

    return NextResponse.json({ scanned: zipFiles, matched, unmatched, updated } satisfies RefreshResult);

  } catch (err) {
    console.error('Datapack refresh failed:', err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unexpected error' },
      { status: 500 }
    );
  }
}

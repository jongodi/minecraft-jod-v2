import { errorMessage } from '@/lib/icelandic';
import { NextResponse } from 'next/server';
import { extractVersion } from '@/lib/datapack-version';
import { requireAdmin, unauthorizedResponse } from '@/lib/auth';
import { getExarotonServerId } from '@/lib/exaroton';
import { getPacksView, saveSettings } from '@/lib/datapacks-store';

export const dynamic = 'force-dynamic';

export interface RefreshResult {
  scanned:   string[];
  matched:   Array<{ id: number; name: string; version: string | null; filename: string }>;
  unmatched: string[];
  updated:   number;
}

function normalizeForMatch(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '-');
}

// Legacy slug parser — fallback for well-named files without a serverFile match.
// "dungeons-and-taverns-5.2.0.zip" → { slug: "dungeons-and-taverns", version: "5.2.0" }
function parseSlugVersion(filename: string): { slug: string; version: string } | null {
  const base  = filename.replace(/\.zip$/i, '');
  const parts = base.split('-');
  const vi    = parts.findIndex(p => /^\d/.test(p));
  if (vi <= 0) return null;
  return { slug: parts.slice(0, vi).join('-'), version: parts.slice(vi).join('-') };
}

export async function POST() {
  if (!(await requireAdmin())) return unauthorizedResponse();

  const token = process.env.EXAROTON_API_KEY;
  if (!token) {
    return NextResponse.json({ error: 'EXAROTON_API_KEY hefur ekki verið stilltur.' }, { status: 503 });
  }

  try {
    const id = await getExarotonServerId(token);

    const listRes = await fetch(
      `https://api.exaroton.com/v1/servers/${id}/files/info/world/datapacks`,
      { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' }
    );
    if (!listRes.ok) {
      return NextResponse.json(
        { error: 'Gagnapakkamappan fannst ekki. Er kveikt á þjóninum og heimurinn hlaðinn?' },
        { status: 404 }
      );
    }

    const listData = await listRes.json() as {
      data?: { children?: Array<{ name: string; isDirectory?: boolean }> }
    };
    // Include both .zip files and extracted folders
    const entries = (listData.data?.children ?? [])
      .filter(f => f.name.endsWith('.zip') || f.isDirectory)
      .map(f => f.name);

    const allPacks = await getPacksView();
    const matched:   RefreshResult['matched'] = [];
    const unmatched: string[]                 = [];

    for (const filename of entries) {
      const lower = filename.toLowerCase();

      // 1. Try serverFile substring match (case-insensitive)
      let matchedPack = allPacks.find(
        p => p.serverFile && lower.includes(p.serverFile.toLowerCase())
      );
      let matchedServerFile = matchedPack?.serverFile;

      // 2. Fall back to slug-based matching for conventionally-named files
      if (!matchedPack) {
        const parsed = parseSlugVersion(filename);
        if (parsed) {
          matchedPack =
            allPacks.find(p => p.modrinthSlug === parsed.slug) ??
            allPacks.find(p => normalizeForMatch(p.name) === parsed.slug);
        }
      }

      if (matchedPack) {
        const version = extractVersion(filename, matchedServerFile);
        matched.push({ id: matchedPack.id, name: matchedPack.name, version, filename });
      } else {
        unmatched.push(filename);
      }
    }

    // Write every version the scan found that differs from what is recorded
    const patch: Record<number, { version: string }> = {};
    for (const m of matched) {
      const current = allPacks.find(p => p.id === m.id)?.currentVersion ?? null;
      if (m.version && m.version !== current) patch[m.id] = { version: m.version };
    }
    const updated = Object.keys(patch).length;
    if (updated > 0) await saveSettings(patch);

    return NextResponse.json({ scanned: entries, matched, unmatched, updated } satisfies RefreshResult);

  } catch (err) {
    console.error('Datapack refresh failed:', err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: errorMessage(err, 'Óvænt villa kom upp.') },
      { status: 500 }
    );
  }
}

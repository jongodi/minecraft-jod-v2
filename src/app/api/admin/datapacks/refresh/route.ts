import { NextResponse } from 'next/server';
import { requireAdmin, unauthorizedResponse } from '@/lib/auth';
import { getExarotonServerId } from '@/lib/exaroton';
import { DATAPACKS } from '@/data/datapacks';

export const dynamic = 'force-dynamic';

const KV_KEY = 'datapacks:versions';

export interface RefreshResult {
  scanned:   string[];
  matched:   Array<{ id: number; name: string; version: string | null; filename: string }>;
  unmatched: string[];
  updated:   number;
}

/**
 * Extract the first version-like string from `tail` (the part of the filename
 * after the known serverFile prefix has been removed).
 *
 * Strategy:
 *  1. Dot-separated semver: "v3.0.5", "3.0.5", "V.3.5.1"   → "3.0.5" / "3.5.1"
 *  2. Hyphen/underscore only (no dots): "v3-0-1", "1_3"     → normalise to "3.0.1" / "1.3"
 *
 * Searching only in the tail (after the known prefix) avoids false matches on
 * MC version strings that often appear in brackets at the start of the filename,
 * e.g. "[1.20.x] More Vanilla Paintings v1.0" — searching after "More Vanilla
 * Paintings" gives " v1.0" which correctly yields "1.0".
 */
function extractVersionFromTail(tail: string): string | null {
  // 1. Dot-separated (stops at non-dot separators, so "3.0.5-1.21" → "3.0.5")
  const dotMatch = tail.match(/[vV]?\.?(\d+\.\d+(?:\.\d+)*)/);
  if (dotMatch) return dotMatch[1];

  // 2. Hyphen/underscore only — convert to dots
  const altMatch = tail.match(/[vV]?\.?(\d+[_-]\d+(?:[_-]\d+)*)/);
  if (altMatch) return altMatch[1].replace(/[_-]/g, '.');

  return null;
}

function extractVersion(filename: string, serverFile: string | undefined): string | null {
  const base = filename.replace(/\.zip$/i, '');
  if (serverFile) {
    const idx = base.toLowerCase().indexOf(serverFile.toLowerCase());
    if (idx >= 0) return extractVersionFromTail(base.slice(idx + serverFile.length));
  }
  // Fallback: search the whole filename
  return extractVersionFromTail(base);
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
      data?: { children?: Array<{ name: string; isDirectory?: boolean }> }
    };
    // Include both .zip files and extracted folders
    const entries = (listData.data?.children ?? [])
      .filter(f => f.name.endsWith('.zip') || f.isDirectory)
      .map(f => f.name);

    const matched:   RefreshResult['matched'] = [];
    const unmatched: string[]                 = [];

    for (const filename of entries) {
      const lower = filename.toLowerCase();

      // 1. Try serverFile substring match (case-insensitive)
      let matchedPack = DATAPACKS.find(
        p => p.serverFile && lower.includes(p.serverFile.toLowerCase())
      );
      let matchedServerFile = matchedPack?.serverFile;

      // 2. Fall back to slug-based matching for conventionally-named files
      if (!matchedPack) {
        const parsed = parseSlugVersion(filename);
        if (parsed) {
          matchedPack =
            DATAPACKS.find(p => p.modrinthSlug === parsed.slug) ??
            DATAPACKS.find(p => normalizeForMatch(p.name) === parsed.slug);
        }
      }

      if (matchedPack) {
        const version = extractVersion(filename, matchedServerFile);
        matched.push({ id: matchedPack.id, name: matchedPack.name, version, filename });
      } else {
        unmatched.push(filename);
      }
    }

    // Merge into existing overrides; only write entries where a version was extracted
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
      if (m.version && newOverrides[m.id] !== m.version) {
        newOverrides[m.id] = m.version;
        updated++;
      }
    }

    if (updated > 0 && process.env.REDIS_URL) {
      const { rSet } = await import('@/lib/redis');
      await rSet(KV_KEY, newOverrides);
    }

    return NextResponse.json({ scanned: entries, matched, unmatched, updated } satisfies RefreshResult);

  } catch (err) {
    console.error('Datapack refresh failed:', err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unexpected error' },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import { DATAPACKS, type DatapackMeta } from '@/data/datapacks';

export interface DatapackUpdateResult {
  id:              number;
  name:            string;
  source:          'modrinth' | 'github' | 'manual';
  currentVersion:  string | null;
  latestVersion:   string | null;
  updateAvailable: boolean;
  downloadUrl:     string | null;
  modrinthUrl:     string | null;
  changelog:       string | null;
  lastChecked:     string;
  error?:          string;
}

/** Strip leading v/V prefixes so "v1.1" and "1.1" compare equal. */
function normalizeVersion(v: string): string {
  return v.replace(/^[vV]\.?/, '');
}

// ─── Modrinth ────────────────────────────────────────────────────────────────

async function checkModrinth(pack: DatapackMeta): Promise<DatapackUpdateResult> {
  const base: DatapackUpdateResult = {
    id:              pack.id,
    name:            pack.name,
    source:          'modrinth',
    currentVersion:  pack.currentVersion ?? null,
    latestVersion:   null,
    updateAvailable: false,
    downloadUrl:     null,
    modrinthUrl:     `https://modrinth.com/datapack/${pack.modrinthSlug}`,
    changelog:       null,
    lastChecked:     new Date().toISOString(),
  };

  try {
    // Fetch versions filtered by game version and datapack loader
    const params = new URLSearchParams({
      loaders:      JSON.stringify(['datapack']),
      game_versions: JSON.stringify([pack.gameVersion]),
    });
    const url = `https://api.modrinth.com/v2/project/${pack.modrinthSlug}/version?${params}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'JODCraft-Dashboard/1.0 (play.jodcraft.world)' },
      next: { revalidate: 3600 }, // Cache for 1 hour
    });

    if (!res.ok) {
      // Try without game version filter (some packs don't tag versions properly)
      const res2 = await fetch(
        `https://api.modrinth.com/v2/project/${pack.modrinthSlug}/version?loaders=${encodeURIComponent(JSON.stringify(['datapack']))}`,
        {
          headers: { 'User-Agent': 'JODCraft-Dashboard/1.0 (play.jodcraft.world)' },
          next: { revalidate: 3600 },
        }
      );
      if (!res2.ok) {
        return { ...base, error: `Modrinth returned ${res.status}` };
      }
      const versions = await res2.json();
      return extractModrinthVersion(base, pack, versions);
    }

    const versions = await res.json();
    return extractModrinthVersion(base, pack, versions);
  } catch (err) {
    return { ...base, error: String(err) };
  }
}

interface ModrinthVersion {
  version_number: string;
  changelog:      string | null;
  files?: Array<{ primary: boolean; url: string }>;
}

function extractModrinthVersion(
  base: DatapackUpdateResult,
  pack: DatapackMeta,
  versions: ModrinthVersion[]
): DatapackUpdateResult {
  if (!Array.isArray(versions) || versions.length === 0) {
    return { ...base, error: 'No versions found on Modrinth' };
  }

  // Modrinth returns versions sorted by date descending — first is latest
  const latest        = versions[0];
  const latestVersion = latest.version_number;
  const downloadFile  = latest.files?.find((f) => f.primary) ?? latest.files?.[0];

  const updateAvailable =
    !!pack.currentVersion &&
    normalizeVersion(pack.currentVersion) !== normalizeVersion(latestVersion);

  return {
    ...base,
    latestVersion,
    updateAvailable,
    downloadUrl:  downloadFile?.url ?? null,
    changelog:    latest.changelog ?? null,
    modrinthUrl:  `https://modrinth.com/datapack/${pack.modrinthSlug}`,
  };
}

// ─── GitHub ───────────────────────────────────────────────────────────────────

async function checkGitHub(pack: DatapackMeta): Promise<DatapackUpdateResult> {
  const base: DatapackUpdateResult = {
    id:              pack.id,
    name:            pack.name,
    source:          'github',
    currentVersion:  pack.currentVersion ?? null,
    latestVersion:   null,
    updateAvailable: false,
    downloadUrl:     null,
    modrinthUrl:     null,
    changelog:       null,
    lastChecked:     new Date().toISOString(),
  };

  try {
    const res = await fetch(
      `https://api.github.com/repos/${pack.githubRepo}/releases/latest`,
      {
        headers: {
          'Accept': 'application/vnd.github+json',
          'User-Agent': 'JODCraft-Dashboard/1.0',
          ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
        },
        next: { revalidate: 3600 },
      }
    );

    if (!res.ok) return { ...base, error: `GitHub returned ${res.status}` };

    const release       = await res.json() as { tag_name: string; assets?: Array<{ name: string; browser_download_url: string }>; html_url: string; body?: string };
    const latestVersion = normalizeVersion(release.tag_name);
    const updateAvailable =
      !!pack.currentVersion &&
      normalizeVersion(pack.currentVersion) !== latestVersion;

    // Find first .zip asset (datapack downloads)
    const asset = release.assets?.find((a) =>
      a.name.endsWith('.zip') || a.name.endsWith('.jar')
    );

    return {
      ...base,
      latestVersion,
      updateAvailable,
      downloadUrl: asset?.browser_download_url ?? release.html_url ?? null,
      changelog:   release.body ?? null,
    };
  } catch (err) {
    return { ...base, error: String(err) };
  }
}

// ─── Route handler ────────────────────────────────────────────────────────────

async function getVersionOverrides(): Promise<Record<number, string>> {
  if (!process.env.REDIS_URL) return {};
  try {
    const { rGet } = await import('@/lib/redis');
    return (await rGet<Record<number, string>>('datapacks:versions')) ?? {};
  } catch { return {}; }
}

export async function GET() {
  const overrides = await getVersionOverrides();

  // Merge Redis version overrides into the static pack definitions
  const packs = DATAPACKS.map(p => ({
    ...p,
    currentVersion: overrides[p.id] ?? p.currentVersion,
  }));

  const results = await Promise.all(
    packs.map(async (pack): Promise<DatapackUpdateResult> => {
      if (pack.source === 'modrinth' && pack.modrinthSlug) {
        return checkModrinth(pack);
      }
      if (pack.source === 'github' && pack.githubRepo) {
        return checkGitHub(pack);
      }
      // Manual — no automated checking
      return {
        id:              pack.id,
        name:            pack.name,
        source:          'manual',
        currentVersion:  pack.currentVersion ?? null,
        latestVersion:   null,
        updateAvailable: false,
        downloadUrl:     null,
        modrinthUrl:     null,
        changelog:       null,
        lastChecked:     new Date().toISOString(),
      };
    })
  );

  return NextResponse.json(results);
}

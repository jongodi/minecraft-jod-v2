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

function extractModrinthVersion(
  base: DatapackUpdateResult,
  pack: DatapackMeta,
  versions: any[]
): DatapackUpdateResult {
  if (!Array.isArray(versions) || versions.length === 0) {
    return { ...base, error: 'No versions found on Modrinth' };
  }

  // Modrinth returns versions sorted by date descending — first is latest
  const latest = versions[0];
  const latestVersion = latest.version_number as string;
  const downloadFile = latest.files?.find((f: { primary: boolean }) => f.primary) ?? latest.files?.[0];

  const updateAvailable = !!pack.currentVersion && pack.currentVersion !== latestVersion;

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

    const release = await res.json();
    const latestVersion = (release.tag_name as string).replace(/^v/, '');
    const updateAvailable = !!pack.currentVersion && pack.currentVersion !== latestVersion;

    // Find first .zip asset (datapack downloads)
    const asset = release.assets?.find((a: { name: string }) =>
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

export async function GET() {
  const results = await Promise.all(
    DATAPACKS.map(async (pack): Promise<DatapackUpdateResult> => {
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

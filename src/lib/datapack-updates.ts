// Shared datapack update-checking logic used by both the API route and the
// Vercel Cron job. Keeping it here avoids duplicating the Modrinth / GitHub
// fetch helpers in two different route files.

import { type DatapackMeta } from '@/data/datapacks';
import { getAllPacks } from '@/lib/custom-datapacks';
import { rGet, getRedis } from '@/lib/redis';

export const CACHE_KEY = 'datapacks:update-cache';
export const CACHE_TTL = 7 * 3600; // 7 hours (cron runs every 6h)

// ─── Result type (re-exported so consumers don't import from a route file) ────

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

interface ModrinthVersion {
  version_number: string;
  changelog:      string | null;
  files?: Array<{ primary: boolean; url: string }>;
}

function extractModrinthVersion(
  base: DatapackUpdateResult,
  pack: DatapackMeta,
  versions: ModrinthVersion[],
): DatapackUpdateResult {
  if (!Array.isArray(versions) || versions.length === 0) {
    return { ...base, error: 'No versions found on Modrinth' };
  }
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
    downloadUrl: downloadFile?.url ?? null,
    changelog:   latest.changelog ?? null,
    modrinthUrl: `https://modrinth.com/datapack/${pack.modrinthSlug}`,
  };
}

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
    const params = new URLSearchParams({
      loaders:       JSON.stringify(['datapack']),
      game_versions: JSON.stringify([pack.gameVersion]),
    });
    const url = `https://api.modrinth.com/v2/project/${pack.modrinthSlug}/version?${params}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'JODCraft-Dashboard/1.0 (play.jodcraft.world)' },
    });

    if (!res.ok) {
      const res2 = await fetch(
        `https://api.modrinth.com/v2/project/${pack.modrinthSlug}/version?loaders=${encodeURIComponent(JSON.stringify(['datapack']))}`,
        { headers: { 'User-Agent': 'JODCraft-Dashboard/1.0 (play.jodcraft.world)' } },
      );
      if (!res2.ok) return { ...base, error: `Modrinth returned ${res.status}` };
      return extractModrinthVersion(base, pack, await res2.json());
    }
    return extractModrinthVersion(base, pack, await res.json());
  } catch (err) {
    return { ...base, error: String(err) };
  }
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
          'Accept':     'application/vnd.github+json',
          'User-Agent': 'JODCraft-Dashboard/1.0',
          ...(process.env.GITHUB_TOKEN
            ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
            : {}),
        },
      },
    );
    if (!res.ok) return { ...base, error: `GitHub returned ${res.status}` };

    const release = await res.json() as {
      tag_name: string;
      assets?: Array<{ name: string; browser_download_url: string }>;
      html_url: string;
      body?: string;
    };
    const latestVersion  = normalizeVersion(release.tag_name);
    const updateAvailable =
      !!pack.currentVersion &&
      normalizeVersion(pack.currentVersion) !== latestVersion;
    const asset = release.assets?.find(
      (a) => a.name.endsWith('.zip') || a.name.endsWith('.jar'),
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

// ─── Version overrides (stored by admin in Redis) ─────────────────────────────

async function getVersionOverrides(): Promise<Record<number, string>> {
  if (!process.env.REDIS_URL) return {};
  try {
    return (await rGet<Record<number, string>>('datapacks:versions')) ?? {};
  } catch { return {}; }
}

// ─── Main exported function ───────────────────────────────────────────────────

/** Run live update checks for all installed packs and return results. */
export async function checkAllPackUpdates(): Promise<DatapackUpdateResult[]> {
  const [all, overrides] = await Promise.all([getAllPacks(), getVersionOverrides()]);

  const packs = all.map(p => ({
    ...p,
    currentVersion: overrides[p.id] ?? p.currentVersion,
  }));

  return Promise.all(
    packs.map((pack): Promise<DatapackUpdateResult> => {
      if (pack.source === 'modrinth' && pack.modrinthSlug) return checkModrinth(pack);
      if (pack.source === 'github'   && pack.githubRepo)   return checkGitHub(pack);
      return Promise.resolve({
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
      });
    }),
  );
}

/** Write results to Redis cache. */
export async function cacheUpdateResults(results: DatapackUpdateResult[]): Promise<void> {
  if (!process.env.REDIS_URL) return;
  try {
    await getRedis().set(CACHE_KEY, JSON.stringify(results), 'EX', CACHE_TTL);
  } catch { /* non-fatal */ }
}

/** Read cached results from Redis, or null if not available. */
export async function getCachedUpdateResults(): Promise<DatapackUpdateResult[] | null> {
  if (!process.env.REDIS_URL) return null;
  try {
    return await rGet<DatapackUpdateResult[]>(CACHE_KEY);
  } catch { return null; }
}

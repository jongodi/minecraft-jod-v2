/* Everything the site knows about datapacks, in one place.
   The static list in src/data/datapacks.ts is the seed; custom packs live in
   Redis; per-pack settings (installed version, hidden, glyph, order) live in
   Redis too and apply to both kinds. */
import { DATAPACKS, type DatapackMeta } from '@/data/datapacks';

const SETTINGS_KEY = 'datapacks:settings';
const LEGACY_VERSIONS_KEY = 'datapacks:versions';
const CUSTOM_KEY = 'datapacks:custom';
export const CUSTOM_ID_START = 1000;

export interface PackSettings {
  version?: string;   // the version installed on the server, if it differs from the seed
  hidden?:  boolean;  // not shown on the public site
  glyph?:   string;   // key into PACK_GLYPHS; the pack name is the default
  order?:   number;   // position on the shelf; seed order when missing
}

/** A pack as the admin panel and the public site see it. */
export interface PackView extends DatapackMeta {
  hidden:       boolean;
  glyph:        string | null;
  order:        number;
  isCustom:     boolean;
  isOverridden: boolean;   // the installed version comes from settings, not the seed
}

const hasRedis = () => !!process.env.REDIS_URL;

async function readKey<T>(key: string): Promise<T | null> {
  if (!hasRedis()) return null;
  try {
    const { rGet } = await import('@/lib/redis');
    return await rGet<T>(key);
  } catch { return null; }
}
async function writeKey(key: string, value: unknown): Promise<void> {
  if (!hasRedis()) throw new Error('Geymslan (Redis) er ekki tengd, svo ekkert vistast.');
  const { rSet } = await import('@/lib/redis');
  await rSet(key, value);
}

// ─── custom packs ─────────────────────────────────────────────────────────────

export async function getCustomPacks(): Promise<DatapackMeta[]> {
  return (await readKey<DatapackMeta[]>(CUSTOM_KEY)) ?? [];
}

export async function addCustomPack(data: Omit<DatapackMeta, 'id'>): Promise<DatapackMeta> {
  const existing = await getCustomPacks();
  const nextId = existing.reduce((max, p) => Math.max(max, p.id), CUSTOM_ID_START - 1) + 1;
  const pack: DatapackMeta = { id: nextId, ...data };
  await writeKey(CUSTOM_KEY, [...existing, pack]);
  return pack;
}

export async function updateCustomPack(id: number, data: Partial<Omit<DatapackMeta, 'id'>>): Promise<DatapackMeta | null> {
  const existing = await getCustomPacks();
  const idx = existing.findIndex(p => p.id === id);
  if (idx === -1) return null;
  existing[idx] = { ...existing[idx], ...data, id };
  await writeKey(CUSTOM_KEY, existing);
  return existing[idx];
}

export async function deleteCustomPack(id: number): Promise<void> {
  const existing = await getCustomPacks();
  await writeKey(CUSTOM_KEY, existing.filter(p => p.id !== id));
  const settings = await getSettings();
  if (settings[id]) { delete settings[id]; await writeKey(SETTINGS_KEY, settings); }
}

/** Seed packs plus custom packs, without settings applied. */
export async function getAllPacks(): Promise<DatapackMeta[]> {
  return [...DATAPACKS, ...(await getCustomPacks())];
}

// ─── settings ─────────────────────────────────────────────────────────────────

/** Per-pack settings. Versions saved by the old admin (a flat id → version map) are folded in. */
export async function getSettings(): Promise<Record<number, PackSettings>> {
  const settings = (await readKey<Record<number, PackSettings>>(SETTINGS_KEY)) ?? {};
  const legacy = (await readKey<Record<number, string>>(LEGACY_VERSIONS_KEY)) ?? {};
  for (const [id, version] of Object.entries(legacy)) {
    const n = Number(id);
    if (!settings[n]?.version && version) settings[n] = { ...settings[n], version };
  }
  return settings;
}

/** Merge a patch into the stored settings. `null` for a field clears it. */
export async function saveSettings(patch: Record<number, Partial<Record<keyof PackSettings, unknown>>>): Promise<Record<number, PackSettings>> {
  const settings = await getSettings();
  const known = new Set((await getAllPacks()).map(p => p.id));
  for (const [idStr, fields] of Object.entries(patch)) {
    const id = Number(idStr);
    if (!known.has(id) || !fields || typeof fields !== 'object') continue;
    const next: PackSettings = { ...settings[id] };
    if ('version' in fields) {
      const v = typeof fields.version === 'string' ? fields.version.trim() : '';
      if (v) next.version = v; else delete next.version;
    }
    if ('hidden' in fields) { if (fields.hidden === true) next.hidden = true; else delete next.hidden; }
    if ('glyph' in fields) {
      const g = typeof fields.glyph === 'string' ? fields.glyph.trim() : '';
      if (g) next.glyph = g; else delete next.glyph;
    }
    if ('order' in fields) {
      if (typeof fields.order === 'number' && Number.isFinite(fields.order)) next.order = Math.round(fields.order); else delete next.order;
    }
    if (Object.keys(next).length) settings[id] = next; else delete settings[id];
  }
  await writeKey(SETTINGS_KEY, settings);
  /* keep the old key in step so nothing that still reads it goes stale */
  const versions: Record<number, string> = {};
  for (const [id, s] of Object.entries(settings)) if (s.version) versions[Number(id)] = s.version;
  await writeKey(LEGACY_VERSIONS_KEY, versions);
  return settings;
}

// ─── views ────────────────────────────────────────────────────────────────────

/** Every pack with its settings applied, in shelf order. */
export async function getPacksView(): Promise<PackView[]> {
  const [all, settings] = await Promise.all([getAllPacks(), getSettings()]);
  return all
    .map((p, i) => {
      const s = settings[p.id] ?? {};
      return {
        ...p,
        currentVersion: s.version ?? p.currentVersion,
        hidden:         s.hidden === true,
        glyph:          s.glyph ?? null,
        order:          s.order ?? i + 1,
        isCustom:       p.id >= CUSTOM_ID_START,
        isOverridden:   s.version !== undefined,
      };
    })
    .sort((a, b) => a.order - b.order || a.id - b.id);
}

/** What the public site shows: visible packs only. */
export async function getPublicPacks(): Promise<PackView[]> {
  return (await getPacksView()).filter(p => !p.hidden);
}

/** The fields of a pack that visitors need, with nothing about how it was stored. */
export function toPublicPack(p: PackView) {
  const { source: _s, modrinthSlug: _m, githubRepo: _g, serverFile: _f, isOverridden: _o, ...rest } = p;
  return rest;
}
export type PublicPack = ReturnType<typeof toPublicPack>;

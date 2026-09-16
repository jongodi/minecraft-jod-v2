import type { DatapackMeta, DatapackSource } from '@/data/datapacks';
import type { PackSettings } from '@/lib/datapacks-store';

const SOURCES = new Set<DatapackSource>(['modrinth', 'github', 'manual']);
const MAX = 120;

const clean = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() ? v.trim().slice(0, MAX) : undefined);

/** Read pack fields out of a request body. With `requireAll`, name, description, category and source must be present. */
export function parsePackBody(body: Record<string, unknown>, opts: { requireAll: boolean }):
  { error: string } | { fields: Partial<Omit<DatapackMeta, 'id'>>; settings: Partial<PackSettings> | null } {
  const fields: Partial<Omit<DatapackMeta, 'id'>> = {};
  const name = clean(body.name);
  const description = clean(body.description);
  const category = clean(body.category)?.toUpperCase();
  const source = clean(body.source) as DatapackSource | undefined;

  if (opts.requireAll || body.name !== undefined)        { if (!name) return { error: 'Nafn vantar.' }; fields.name = name; }
  if (opts.requireAll || body.description !== undefined) { if (!description) return { error: 'Lýsingu vantar.' }; fields.description = description; }
  if (opts.requireAll || body.category !== undefined)    { if (!category) return { error: 'Flokk vantar.' }; fields.category = category; }
  if (opts.requireAll || body.source !== undefined) {
    if (!source || !SOURCES.has(source)) return { error: 'Uppruni verður að vera modrinth, github eða manual.' };
    fields.source = source;
  }
  if (body.modrinthSlug !== undefined)   fields.modrinthSlug   = clean(body.modrinthSlug);
  if (body.githubRepo !== undefined)     fields.githubRepo     = clean(body.githubRepo);
  if (body.serverFile !== undefined)     fields.serverFile     = clean(body.serverFile);
  if (body.currentVersion !== undefined) fields.currentVersion = clean(body.currentVersion);
  if (body.gameVersion !== undefined || opts.requireAll) fields.gameVersion = clean(body.gameVersion) ?? '26.1';

  const settings: Partial<PackSettings> = {};
  if (body.glyph !== undefined)  settings.glyph  = clean(body.glyph) ?? '';
  if (body.hidden !== undefined) settings.hidden = body.hidden === true;
  return { fields, settings: Object.keys(settings).length ? settings : null };
}

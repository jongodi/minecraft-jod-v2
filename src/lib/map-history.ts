/* The map's history: every save of the painted map and its places, the last
   30 of them, each with a line saying what changed. writeMap() records them
   (src/lib/map.ts), whether the save came from the editor or from linking a
   photo in the gallery; the admin panel lists them and can restore one, which
   is itself saved as a new version, so a restore can be undone too. Kept in
   Redis only: without it the map lives in a file and there is no history. */
import type { MapConfig, MapLocation } from '@/lib/map-types';

export const HISTORY_KEY = 'map:history';
export const HISTORY_SIZE = 30;

export interface MapVersion {
  id:      string;
  at:      string;
  summary: string;
  config:  MapConfig;
}

export type MapVersionInfo = Omit<MapVersion, 'config'>;

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const nameOf = (l: MapLocation) => l.label.trim() || `staður ${l.id}`;
const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/** What changed from one map to the next, as one Icelandic line. */
export function summarize(prev: MapConfig | null, next: MapConfig): string {
  if (!prev) return 'Kortið eins og það var';
  const parts: string[] = [];
  const before = new Map(prev.locations.map(l => [l.id, l]));
  const after = new Map(next.locations.map(l => [l.id, l]));

  const added = next.locations.filter(l => !before.has(l.id));
  const removed = prev.locations.filter(l => !after.has(l.id));
  const kept = next.locations.filter(l => before.has(l.id)).map(l => [before.get(l.id)!, l] as const);
  const moved = kept.filter(([a, b]) => a.x !== b.x || a.y !== b.y);
  const placed = kept.filter(([a, b]) => !same(a.world, b.world));
  const photo = kept.filter(([a, b]) => (a.photoId ?? null) !== (b.photoId ?? null));
  const edited = kept.filter(([a, b]) => a.label !== b.label || a.sublabel !== b.sublabel || a.type !== b.type || !same(a.builders, b.builders));

  /* one place is named, more are counted */
  const say = (list: readonly (readonly [MapLocation, MapLocation])[] | MapLocation[], one: (n: string) => string, many: (n: number) => string) => {
    if (list.length === 0) return;
    const first = list[0];
    const loc = Array.isArray(first) ? (first as readonly [MapLocation, MapLocation])[1] : first as MapLocation;
    parts.push(list.length === 1 ? one(nameOf(loc)) : many(list.length));
  };
  say(added, n => `nýr staður: ${n}`, k => `${k} nýir staðir`);
  say(removed, n => `eytt: ${n}`, k => `${plural(k, 'stað', 'stöðum')} eytt`);
  say(moved, n => `staður færður: ${n}`, k => `${k} staðir færðir`);
  say(edited, n => `breytt: ${n}`, k => `${plural(k, 'stað', 'stöðum')} breytt`);
  say(placed, n => `hnit í heiminum: ${n}`, k => `hnit í heiminum á ${plural(k, 'stað', 'stöðum')}`);
  say(photo, n => `mynd: ${n}`, k => `myndir á ${plural(k, 'stað', 'stöðum')}`);

  if (!same(prev.zones, next.zones)) parts.push('svæði');
  if (!same(prev.paths ?? [], next.paths ?? [])) parts.push('línur');
  if (!same(prev.terrain, next.terrain)) parts.push('landslag málað');

  if (parts.length === 0) return 'Vistað án breytinga';
  const line = parts.join(', ');
  return line.charAt(0).toLocaleUpperCase('is-IS') + line.slice(1);
}

async function redis() {
  const { getRedis } = await import('@/lib/redis');
  return getRedis();
}

/** Record a save. The first one also records the map as it was before it, so
    the state before the first recorded change can be restored too. */
export async function recordVersion(prev: MapConfig | null, next: MapConfig, note?: string): Promise<void> {
  const r = await redis();
  const now = new Date();
  /* time-ordered, with a few random characters so two saves in one millisecond still differ */
  const idAt = (t: number) => `${t.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const entries: MapVersion[] = [];
  if (prev && (await r.llen(HISTORY_KEY)) === 0) {
    entries.push({ id: idAt(now.getTime() - 1), at: new Date(now.getTime() - 1).toISOString(), summary: 'Kortið eins og það var', config: prev });
  }
  const summary = summarize(prev, next);
  entries.push({ id: idAt(now.getTime()), at: now.toISOString(), summary: note ? `${note}${summary === 'Vistað án breytinga' ? '' : `: ${summary.charAt(0).toLocaleLowerCase('is-IS')}${summary.slice(1)}`}` : summary, config: next });
  await r.lpush(HISTORY_KEY, ...entries.map(e => JSON.stringify(e)));
  await r.ltrim(HISTORY_KEY, 0, HISTORY_SIZE - 1);
}

/** Newest first. */
export async function readHistory(): Promise<MapVersion[]> {
  const raw = await (await redis()).lrange(HISTORY_KEY, 0, HISTORY_SIZE - 1);
  return raw.flatMap(s => { try { return [JSON.parse(s) as MapVersion]; } catch { return []; } });
}

// Prints that went up and were never pinned. The pin slot on a member's wall
// sends each picture to the store the moment it is added, before "Festa upp"
// is pressed; one taken out of the slot is deleted then, but one left in a
// slot whose tab was closed stays in the store with nothing pointing at it.
// The daily job (src/app/api/cron/daily) sweeps those out. Server only.
//
// It errs on the side of keeping a picture. Nothing is deleted unless every
// wall was read; only files in a current member's own folder, named the way
// the pin slot names them, are looked at; a file is left alone until it is
// three days old, so a slot still open in a tab is safe; and a sweep that
// would take most of what is stored, or finds no wall with any picture on it
// at all, takes nothing and says so in the log, since that looks more like a
// read gone wrong than like pictures nobody wanted.
import { CREW_PATH, isCrewUsername } from '@/lib/crew-types';
import { readStoredWalls } from '@/lib/crew';
import { storageMode } from '@/lib/blob-store';

/** how old an unpinned picture must be before it is taken */
export const SWEEP_AFTER_MS = 3 * 24 * 3600_000;
/** never more than this share of the old pictures in one sweep, above a handful */
const MOST = 0.5;
const HANDFUL = 10;

/* A print's path wherever a wall names it: a public blob URL, the site's own
   proxy (/api/blob/crew/...), or a shape older walls kept. */
const PRINT_IN_TEXT = /crew\/[a-z0-9_]+\/[0-9a-f-]{36}\.(?:png|jpe?g|webp|gif|avif)/gi;

export interface StoredPrint { url: string; pathname: string; uploadedAt: Date }

/** The paths of every print the walls name, in lower case. */
export function pinnedPaths(walls: string[]): Set<string> {
  return new Set(walls.flatMap(w => [...w.matchAll(PRINT_IN_TEXT)].map(m => m[0].toLowerCase())));
}

export interface SweepPlan {
  /** pictures in members' folders old enough to be looked at */
  old: number;
  remove: StoredPrint[];
  /** why nothing is taken although some would have been */
  held: string | null;
}

/** What a sweep takes, from what is stored and what the walls name. Pure. */
export function planSweep(stored: StoredPrint[], pinned: Set<string>, now: number): SweepPlan {
  const old = stored.filter(b => {
    const m = CREW_PATH.exec(b.pathname);
    return !!m && isCrewUsername(m[1]) && now - b.uploadedAt.getTime() > SWEEP_AFTER_MS;
  });
  const remove = old.filter(b => !pinned.has(b.pathname.toLowerCase()));
  if (remove.length === 0) return { old: old.length, remove, held: null };
  if (pinned.size === 0) return { old: old.length, remove: [], held: 'no wall names any picture' };
  if (remove.length > HANDFUL && remove.length > old.length * MOST) return { old: old.length, remove: [], held: `${remove.length} of ${old.length} would go` };
  return { old: old.length, remove, held: null };
}

export interface SweepResult { stored: number; old: number; removed: number; held: string | null }

/** Lists the members' pictures, reads every wall, and deletes the old ones no
    wall names. The store is listed first and the walls read after, so a
    picture pinned in the meantime is seen pinned. Throws if the store or a
    wall cannot be read, having deleted nothing. */
export async function sweepUnpinned(now = Date.now()): Promise<SweepResult | null> {
  if (storageMode() !== 'blob') return null;
  const { list, del } = await import('@vercel/blob');
  const stored: StoredPrint[] = [];
  let cursor: string | undefined;
  do {
    const page = await list({ prefix: 'crew/', cursor, limit: 1000 });
    stored.push(...page.blobs);
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);

  const plan = planSweep(stored, pinnedPaths(await readStoredWalls()), now);
  if (plan.held) console.warn(`[crew-sweep] took nothing: ${plan.held}`);
  for (let i = 0; i < plan.remove.length; i += 100) await del(plan.remove.slice(i, i + 100).map(b => b.url));
  if (plan.remove.length) console.log(`[crew-sweep] took ${plan.remove.length} unpinned ${plan.remove.length === 1 ? 'picture' : 'pictures'}: ${plan.remove.map(b => b.pathname).join(', ')}`);
  return { stored: stored.length, old: plan.old, removed: plan.remove.length, held: plan.held };
}

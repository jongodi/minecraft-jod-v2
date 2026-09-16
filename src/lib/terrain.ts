/* The world's terrain: a grid of 20-unit blocks the admin panel paints and the
   site draws. One character per block, one string per row. */

export const TERRAIN_CELL = 20;
export const TERRAIN_COLS = 50;
export const TERRAIN_ROWS = 32;
export const TERRAIN_W = TERRAIN_COLS * TERRAIN_CELL;
export const TERRAIN_H = TERRAIN_ROWS * TERRAIN_CELL;

export type Material = '~' | 's' | 'l' | 'g' | 'r' | 'f';
export const WATER: Material = '~';

export interface MaterialDef { code: Material; label: string; fill: string; hint: string }

/** What the brush can paint. `fill` is the CSS variable the map draws it with. */
export const MATERIALS: readonly MaterialDef[] = [
  { code: '~', label: 'Sjór',   fill: 'var(--map-water)',  hint: 'Haf og vötn' },
  { code: 'l', label: 'Land',   fill: 'var(--map-land)',   hint: 'Slétta' },
  { code: 'g', label: 'Gras',   fill: 'var(--map-grass)',  hint: 'Gróið land' },
  { code: 'f', label: 'Skógur', fill: 'var(--map-forest)', hint: 'Tré' },
  { code: 'r', label: 'Klettar', fill: 'var(--map-rock)',  hint: 'Terracotta-klettar' },
  { code: 's', label: 'Sandur', fill: 'var(--map-sand)',   hint: 'Eyðimörk og strönd' },
];

const CODES = new Set<string>(MATERIALS.map(m => m.code));
export const isMaterial = (ch: string): ch is Material => CODES.has(ch);
export const isWater = (ch: string): boolean => ch === WATER;

export const DEFAULT_TERRAIN: readonly string[] = [
  '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
  '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
  '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
  '~~~~~~~~~~~~~~~~~llgllllllglll~~~~~~~~~~~~~~~~~~~~',
  '~~~~~~~~~~~~llgllllllgllllllgllll~~~~~~~~~~~~~~~~~',
  '~~~~~~~~~llllllllllllllllllllllllll~~~~~~~~~~~~~~~',
  '~~~~~~~llgglllllgglllllgglllllgglllll~~~~~~~~~~~~~',
  '~~~~~~llllllllllllllllllllllllllllllll~~~~~~~~~~~~',
  '~~~~~gllllllgllllllgllllllgllllllglllll~~~~~~~~~~~',
  '~~~~lllgllllllgllllllgll~~llgllllllgllll~~~~~~~~~~',
  '~~~~llllllllllllllllllllllllllllllllllll~~~~~~~~~~',
  '~~~glllllgglllllgglllllgglllllgglllllggl~~llgg~~~~',
  '~~~lllllllllllllllllllllllllllllllllllllllllll~~~~',
  '~~~llgllllllgllllllgllllllgllllllgllllllglllll~~~~',
  '~~~llllgllllllgllllllgllllllgllllllglllll~glll~~~~',
  '~~~llllllllllllllllllllllllllllllllllllll~~~~~~~~~',
  '~~~glllllgglllllgglllllgglllllgglllllggll~~~~~~~~~',
  '~~~llllllllllllllllllllllllllllllllllllll~~~~~~~~~',
  '~~~llgllllllgllllllgllllllgllllllgllllllg~~~~~~~~~',
  '~~~llllgllllllg~lllllgllllllgllllllgllll~~~~~~~~~~',
  '~~~~llllllllllllllllllllllllllllll~lllll~~~~~~~~~~',
  '~~~~lllllgglllllgglllllgglllllgglllllggl~~~~~~~~~~',
  '~~~~~llllllllllllllllllllllllllllllllll~~~~~~~~~~~',
  '~~~~~~llllllgllllllgllllllgllllllglllll~~~~~~~~~~~',
  '~~~~~~~gllllllgllllllgllllllgllllllgll~~~~~~ll~~~~',
  '~~~~~~~~lllllllllllllllllllllllllllll~~~~~~~~~~~~~',
  '~~~g~~~~~~glllllgglllllgglllllggllll~~~~~~~~~~~~~~',
  '~~lll~~~~~~~llllllllllllllllllllll~~~~~~~~~~~~~~~~',
  '~~~~~~~~~~~~~~lllllgllllllglllll~~~~~~~~~~~~~~~~~~',
  '~~~~~~~~~~~~~~~~~~lllgllllllg~~~~~~~~~~~~~~~~~~~~~',
  '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
  '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
];

/** Force any stored value into a grid of the right size, filling gaps with water. */
export function normalizeTerrain(rows?: readonly string[] | null): string[] {
  const grid: string[] = [];
  for (let r = 0; r < TERRAIN_ROWS; r++) {
    const raw = rows?.[r] ?? '';
    let line = '';
    for (let c = 0; c < TERRAIN_COLS; c++) {
      const ch = raw[c] ?? WATER;
      line += isMaterial(ch) ? ch : WATER;
    }
    grid.push(line);
  }
  return grid;
}

const at = (grid: readonly string[], c: number, r: number): string =>
  (r < 0 || r >= TERRAIN_ROWS || c < 0 || c >= TERRAIN_COLS) ? WATER : grid[r][c];

/**
 * The grid as it is drawn: any block that touches water becomes beach, so a
 * coastline always has sand along it without anyone painting it by hand.
 */
export function withBeaches(grid: readonly string[]): string[] {
  return grid.map((row, r) => {
    let line = '';
    for (let c = 0; c < TERRAIN_COLS; c++) {
      const ch = row[c];
      const touchesWater = isWater(at(grid, c - 1, r)) || isWater(at(grid, c + 1, r))
        || isWater(at(grid, c, r - 1)) || isWater(at(grid, c, r + 1));
      line += !isWater(ch) && ch !== 's' && touchesWater ? 's' : ch;
    }
    return line;
  });
}

/** One SVG path per material, with runs of the same block on a row merged into one rectangle. */
export function terrainPaths(grid: readonly string[]): Record<string, string> {
  const out: Record<string, string> = {};
  grid.forEach((row, r) => {
    let c = 0;
    while (c < TERRAIN_COLS) {
      const ch = row[c];
      if (isWater(ch)) { c += 1; continue; }
      let w = 1;
      while (row[c + w] === ch) w += 1;
      out[ch] = (out[ch] ?? '') + `M${c * TERRAIN_CELL} ${r * TERRAIN_CELL}h${w * TERRAIN_CELL}v${TERRAIN_CELL}h-${w * TERRAIN_CELL}z`;
      c += w;
    }
  });
  return out;
}

/** Paint a square brush centred on one block. Returns a new grid. */
export function paint(grid: readonly string[], c0: number, r0: number, size: number, to: Material): string[] {
  const half = Math.floor((size - 1) / 2);
  const next = [...grid];
  let changed = false;
  for (let r = r0 - half; r <= r0 - half + size - 1; r++) {
    if (r < 0 || r >= TERRAIN_ROWS) continue;
    const row = next[r].split('');
    for (let c = c0 - half; c <= c0 - half + size - 1; c++) {
      if (c < 0 || c >= TERRAIN_COLS) continue;
      if (row[c] !== to) { row[c] = to; changed = true; }
    }
    next[r] = row.join('');
  }
  return changed ? next : [...grid];
}

/** Flood fill the connected run of blocks that match the one under the cursor. */
export function fill(grid: readonly string[], c0: number, r0: number, to: Material): string[] {
  const from = at(grid, c0, r0);
  if (from === to) return [...grid];
  const next = grid.map(row => row.split(''));
  const queue: Array<[number, number]> = [[c0, r0]];
  while (queue.length) {
    const [c, r] = queue.pop()!;
    if (r < 0 || r >= TERRAIN_ROWS || c < 0 || c >= TERRAIN_COLS) continue;
    if (next[r][c] !== from) continue;
    next[r][c] = to;
    queue.push([c + 1, r], [c - 1, r], [c, r + 1], [c, r - 1]);
  }
  return next.map(row => row.join(''));
}

/** How much of the world each material covers, for the editor's readout. */
export function terrainCounts(grid: readonly string[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const row of grid) for (const ch of row) counts[ch] = (counts[ch] ?? 0) + 1;
  return counts;
}

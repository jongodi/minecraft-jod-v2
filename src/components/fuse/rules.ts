/** A creeper's fuse: 30 ticks, one and a half seconds. */
export const FUSE_MS = 1500;
const TICK_MS = 50;
export const ROUNDS = 3;
export const WAIT_MIN_MS = 1500;
export const WAIT_MAX_MS = 4000;
export const RESULT_MS = 1400;
const BEST_KEY = 'jodcraft-kveikur-best';

/** A shot is a tick count, or null when the round was lost. */
export type Shot = number | null;

export function ticksFor(ms: number): number {
  return Math.max(1, Math.ceil(ms / TICK_MS));
}

export function tickWord(ticks: number): string {
  return ticks === 1 ? '1 tikk' : `${ticks} tikk`;
}

export function readBest(): number | null {
  try {
    const v = Number(localStorage.getItem(BEST_KEY));
    return v > 0 ? v : null;
  } catch {
    return null;
  }
}

export function writeBest(ticks: number): void {
  try {
    localStorage.setItem(BEST_KEY, String(ticks));
  } catch {
    // Private mode or storage disabled: the game still works, the best is not kept.
  }
}

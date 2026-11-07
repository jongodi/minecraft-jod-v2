/* The three ridges of the badlands behind the hero (Mesa.tsx), as the
   plateaus each outline is stepped from: [width, height] in the drawing's
   480 by 120 grid, left to right, heights measured up from the base. Apart
   from the drawing, so where the signal fire can stand on them is tested
   against the land itself (signal.ts). */
import type { Plateau } from './signal';

export const FAR: Plateau[]  = [[30, 40], [12, 52], [40, 60], [10, 46], [26, 40], [30, 30], [24, 44], [14, 56], [42, 66], [12, 50], [28, 38], [40, 34], [12, 48], [36, 58], [20, 44], [30, 36], [24, 42], [30, 30], [20, 40]];
export const MID: Plateau[]  = [[24, 22], [10, 34], [36, 44], [12, 30], [30, 24], [40, 18], [12, 30], [44, 52], [14, 40], [34, 26], [30, 20], [10, 30], [38, 42], [12, 32], [26, 22], [36, 16], [22, 28], [30, 24], [20, 18]];
export const NEAR: Plateau[] = [[40, 10], [14, 20], [50, 30], [12, 22], [44, 12], [30, 8], [16, 18], [60, 34], [14, 24], [40, 14], [50, 8], [20, 16], [46, 26], [12, 18], [32, 10]];

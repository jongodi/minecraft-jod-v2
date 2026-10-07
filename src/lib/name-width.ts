// How wide a member's name is in the slab (Alfa Slab One), in em, so the
// poster can set it as large as its column allows and never break it. A
// Minecraft name is 3 to 16 of A-Z, a-z, 0-9 and _, so the advance of each of
// those 63 glyphs is the whole story: the face has no kerning, and the sum
// matches the drawn width exactly (measured in Chromium at 1000px).
const ADVANCE: Record<string, number> = {
  A: 0.806, B: 0.775, C: 0.722, D: 0.804, E: 0.713, F: 0.632, G: 0.782, H: 0.84, I: 0.42, J: 0.666, K: 0.835, L: 0.653, M: 1.143,
  N: 0.942, O: 0.792, P: 0.738, Q: 0.81, R: 0.8, S: 0.674, T: 0.78, U: 0.781, V: 0.786, W: 1.207, X: 0.8, Y: 0.776, Z: 0.689,
  a: 0.615, b: 0.662, c: 0.562, d: 0.658, e: 0.594, f: 0.384, g: 0.654, h: 0.696, i: 0.346, j: 0.313, k: 0.678, l: 0.35, m: 1.042,
  n: 0.696, o: 0.632, p: 0.658, q: 0.652, r: 0.527, s: 0.519, t: 0.451, u: 0.686, v: 0.651, w: 0.956, x: 0.636, y: 0.632, z: 0.568,
  0: 0.732, 1: 0.522, 2: 0.649, 3: 0.623, 4: 0.694, 5: 0.651, 6: 0.693, 7: 0.648, 8: 0.7, 9: 0.693, _: 0.6,
};
/* anything outside a Minecraft name is counted as wide as the widest capital, so it can only come out smaller, never break */
const UNKNOWN = 1.21;

/** The name's width in em in the slab, with a hair of room for rounding. */
export function nameEm(name: string): number {
  let em = 0;
  for (const c of name) em += ADVANCE[c] ?? UNKNOWN;
  return Math.round(em * 1.02 * 1000) / 1000;
}

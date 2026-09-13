/** Deterministic noise so the server and the client draw the same lines. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * A closed, slightly irregular ring around an ellipse, like a contour line
 * drawn by hand. Radius wobbles by up to `wobble` of itself; the points are
 * joined with a Catmull-Rom curve so the line has no corners.
 */
export function contourPath(cx: number, cy: number, rx: number, ry: number, seed: number, wobble = 0.06): string {
  const rand = mulberry32(seed);
  const n = 28;
  const pts: Array<[number, number]> = [];
  const offsets = Array.from({ length: n }, () => 1 + (rand() * 2 - 1) * wobble);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    // Average with the neighbours so the wobble is a swell, not a jitter.
    const k = (offsets[(i + n - 1) % n] + offsets[i] + offsets[(i + 1) % n]) / 3;
    pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
  }
  let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i + n - 1) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    const c1: [number, number] = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: [number, number] = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d + ' Z';
}

// The sky cut out of a still of the flight (scripts/map-flight.mjs). The
// recording paints BlueMap's sky and the void past the world's edge exactly
// #FF00FF, so that colour, and only that, is sky: it becomes transparency and
// the page's own night shows round the land. A pixel on the land's edge is
// part land and part sky; only a pixel touching the painted sky can be, so a
// magenta block in the middle of the town is never cut, and for those the
// sky's share is read off how magenta the pixel is (red and blue alike, well
// over green) and taken back out of its colour, so no pink is left round the
// blocks.
//
// Tested in src/lib/__tests__/sky-key.test.ts.

/* how near #FF00FF a pixel is and still all sky */
const PURE = 14;
/* how far from the painted sky an edge pixel can be, in pixels */
const REACH = 2;
/* how magenta an edge pixel must be before any of it is sky, and when it is all sky */
const FROM = 30;
const TO = 220;

/** Cuts the painted sky out of raw RGBA pixels, `width` × `height`, in place, and returns them. */
export function keySky(data, width, height) {
  const n = width * height;
  const sky = new Uint8Array(n);
  for (let p = 0; p < n; p++) {
    const i = p * 4;
    if (255 - data[i] <= PURE && data[i + 1] <= PURE && 255 - data[i + 2] <= PURE) sky[p] = 1;
  }
  /* the pixels touching the sky, where the land's edge is */
  const edge = new Uint8Array(n);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!sky[y * width + x]) continue;
      for (let dy = -REACH; dy <= REACH; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= height) continue;
        for (let dx = -REACH; dx <= REACH; dx++) {
          const xx = x + dx;
          if (xx >= 0 && xx < width) edge[yy * width + xx] = 1;
        }
      }
    }
  }
  for (let p = 0; p < n; p++) {
    const i = p * 4;
    if (sky[p]) { data[i] = data[i + 1] = data[i + 2] = data[i + 3] = 0; continue; }
    if (!edge[p]) continue;
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const low = Math.min(r, b);
    /* the sky mixed into anything keeps red and blue alike */
    const m = Math.abs(r - b) <= low * 0.3 + 10 ? low - g : 0;
    const share = Math.min(1, Math.max(0, (m - FROM) / (TO - FROM)));
    if (share <= 0) continue;
    const a = 1 - share;
    if (a < 0.04) { data[i] = data[i + 1] = data[i + 2] = data[i + 3] = 0; continue; }
    /* what the land's own colour was, before the sky's share was mixed in */
    data[i] = Math.round(Math.min(255, Math.max(0, (r - share * 255) / a)));
    data[i + 1] = Math.round(Math.min(255, Math.max(0, g / a)));
    data[i + 2] = Math.round(Math.min(255, Math.max(0, (b - share * 255) / a)));
    data[i + 3] = Math.round(a * 255);
  }
  return data;
}

// The sky cut out of a still of the flight (scripts/map-flight.mjs). Each
// still is drawn twice, the sky and the void past the world's edge painted
// #FF00FF the first time and #00FF00 the second, and what changed between the
// two is how much of each pixel is sky: land is drawn the same both times,
// however magenta it is, and the rest is sky in the measure it changed, so
// the edge of the land, the band where BlueMap's low-res map fades out into
// the void at the world's edge, and water the void shows through all come out
// part transparent, by no guess at what colour the sky left in them. The two
// keys share no channel, so the land's own colour is read off each channel
// where the sky put nothing: red and blue over green, green over magenta.
//
// Tested in src/lib/__tests__/sky-key.test.ts.

/* how little of a pixel can be land and it still be all sky */
const CLEAR = 0.02;

/** The sky cut out of a still drawn twice, `onMagenta` (sky #FF00FF) and
    `onGreen` (sky #00FF00), raw RGBA pixels `width` × `height` each: the
    land's own colour, with the sky as transparency, written into `onMagenta`,
    which is returned. */
export function keySky(onMagenta, onGreen, width, height) {
  const a = onMagenta, b = onGreen;
  for (let i = 0; i < width * height * 4; i += 4) {
    /* the sky's share, read from how far each channel moved towards its key */
    const sky = Math.min(1, Math.max(0, ((a[i] - b[i]) + (b[i + 1] - a[i + 1]) + (a[i + 2] - b[i + 2])) / (3 * 255)));
    const land = 1 - sky;
    if (land < CLEAR) { a[i] = a[i + 1] = a[i + 2] = a[i + 3] = 0; continue; }
    if (sky === 0) { a[i + 3] = 255; continue; }
    /* the land's share of each channel, from the draw whose key has none of it */
    a[i] = Math.round(Math.min(255, b[i] / land));
    a[i + 1] = Math.round(Math.min(255, a[i + 1] / land));
    a[i + 2] = Math.round(Math.min(255, b[i + 2] / land));
    a[i + 3] = Math.round(land * 255);
  }
  return a;
}

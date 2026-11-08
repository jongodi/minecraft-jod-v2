/* The wanted poster's corner of the world (Wall.tsx): each place a member
   built stands on the flight's still as a lantern with a small paper tag
   beside it, and the tag carries a numeral, the same numeral as in the
   poster's line of what they built. A whole name on every lantern did not
   fit: ten names in the bitmap face piled over each other, ran off the
   picture and over its caption. A numeral is two glyphs wide, and the name
   comes up on the one lantern in hand.

   The marks keep their size in pixels while the picture grows with the
   poster, so the marks are laid out once, on the server, at the poster's
   narrowest picture: what is clear there is clear at every width. Each mark
   in turn, in the list's order, takes the free spot nearest its place that
   touches no mark already laid and stands inside the picture's edge, so a
   lantern moves only as far as it must, and only when it must. */

export interface CornerPin { id: number; label: string; x: number; y: number }
/** A pin as it is drawn: where its lantern stands (fractions of the
    picture), its numeral, and the side its tag hangs on. */
export interface CornerMark extends CornerPin { n: number; side: 'right' | 'left' }

/** The picture on a 320 px phone, the narrowest the poster draws it. */
export const CORNER_REF = { w: 240, h: 135 } as const;

const LANTERN_W = 12;   // the lantern sprite at one pixel a pixel (Bits.tsx, 12 by 18)
const MARK_H = 20;      // the tag's height, which is a little over the lantern's
const GAP = 2;          // between a lantern and its tag, and kept between two marks
const EDGE = 2;         // kept clear of the picture's edge
const DIGIT = 12;       // one numeral of the bitmap face at 16 px, its spacing with it
const LETTER = 13;      // one letter of a name at 16 px, letter-spacing with it
const TAG_PAD = 8;      // the tag's padding, both sides together
const STEP = 2;         // the search moves a mark in steps of one of the art's pixels

const tagWidth = (n: number) => TAG_PAD + String(n).length * DIGIT;
/** How wide a place's name stands on its tag, near enough to choose its side. */
export const nameWidth = (label: string) => TAG_PAD + [...label].length * LETTER;

interface Box { x: number; y: number; w: number }
/* a mark's box: the lantern's foot at (x, y), the tag beside it on the right */
const left = (b: Box) => b.x - LANTERN_W / 2;
const right = (b: Box) => b.x + LANTERN_W / 2 + GAP + b.w;
const top = (b: Box) => b.y - MARK_H;
const bottom = (b: Box) => b.y;

/* Two boxes touch when they come closer than the gap on both axes. */
const touch = (a: Box, b: Box) =>
  Math.min(right(a), right(b)) - Math.max(left(a), left(b)) + GAP > 0 &&
  Math.min(bottom(a), bottom(b)) - Math.max(top(a), top(b)) + GAP > 0;

/* Every step a mark may move, nearest first: the whole picture each way, in
   whole steps. A step sideways counts the same as one up or down; on a tie
   the one up comes first, so a mark parts upward off the land it marks. */
let OFFSETS: [number, number][] | null = null;
function offsets(): [number, number][] {
  if (OFFSETS) return OFFSETS;
  const all: [number, number][] = [];
  /* whole steps either side of zero, so a mark with room stays exactly where it is */
  const mx = Math.floor(CORNER_REF.w / STEP) * STEP, my = Math.floor(CORNER_REF.h / STEP) * STEP;
  for (let dy = -my; dy <= my; dy += STEP)
    for (let dx = -mx; dx <= mx; dx += STEP) all.push([dx, dy]);
  all.sort((a, b) => (a[0] ** 2 + a[1] ** 2) - (b[0] ** 2 + b[1] ** 2) || a[1] - b[1] || a[0] - b[0]);
  return (OFFSETS = all);
}

/** Lay the marks out: numbered in the order given, each at the nearest spot
    to its place where it touches no mark laid before it and stands inside
    the picture, each with the side its name will hang on when it is in hand.
    Deterministic: the same pins, the same marks. */
export function layoutCorner(pins: readonly CornerPin[], ref: { w: number; h: number } = CORNER_REF): CornerMark[] {
  const { w: W, h: H } = ref;
  const fits = (b: Box) => left(b) >= EDGE && right(b) <= W - EDGE && top(b) >= EDGE && bottom(b) <= H - EDGE;
  const laid: Box[] = [];
  for (let i = 0; i < pins.length; i++) {
    const at: Box = { x: pins[i].x * W, y: pins[i].y * H, w: tagWidth(i + 1) };
    let spot: Box | null = null;
    for (const [dx, dy] of offsets()) {
      const b = { ...at, x: at.x + dx, y: at.y + dy };
      if (fits(b) && !laid.some(o => touch(o, b))) { spot = b; break; }
    }
    /* a picture too full to part them all (it would take some forty marks)
       keeps the last where it stands rather than lose it */
    laid.push(spot ?? at);
  }
  const boxes = laid;

  return pins.map((p, i) => {
    const b = boxes[i];
    /* the name hangs to the right, as the numeral does, unless the picture's
       edge would cut it; then it hangs to the left of its lantern */
    const side = b.x + LANTERN_W / 2 + GAP + nameWidth(p.label) <= W - EDGE ? 'right' : 'left';
    return { ...p, x: round4(b.x / W), y: round4(b.y / H), n: i + 1, side };
  });
}

/** Whether any two marks touch at the given size (for the tests, and a check
    on the layout's own promise). */
export function marksTouch(marks: readonly CornerMark[], ref: { w: number; h: number } = CORNER_REF): boolean {
  const boxes = marks.map(m => ({ x: m.x * ref.w, y: m.y * ref.h, w: tagWidth(m.n) }));
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
    const a = boxes[i], b = boxes[j];
    /* a hair under the gap allowed for the rounding of the fractions */
    if (Math.min(right(a), right(b)) - Math.max(left(a), left(b)) > 0.5 && Math.min(bottom(a), bottom(b)) - Math.max(top(a), top(b)) > 0.5) return true;
  }
  return false;
}

const round4 = (v: number) => Math.round(v * 10000) / 10000;

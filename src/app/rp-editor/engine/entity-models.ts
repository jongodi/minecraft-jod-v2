// ─────────────────────────────────────────────────────────────────────────────
// Entity-model templates
//
// Beds, chests, boats, shulker boxes, signs and the like are rendered by
// hardcoded geometry in the game — there is no model JSON in the pack, so their
// entity/… textures otherwise have no 3D view. These templates give each a
// representative box model (element geometry, in the same 0-16 space as normal
// models) so the texture can be previewed and painted in 3D.
//
// UVs are computed from the vanilla texture pixel layout. They are best-effort
// previews, not pixel-perfect renders, and are labelled as such in the UI.
// ─────────────────────────────────────────────────────────────────────────────

export interface EntityTemplate {
  /** Matches the entity texture path (relative to textures/). */
  match: RegExp;
  name: string;
  /** Native texture size (entity atlases are usually 64×64). */
  texSize: [number, number];
  /** Model elements; faces reference the single key "#t" (the entity texture). */
  elements: any[];
}

// UV helper: pixel rect → the model's 0-16 UV space (16 == full texture width).
const uvFn = (tw: number, th: number) => (x0: number, y0: number, x1: number, y1: number) =>
  [(x0 / tw) * 16, (y0 / th) * 16, (x1 / tw) * 16, (y1 / th) * 16];

// ── Chest (single) — 64×64 ────────────────────────────────────────────────────
function chest(): any[] {
  const uv = uvFn(64, 64);
  return [
    // body 14×10×14 at (1,0,1)
    { from: [1, 0, 1], to: [15, 10, 15], faces: {
      up: { texture: '#t', uv: uv(28, 19, 42, 33) },
      down: { texture: '#t', uv: uv(14, 19, 28, 33) },
      north: { texture: '#t', uv: uv(14, 33, 28, 43) },
      south: { texture: '#t', uv: uv(42, 33, 56, 43) },
      west: { texture: '#t', uv: uv(0, 33, 14, 43) },
      east: { texture: '#t', uv: uv(28, 33, 42, 43) },
    } },
    // lid 14×5×14 at (1,9,1)
    { from: [1, 9, 1], to: [15, 14, 15], faces: {
      up: { texture: '#t', uv: uv(28, 0, 42, 14) },
      down: { texture: '#t', uv: uv(14, 0, 28, 14) },
      north: { texture: '#t', uv: uv(14, 14, 28, 19) },
      south: { texture: '#t', uv: uv(42, 14, 56, 19) },
      west: { texture: '#t', uv: uv(0, 14, 14, 19) },
      east: { texture: '#t', uv: uv(28, 14, 42, 19) },
    } },
    // lock knob
    { from: [7, 7, 15], to: [9, 11, 16], faces: {
      north: { texture: '#t', uv: uv(1, 0, 3, 4) },
      south: { texture: '#t', uv: uv(1, 0, 3, 4) },
      up: { texture: '#t', uv: uv(1, 0, 3, 1) },
    } },
  ];
}

// ── Bed (head piece) — 64×64 ──────────────────────────────────────────────────
function bed(): any[] {
  const uv = uvFn(64, 64);
  return [
    // mattress 16×6×16 raised on legs
    { from: [0, 3, 0], to: [16, 9, 16], faces: {
      up: { texture: '#t', uv: uv(6, 6, 22, 22) },
      down: { texture: '#t', uv: uv(28, 6, 44, 22) },
      north: { texture: '#t', uv: uv(6, 0, 22, 6) },
      south: { texture: '#t', uv: uv(22, 22, 38, 28) },
      west: { texture: '#t', uv: uv(0, 6, 6, 22) },
      east: { texture: '#t', uv: uv(22, 6, 28, 22) },
    } },
    // two legs
    { from: [0, 0, 0], to: [3, 3, 3], faces: {
      north: { texture: '#t', uv: uv(50, 3, 53, 6) }, south: { texture: '#t', uv: uv(53, 3, 56, 6) },
      west: { texture: '#t', uv: uv(53, 0, 56, 3) }, east: { texture: '#t', uv: uv(50, 0, 53, 3) },
      down: { texture: '#t', uv: uv(50, 6, 53, 9) },
    } },
    { from: [13, 0, 0], to: [16, 3, 3], faces: {
      north: { texture: '#t', uv: uv(50, 3, 53, 6) }, south: { texture: '#t', uv: uv(53, 3, 56, 6) },
      west: { texture: '#t', uv: uv(53, 0, 56, 3) }, east: { texture: '#t', uv: uv(50, 0, 53, 3) },
      down: { texture: '#t', uv: uv(50, 6, 53, 9) },
    } },
  ];
}

// ── Shulker box — 64×64 ───────────────────────────────────────────────────────
function shulker(): any[] {
  const uv = uvFn(64, 64);
  return [
    // base 16×8×16
    { from: [0, 0, 0], to: [16, 8, 16], faces: {
      up: { texture: '#t', uv: uv(16, 28, 32, 44) }, down: { texture: '#t', uv: uv(32, 28, 48, 44) },
      north: { texture: '#t', uv: uv(16, 44, 32, 52) }, south: { texture: '#t', uv: uv(48, 44, 64, 52) },
      west: { texture: '#t', uv: uv(0, 44, 16, 52) }, east: { texture: '#t', uv: uv(32, 44, 48, 52) },
    } },
    // lid 16×12×16
    { from: [0, 4, 0], to: [16, 16, 16], faces: {
      up: { texture: '#t', uv: uv(16, 0, 32, 16) }, down: { texture: '#t', uv: uv(32, 0, 48, 16) },
      north: { texture: '#t', uv: uv(16, 16, 32, 28) }, south: { texture: '#t', uv: uv(48, 16, 64, 28) },
      west: { texture: '#t', uv: uv(0, 16, 16, 28) }, east: { texture: '#t', uv: uv(32, 16, 48, 28) },
    } },
  ];
}

// ── Boat / chest boat — reconstructs the vanilla BoatModel ────────────────────
// Boats have no model JSON in a pack (the game renders them from a hardcoded
// entity model), so we rebuild the hull from the known part layout, read off the
// vanilla boat texture (128×64: a bottom plank, four walls, two paddles). A chest
// boat's texture is 128×128 — the same hull art fills its top 128×64 unchanged,
// with a chest added below — so both share this hull and differ only in which
// `uvFn` (declared canvas) their faces are scaled against.

// Minecraft entity box-UV unwrap for a (w×h×d)-pixel cube at texture offset (u,v),
// rescaled through `uv` (a uvFn-declared canvas) to the model's 0-16 UV space.
function boxUv(uv: (x0: number, y0: number, x1: number, y1: number) => number[], u: number, v: number, w: number, h: number, d: number) {
  return {
    up:    { texture: '#t', uv: uv(u + d, v, u + d + w, v + d) },
    down:  { texture: '#t', uv: uv(u + d + w, v, u + d + 2 * w, v + d) },
    east:  { texture: '#t', uv: uv(u, v + d, u + d, v + d + h) },
    north: { texture: '#t', uv: uv(u + d, v + d, u + d + w, v + d + h) },
    west:  { texture: '#t', uv: uv(u + d + w, v + d, u + d + w + d, v + d + h) },
    south: { texture: '#t', uv: uv(u + d + w + d, v + d, u + 2 * d + 2 * w, v + d + h) },
  };
}

// World scale for the boat (pixels → model units) — keeps the ~28-long hull in view.
const BOAT_S = 0.5;

// A boat part: a (w×h×d)-pixel cube centred at world `c`, rotated in place. UVs
// are rescaled by `uv`; geometry is scaled by BOAT_S.
function boatPart(uv: (x0: number, y0: number, x1: number, y1: number) => number[], u: number, v: number, w: number, h: number, d: number,
  c: [number, number, number], rot?: [number, number, number]): any {
  const [cx, cy, cz] = c;
  const hw = (w * BOAT_S) / 2, hh = (h * BOAT_S) / 2, hd = (d * BOAT_S) / 2;
  const el: any = { from: [cx - hw, cy - hh, cz - hd], to: [cx + hw, cy + hh, cz + hd], faces: boxUv(uv, u, v, w, h, d) };
  if (rot && (rot[0] || rot[1] || rot[2])) el.rotation = { origin: [cx, cy, cz], x: rot[0], y: rot[1], z: rot[2] };
  return el;
}

// The hull, shared by both plain and chest boats. `uv` picks which declared
// canvas (128×64 vs 128×128) the raw pixel offsets below are scaled against —
// the offsets themselves are unchanged, since the hull art occupies the same
// top-left 128×64 region of both textures.
const FLOOR_Y = 3.4, WALL_Y = 4.8, FLOOR_HALF_DEPTH = 4; // = (16 * BOAT_S) / 2, the rotated floor's Z half-extent
function boatHull(uv: (x0: number, y0: number, x1: number, y1: number) => number[]): any[] {
  const cx = 8, cz = 8;
  return [
    // bottom: 28×16×3 plank laid flat (its 28×16 face turned to face up).
    boatPart(uv, 0, 0, 28, 16, 3, [cx, FLOOR_Y, cz], [-90, 0, 0]),
    // side walls (28 long, along X), straddling the floor's ±Z edge.
    boatPart(uv, 0, 35, 28, 6, 2, [cx, WALL_Y, cz + FLOOR_HALF_DEPTH], [0, 0, 0]),
    boatPart(uv, 0, 43, 28, 6, 2, [cx, WALL_Y, cz - FLOOR_HALF_DEPTH], [0, 180, 0]),
    // end walls (bow/stern), rotated to run along Z and close off the hull.
    boatPart(uv, 0, 27, 16, 6, 2, [cx + 7, WALL_Y, cz], [0, 90, 0]),
    boatPart(uv, 0, 19, 18, 6, 2, [cx - 7, WALL_Y, cz], [0, -90, 0]),
    // two paddles, resting up and out over the side walls.
    boatPart(uv, 62, 0, 2, 2, 18, [cx + 1.5, 6.4, cz + 6.5], [72, 0, 0]),
    boatPart(uv, 62, 20, 2, 2, 18, [cx + 1.5, 6.4, cz - 6.5], [72, 0, 0]),
  ];
}

function boat(): any[] {
  return boatHull(uvFn(128, 64));
}

// The chest sub-image lives in the lower half of the 128×128 chest-boat texture
// (below the shared hull art), laid out as two stacked boxes — a short lid and a
// taller body — each with their own up/down + 4-side unwrap, read directly off
// the vanilla texture's pixel grid (not hand-derived — measured off the actual
// asset, since it doesn't follow the single-chest layout used by chest/normal.png).
function chestBoat(): any[] {
  const uv = uvFn(128, 128);
  const cx = 8, cz = 8;
  const facesOf = (r: Record<'up' | 'down' | 'north' | 'south' | 'east' | 'west', [number, number, number, number]>) =>
    Object.fromEntries(Object.entries(r).map(([k, rect]) => [k, { texture: '#t', uv: uv(...rect) }]));

  const lid: any = {
    from: [cx - 2.5, 6.0, cz - 2], to: [cx + 2.5, 7.0, cz + 2],
    faces: facesOf({
      up: [12, 59, 24, 71], down: [24, 59, 36, 71],
      west: [0, 71, 12, 75], north: [12, 71, 24, 75], east: [24, 71, 36, 75], south: [36, 71, 48, 75],
    }),
  };
  const body: any = {
    from: [cx - 2.5, FLOOR_Y + 0.75, cz - 2], to: [cx + 2.5, 6.15, cz + 2],
    faces: facesOf({
      up: [12, 76, 24, 88], down: [24, 76, 36, 88],
      west: [0, 90, 12, 96], north: [12, 90, 24, 96], east: [24, 90, 36, 96], south: [36, 90, 48, 96],
    }),
  };
  return [...boatHull(uv), lid, body];
}

// ── Double chest halves — 64×64 each ──────────────────────────────────────────
// Each half is a 15-wide box; the seam face has no art in the texture (it butts
// against the other half), so that face is simply omitted. Layout read off the
// vanilla normal_left/normal_right textures: lid unwrap at (0,0) 15×5×14, body
// at (0,19) 15×10×14; `left` halves are missing the east face, `right` the west.
function chestHalf(side: 'left' | 'right'): any[] {
  const uv = uvFn(64, 64);
  const omit = side === 'left' ? 'east' : 'west';
  const half = (v0: number, w: number, h: number, d: number, from: number[], to: number[]) => {
    const faces: Record<string, any> = {
      up: { texture: '#t', uv: uv(d, v0, d + w, v0 + d) },
      down: { texture: '#t', uv: uv(d + w, v0, d + 2 * w, v0 + d) },
      east: { texture: '#t', uv: uv(0, v0 + d, d, v0 + d + h) },
      north: { texture: '#t', uv: uv(d, v0 + d, d + w, v0 + d + h) },
      west: { texture: '#t', uv: uv(d + w, v0 + d, d + w + d, v0 + d + h) },
      south: { texture: '#t', uv: uv(2 * d + w, v0 + d, 2 * d + 2 * w, v0 + d + h) },
    };
    delete faces[omit];
    return { from, to, faces };
  };
  return [
    half(19, 15, 10, 14, [0.5, 0, 1], [15.5, 10, 15]),  // body
    half(0, 15, 5, 14, [0.5, 9, 1], [15.5, 14, 15]),    // lid
  ];
}

// ── Minecart — 64×32 ──────────────────────────────────────────────────────────
// Floor 20×16×2 at (0,10) laid flat; four walls 16×8×2 sharing the art at (0,0).
function minecart(): any[] {
  const uv = uvFn(64, 32);
  const S = 0.55, cx = 8, cz = 8;
  const part = (u: number, v: number, w: number, h: number, d: number, c: [number, number, number], rot?: [number, number, number]) => {
    const hw = (w * S) / 2, hh = (h * S) / 2, hd = (d * S) / 2;
    const el: any = { from: [c[0] - hw, c[1] - hh, c[2] - hd], to: [c[0] + hw, c[1] + hh, c[2] + hd], faces: boxUv(uv, u, v, w, h, d) };
    if (rot && (rot[0] || rot[1] || rot[2])) el.rotation = { origin: c, x: rot[0], y: rot[1], z: rot[2] };
    return el;
  };
  return [
    part(0, 10, 20, 16, 2, [cx, 1.6, cz], [-90, 0, 0]),                 // floor
    part(0, 0, 16, 8, 2, [cx, 3.8, cz + 4.4 - 0.55], [0, 0, 0]),        // +Z wall
    part(0, 0, 16, 8, 2, [cx, 3.8, cz - 4.4 + 0.55], [0, 180, 0]),      // −Z wall
    part(0, 0, 16, 8, 2, [cx + 5.5 - 0.55, 3.8, cz], [0, 90, 0]),       // +X end
    part(0, 0, 16, 8, 2, [cx - 5.5 + 0.55, 3.8, cz], [0, -90, 0]),      // −X end
  ];
}

// ── Bell — 32×32 (bell_body.png) ─────────────────────────────────────────────
// Body 6×7×6 at (0,0); the wider bottom lip 8×2×8 at (0,13).
function bell(): any[] {
  const uv = uvFn(32, 32);
  return [
    { from: [5, 7, 5], to: [11, 14, 11], faces: boxUv(uv, 0, 0, 6, 7, 6) },
    { from: [4, 5, 4], to: [12, 7, 12], faces: boxUv(uv, 0, 13, 8, 2, 8) },
  ];
}

// ── Banner — 64×64 (banner/base.png holds only the cloth, 20×40×1) ───────────
function banner(): any[] {
  const uv = uvFn(64, 64);
  const S = 0.36, w = 20 * S, h = 40 * S, d = Math.max(1 * S, 0.3);
  const cx = 8, cz = 8;
  return [
    { from: [cx - w / 2, 15.5 - h, cz - d / 2], to: [cx + w / 2, 15.5, cz + d / 2], faces: boxUv(uv, 0, 0, 20, 40, 1) },
  ];
}

// ── Legacy standing sign — 64×32 (entity/signs/<wood>.png, pre-26.x packs) ───
// Board 24×12×2 at (0,0); post 2×14×2 at (0,14). (26.x signs are block models.)
function legacySign(): any[] {
  const uv = uvFn(64, 32);
  const S = 0.6;
  const board = { w: 24 * S, h: 12 * S, d: 2 * S };
  return [
    { from: [8 - board.w / 2, 8.4, 8 - board.d / 2], to: [8 + board.w / 2, 8.4 + board.h, 8 + board.d / 2], faces: boxUv(uv, 0, 0, 24, 12, 2) },
    { from: [7.4, 0, 7.4], to: [8.6, 8.4, 8.6], faces: boxUv(uv, 0, 14, 2, 14, 2) },
  ];
}

// ── Legacy hanging sign — 64×32 (entity/signs/hanging/<wood>.png) ─────────────
// Top plank 16×2×4 at (0,0); two flat chains 3×6 at (0,6) and (6,6); board
// 14×10×2 at (0,12). Chains are zero-thickness planes, like vanilla's model.
function legacyHangingSign(): any[] {
  const uv = uvFn(64, 32);
  const chain = (u: number, x: number) => ({
    from: [x, 10, 8], to: [x + 3, 16, 8],
    faces: {
      north: { texture: '#t', uv: uv(u, 6, u + 3, 12) },
      south: { texture: '#t', uv: uv(u, 6, u + 3, 12) },
    },
  });
  return [
    { from: [0, 14, 6], to: [16, 16, 10], faces: boxUv(uv, 0, 0, 16, 2, 4) },
    chain(0, 3.5), chain(6, 9.5),
    { from: [1, 0, 7], to: [15, 10, 9], faces: boxUv(uv, 0, 12, 14, 10, 2) },
  ];
}

export const ENTITY_TEMPLATES: EntityTemplate[] = [
  // Double-chest halves must match before the generic chest rule.
  { match: /(^|\/)entity\/chest\/[a-z0-9_]*_left(\.|$)/i, name: 'double chest (left)', texSize: [64, 64], elements: chestHalf('left') },
  { match: /(^|\/)entity\/chest\/[a-z0-9_]*_right(\.|$)/i, name: 'double chest (right)', texSize: [64, 64], elements: chestHalf('right') },
  { match: /(^|\/)entity\/chest\//i, name: 'chest', texSize: [64, 64], elements: chest() },
  { match: /(^|\/)entity\/bed\//i, name: 'bed', texSize: [64, 64], elements: bed() },
  { match: /(^|\/)entity\/shulker\//i, name: 'shulker box', texSize: [64, 64], elements: shulker() },
  { match: /(^|\/)entity\/chest_boat\//i, name: 'chest boat', texSize: [128, 128], elements: chestBoat() },
  { match: /(^|\/)entity\/boat\//i, name: 'boat', texSize: [128, 64], elements: boat() },
  { match: /(^|\/)entity\/minecart(\/|\.|$)/i, name: 'minecart', texSize: [64, 32], elements: minecart() },
  { match: /(^|\/)entity\/bell\//i, name: 'bell', texSize: [32, 32], elements: bell() },
  { match: /(^|\/)entity\/banner(\/|_|\.)/i, name: 'banner', texSize: [64, 64], elements: banner() },
  { match: /(^|\/)entity\/signs\/hanging\//i, name: 'hanging sign', texSize: [64, 32], elements: legacyHangingSign() },
  { match: /(^|\/)entity\/signs\//i, name: 'sign', texSize: [64, 32], elements: legacySign() },
];

/** An entity template for a texture path, or null. */
export function entityTemplateFor(texRelOrPath: string): EntityTemplate | null {
  return ENTITY_TEMPLATES.find((t) => t.match.test(texRelOrPath)) ?? null;
}

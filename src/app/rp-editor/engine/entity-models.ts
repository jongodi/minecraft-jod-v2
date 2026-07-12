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

export const ENTITY_TEMPLATES: EntityTemplate[] = [
  { match: /(^|\/)entity\/chest\//i, name: 'chest', texSize: [64, 64], elements: chest() },
  { match: /(^|\/)entity\/bed\//i, name: 'bed', texSize: [64, 64], elements: bed() },
  { match: /(^|\/)entity\/shulker\//i, name: 'shulker box', texSize: [64, 64], elements: shulker() },
  { match: /(^|\/)entity\/chest_boat\//i, name: 'chest boat', texSize: [128, 128], elements: chestBoat() },
  { match: /(^|\/)entity\/boat\//i, name: 'boat', texSize: [128, 64], elements: boat() },
];

/** An entity template for a texture path, or null. */
export function entityTemplateFor(texRelOrPath: string): EntityTemplate | null {
  return ENTITY_TEMPLATES.find((t) => t.match.test(texRelOrPath)) ?? null;
}

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

// ── Boat hull — 128×64 (approx) ───────────────────────────────────────────────
function boat(): any[] {
  const uv = uvFn(128, 64);
  return [
    { from: [1, 3, 0], to: [15, 9, 28].map((v, i) => i === 2 ? 16 : v) as any, faces: {
      up: { texture: '#t', uv: uv(0, 19, 28, 35) }, down: { texture: '#t', uv: uv(0, 0, 28, 16) },
      north: { texture: '#t', uv: uv(0, 35, 14, 41) }, south: { texture: '#t', uv: uv(0, 35, 14, 41) },
      west: { texture: '#t', uv: uv(0, 16, 28, 19) }, east: { texture: '#t', uv: uv(0, 16, 28, 19) },
    } },
  ];
}

export const ENTITY_TEMPLATES: EntityTemplate[] = [
  { match: /(^|\/)entity\/chest\//i, name: 'chest', texSize: [64, 64], elements: chest() },
  { match: /(^|\/)entity\/bed\//i, name: 'bed', texSize: [64, 64], elements: bed() },
  { match: /(^|\/)entity\/shulker\//i, name: 'shulker box', texSize: [64, 64], elements: shulker() },
  { match: /(^|\/)entity\/boat\//i, name: 'boat', texSize: [128, 64], elements: boat() },
];

/** An entity template for a texture path, or null. */
export function entityTemplateFor(texRelOrPath: string): EntityTemplate | null {
  return ENTITY_TEMPLATES.find((t) => t.match.test(texRelOrPath)) ?? null;
}

// The wood a sign is cut from. A post tied to a place hangs on that place's
// own wood, the way a build in the game is made of it: the pink estate in
// cherry, the castle in spruce. The admin picks it for each place on the map;
// a place still as it was first drawn keeps the wood it was given then
// (`woodOf` in map-types.ts), and anything else is oak. The colours live in
// wall.css (`.w-sign--<wood>`). Nothing here imports the map, so a page that
// only hangs signs carries none of it.

export const SIGN_WOODS = ['oak', 'birch', 'cherry', 'spruce', 'mangrove', 'dark_oak'] as const;
export type SignWood = typeof SIGN_WOODS[number];

/** The names the game gives them in Icelandic, for the admin's select. */
export const WOOD_LABELS: Record<SignWood, string> = {
  oak:      'Eik',
  birch:    'Birki',
  cherry:   'Kirsuberjaviður',
  spruce:   'Greni',
  mangrove: 'Leiruviður',
  dark_oak: 'Dökk eik',
};

export const isSignWood = (v: unknown): v is SignWood => typeof v === 'string' && (SIGN_WOODS as readonly string[]).includes(v);

/** The class a sign takes for its wood, with a leading space; oak is the sign's own, and so is
    anything that is not a wood (an answer from before places had one). */
export const woodClass = (wood: unknown): string => (isSignWood(wood) && wood !== 'oak' ? ` w-sign--${wood.replace('_', '-')}` : '');

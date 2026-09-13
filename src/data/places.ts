// The world map. Coordinates are positions on the drawing (1000 by 650), not
// world coordinates; the drawing is a sketch of where things are relative to
// each other. `pin` numbers match the gallery.

export interface Place {
  pin: number;
  name: string;
  where: string;
  x: number;
  y: number;
  /** Where the label sits relative to the pin, placed by hand like on a real map. */
  label: 'right' | 'left' | 'above' | 'below-right' | 'below-left';
}

export interface Region {
  id: string;
  name: string;
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  /** The name sits above or below the rings, whichever side is free. */
  label: 'above' | 'below';
}

export const PLACES: readonly Place[] = [
  { pin: 1, name: 'Goði Castle', where: 'Langt í burtu', x: 162, y: 345, label: 'right' },
  { pin: 2, name: 'Joð Ville', where: 'Gamla basið, spawn', x: 262, y: 172, label: 'above' },
  { pin: 3, name: 'Pink Estate', where: 'Gamla basið', x: 258, y: 210, label: 'left' },
  { pin: 4, name: 'J Club', where: 'Neðanjarðar', x: 306, y: 210, label: 'right' },
  { pin: 5, name: 'Mushroom Island', where: 'Úti á hafi', x: 872, y: 260, label: 'left' },
  { pin: 6, name: 'Potions Tower', where: 'Nýja basið', x: 408, y: 488, label: 'below-left' },
  { pin: 7, name: 'Venice', where: 'Nýja basið, við sjóinn', x: 568, y: 415, label: 'right' },
  { pin: 8, name: 'City Hall', where: 'Nýja basið', x: 438, y: 448, label: 'right' },
  { pin: 9, name: 'The Village', where: 'Nýja basið, aðalgatan', x: 472, y: 502, label: 'below-right' },
  { pin: 10, name: 'Balloon Paradise', where: 'Nýja basið', x: 426, y: 472, label: 'left' },
  { pin: 11, name: 'New Town', where: 'Nýja basið', x: 405, y: 508, label: 'below-left' },
];

export const REGIONS: readonly Region[] = [
  { id: 'faraway', name: 'Langt í burtu', cx: 162, cy: 345, rx: 78, ry: 58, label: 'above' },
  { id: 'old', name: 'Gamla basið', cx: 282, cy: 197, rx: 118, ry: 118, label: 'above' },
  { id: 'new', name: 'Nýja basið', cx: 488, cy: 466, rx: 200, ry: 112, label: 'above' },
];

/** The river through the new base, drawn as one line. */
export const RIVER: ReadonlyArray<readonly [number, number]> = [
  [520, 390], [512, 418], [528, 452], [516, 488], [505, 522], [514, 562],
];

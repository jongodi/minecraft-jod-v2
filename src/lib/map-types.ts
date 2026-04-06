// Shared map types and default values — no server-only imports, safe for client components

export interface MapLocation {
  id:       number;
  label:    string;
  sublabel: string;
  x:        number;
  y:        number;
  type:     'surface' | 'underground' | 'island' | 'aerial';
}

export interface MapZone {
  id:       string;
  label:    string;
  /** 'zone' = named region (dashed ring). 'land' = solid terrain patch. */
  kind:     'zone' | 'land';
  cx:       number;
  cy:       number;
  rx:       number;
  ry:       number;
  colorKey: 'purple' | 'blue' | 'orange' | 'green';
}

export interface MapConfig {
  locations: MapLocation[];
  zones:     MapZone[];
}

export const DEFAULT_LOCATIONS: MapLocation[] = [
  { id: 1,  label: 'GOÐI CASTLE',      sublabel: 'FAR AWAY LANDS',         x: 162, y: 345, type: 'surface'     },
  { id: 2,  label: 'JOÐ VILLE',        sublabel: 'OLD BASE · SPAWN',        x: 262, y: 172, type: 'surface'     },
  { id: 3,  label: 'PINK ESTATE',      sublabel: 'OLD BASE',                x: 258, y: 210, type: 'surface'     },
  { id: 4,  label: 'J CLUB',           sublabel: 'SECRET UNDERGROUND CLUB', x: 306, y: 210, type: 'underground' },
  { id: 5,  label: 'MUSHROOM ISLAND',  sublabel: 'SHROOMY HEAVEN',          x: 872, y: 260, type: 'island'      },
  { id: 6,  label: 'POTIONS TOWER',    sublabel: 'NEW BASE',                x: 408, y: 488, type: 'surface'     },
  { id: 7,  label: 'VENICE',           sublabel: 'NEW BASE · COASTAL',      x: 568, y: 415, type: 'surface'     },
  { id: 8,  label: 'TOWN HALL',        sublabel: 'NEW BASE',                x: 438, y: 448, type: 'surface'     },
  { id: 9,  label: 'THE VILLAGE',      sublabel: 'NEW BASE · MAIN STREET',  x: 472, y: 502, type: 'surface'     },
  { id: 10, label: 'BALLOON PARADISE', sublabel: 'NEW BASE · FROM ABOVE',   x: 426, y: 472, type: 'aerial'      },
  { id: 11, label: 'NEW TOWN',         sublabel: 'NEW BASE · NIGHT',        x: 405, y: 508, type: 'surface'     },
];

export const DEFAULT_ZONES: MapZone[] = [
  { id: 'faraway', label: 'FARAWAY LANDS', kind: 'zone', cx: 162, cy: 345, rx:  78, ry:  58, colorKey: 'purple' },
  { id: 'oldbase', label: 'OLD BASE',      kind: 'zone', cx: 282, cy: 197, rx: 118, ry: 118, colorKey: 'purple' },
  { id: 'newbase', label: 'NEW BASE',      kind: 'zone', cx: 488, cy: 466, rx: 200, ry: 112, colorKey: 'blue'   },
];

export const DEFAULT_CONFIG: MapConfig = {
  locations: DEFAULT_LOCATIONS,
  zones:     DEFAULT_ZONES,
};

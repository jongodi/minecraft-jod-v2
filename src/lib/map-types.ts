// Shared map types and default values — no server-only imports, safe for client components

export interface MapLocation {
  id:       number;
  label:    string;
  sublabel: string;
  x:        number;
  y:        number;
  type:     'surface' | 'underground' | 'island' | 'aerial';
  /** Gallery photo shown when the pin is selected on the public map. `null` = no photo. */
  photoId?: string | null;
  /** The crew members who built it, by username. The postcard says so, and their walls list it. */
  builders?: string[];
}

export interface MapZone {
  id:       string;
  label:    string;
  /** 'zone' = named region (dashed ring). 'land' = solid terrain patch. 'lake' = water ellipse. 'mountain' = peak triangle. */
  kind:     'zone' | 'land' | 'lake' | 'mountain';
  cx:       number;
  cy:       number;
  rx:       number;
  ry:       number;
  colorKey: 'purple' | 'blue' | 'orange' | 'green';
}

/** Freeform polyline drawn on the map (rivers, roads, borders). */
export interface MapPath {
  id:       string;
  label:    string;
  kind:     'river' | 'road' | 'border';
  points:   [number, number][];
  colorKey: 'blue' | 'orange' | 'green' | 'purple';
}

export interface MapConfig {
  locations: MapLocation[];
  zones:     MapZone[];
  paths?:    MapPath[];
  /** The painted world: one character per block, one string per row. See lib/terrain. */
  terrain?:  string[];
}

export const DEFAULT_LOCATIONS: MapLocation[] = [
  { id: 1,  label: 'Kastali Goða',      sublabel: 'Fjarlæg lönd',         x: 162, y: 345, photoId: '1', type: 'surface'     },
  { id: 2,  label: 'Joðbær',        sublabel: 'Gamla byggðin · upphafsstaður',        x: 262, y: 172, photoId: '2', type: 'surface'     },
  { id: 3,  label: 'Bleika setrið',      sublabel: 'Gamla byggðin',                x: 258, y: 210, photoId: '3', type: 'surface'     },
  { id: 4,  label: 'J-klúbburinn',           sublabel: 'Leynilegur klúbbur neðanjarðar', x: 306, y: 210, photoId: '4', type: 'underground' },
  { id: 5,  label: 'Sveppaeyja',  sublabel: 'Sveppaparadís',          x: 872, y: 260, photoId: '5', type: 'island'      },
  { id: 6,  label: 'Seyðaturninn',    sublabel: 'Nýja byggðin',                x: 408, y: 488, photoId: '6', type: 'surface'     },
  { id: 7,  label: 'Feneyjar',           sublabel: 'Nýja byggðin · við ströndina',      x: 568, y: 415, photoId: '7', type: 'surface'     },
  { id: 8,  label: 'Ráðhúsið',        sublabel: 'Nýja byggðin',                x: 438, y: 448, photoId: '8', type: 'surface'     },
  { id: 9,  label: 'Þorpið',      sublabel: 'Nýja byggðin · aðalgatan',  x: 472, y: 502, photoId: '9', type: 'surface'     },
  { id: 10, label: 'Blöðruparadís', sublabel: 'Nýja byggðin · úr lofti',   x: 426, y: 472, photoId: '10', type: 'aerial'      },
  { id: 11, label: 'Nýibær',         sublabel: 'Nýja byggðin · að nóttu',        x: 405, y: 508, photoId: '11', type: 'surface'     },
];

export const DEFAULT_ZONES: MapZone[] = [
  { id: 'faraway', label: 'Fjarlæg lönd', kind: 'zone', cx: 162, cy: 345, rx:  78, ry:  58, colorKey: 'purple' },
  { id: 'oldbase', label: 'Gamla byggðin',      kind: 'zone', cx: 282, cy: 197, rx: 118, ry: 118, colorKey: 'purple' },
  { id: 'newbase', label: 'Nýja byggðin',      kind: 'zone', cx: 488, cy: 466, rx: 200, ry: 112, colorKey: 'blue'   },
];

export const DEFAULT_PATHS: MapPath[] = [
  { id: 'river-main', label: 'Á', kind: 'river', colorKey: 'blue',
    points: [[520, 390], [512, 418], [528, 452], [516, 488], [505, 522], [514, 562]] },
];

export const DEFAULT_CONFIG: MapConfig = {
  locations: DEFAULT_LOCATIONS,
  zones:     DEFAULT_ZONES,
  paths:     DEFAULT_PATHS,
};

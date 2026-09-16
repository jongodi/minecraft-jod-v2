import type { SVGProps } from 'react';
import type { MapLocation, MapPath, MapZone } from '@/lib/map-types';
import { handCase } from './data';
import { DEFAULT_TERRAIN, normalizeTerrain, terrainPaths, withBeaches } from '@/lib/terrain';

/* The map as blocks. Drawn once here so the public map and the admin editor
   show the same world; the editor adds its tools on top. */

export const MAP_W = 1000;
export const MAP_H = 650;

const INK     = 'var(--map-ink)';
const BRASS   = 'var(--map-pin)';
const WAX     = 'var(--map-wax)';

/* Rivers and roads walk the grid: each leg goes across, then down. */
const STEP = 10;
export function stepped(points: [number, number][]): string {
  const snap = (v: number) => Math.round(v / STEP) * STEP;
  let d = '';
  points.forEach(([x, y], i) => {
    const sx = snap(x), sy = snap(y);
    d += i === 0 ? `M${sx} ${sy}` : `H${sx}V${sy}`;
  });
  return d;
}

function mountain(z: MapZone): string {
  return `M${z.cx - z.rx} ${z.cy + z.ry}H${z.cx + z.rx}V${z.cy + z.ry * 0.3}H${z.cx + z.rx * 0.5}V${z.cy - z.ry * 0.4}H${z.cx + z.rx * 0.2}V${z.cy - z.ry}H${z.cx - z.rx * 0.2}V${z.cy - z.ry * 0.4}H${z.cx - z.rx * 0.5}V${z.cy + z.ry * 0.3}H${z.cx - z.rx}Z`;
}

type G = SVGProps<SVGGElement>;

export interface MapArtProps {
  locations: MapLocation[];
  zones: MapZone[];
  paths: MapPath[];
  /** The painted world. Falls back to the world the site shipped with. */
  terrain?: readonly string[];
  /** The place drawn with the red banner. */
  selectedId?: number | null;
  pinProps?: (loc: MapLocation) => G;
  zoneProps?: (zone: MapZone) => G;
  pathProps?: (path: MapPath) => G;
  /** The sheet title and count in the corner. */
  title?: boolean;
}

/** Shared <defs>: one pattern per ground material, all aligned to the block grid. */
export function MapDefs() {
  return (
    <defs>
      <pattern id="jWater" width="40" height="40" patternUnits="userSpaceOnUse">
        <rect width="40" height="40" fill="var(--map-water)" />
        <rect x="0" y="0" width="20" height="20" fill="var(--map-water-2)" />
        <rect x="20" y="20" width="20" height="20" fill="var(--map-water-2)" />
      </pattern>
      <pattern id="jLandTex" width="60" height="60" patternUnits="userSpaceOnUse">
        <rect x="20" y="0" width="20" height="20" fill="var(--map-land-2)" />
        <rect x="0" y="40" width="20" height="20" fill="var(--map-land-2)" />
      </pattern>
      <pattern id="jGrassTex" width="20" height="20" patternUnits="userSpaceOnUse">
        <rect x="4" y="6" width="4" height="4" fill="var(--map-grass-2)" />
        <rect x="12" y="13" width="4" height="4" fill="var(--map-grass-2)" />
      </pattern>
      <pattern id="jRockTex" width="20" height="20" patternUnits="userSpaceOnUse">
        <rect x="0" y="3" width="20" height="3" fill="var(--map-rock-2)" />
        <rect x="0" y="11" width="20" height="2" fill="var(--map-rock-2)" />
        <rect x="0" y="16" width="20" height="3" fill="var(--tc-yellow)" fillOpacity="0.35" />
      </pattern>
      <pattern id="jForestTex" width="20" height="20" patternUnits="userSpaceOnUse">
        <rect x="8" y="4" width="4" height="4" fill="var(--map-forest-2)" />
        <rect x="6" y="8" width="8" height="4" fill="var(--map-forest-2)" />
        <rect x="9" y="12" width="2" height="4" fill="var(--map-ink)" fillOpacity="0.5" />
      </pattern>
      <pattern id="jSandTex" width="20" height="20" patternUnits="userSpaceOnUse">
        <rect x="6" y="9" width="6" height="2" fill="var(--map-land-2)" fillOpacity="0.5" />
      </pattern>
    </defs>
  );
}

const GROUND: Array<{ code: string; fill: string; tex?: string }> = [
  { code: 's', fill: 'var(--map-sand)',   tex: 'jSandTex' },
  { code: 'l', fill: 'var(--map-land)',   tex: 'jLandTex' },
  { code: 'g', fill: 'var(--map-grass)',  tex: 'jGrassTex' },
  { code: 'r', fill: 'var(--map-rock)',   tex: 'jRockTex' },
  { code: 'f', fill: 'var(--map-forest)', tex: 'jForestTex' },
];

/** The ground on its own, so the editor can draw its tools over it. */
export function Terrain({ terrain }: { terrain?: readonly string[] }) {
  const grid = withBeaches(normalizeTerrain(terrain ?? DEFAULT_TERRAIN));
  const d = terrainPaths(grid);
  return (
    <g shapeRendering="crispEdges">
      <rect width={MAP_W} height={MAP_H} fill="url(#jWater)" />
      {GROUND.map(({ code, fill, tex }) => d[code] ? (
        <g key={code}>
          <path d={d[code]} fill={fill} />
          {tex && <path d={d[code]} fill={`url(#${tex})`} />}
        </g>
      ) : null)}
    </g>
  );
}

/** A pixel banner for a place: pole, flag, base, and the number beside it. */
export function MapPin({ loc, active }: { loc: MapLocation; active: boolean }) {
  return (
    <g className="b-pin-map__body">
      <rect x={loc.x - 6} y={loc.y - 20} width="4" height="24" fill={INK} />
      <rect x={loc.x - 2} y={loc.y - 22} width="16" height="12" fill={active ? WAX : BRASS} />
      <rect x={loc.x - 2} y={loc.y - 12} width="16" height="2" fill={INK} fillOpacity="0.45" />
      <rect x={loc.x - 10} y={loc.y + 2} width="12" height="4" fill={INK} />
      {active && <rect x={loc.x - 14} y={loc.y - 30} width="36" height="40" fill="none" stroke={WAX} strokeWidth="2" strokeDasharray="4 4" />}
      <text x={loc.x + 17} y={loc.y - 12} fill={INK} fontSize="13" fontFamily="var(--font-data)">{loc.id}</text>
      {loc.type === 'underground' && <rect x={loc.x - 6} y={loc.y + 8} width="4" height="12" fill={INK} fillOpacity="0.5" />}
      {loc.type === 'aerial' && <rect x={loc.x - 8} y={loc.y - 34} width="8" height="8" fill="none" stroke={INK} strokeWidth="2" />}
    </g>
  );
}

/** Everything that sits on the ground: areas, lines and places. */
export function MapMarks({ locations, zones, paths, selectedId = null, pinProps, zoneProps, pathProps, title = true }: Omit<MapArtProps, 'terrain'>) {
  const label = (z: MapZone, y: number) =>
    z.label ? <text x={z.cx} y={y} textAnchor="middle" fill={INK} fillOpacity="0.75" fontSize="14" fontFamily="var(--font-text)">{handCase(z.label)}</text> : null;

  return (
    <g shapeRendering="crispEdges">
      {zones.filter(z => z.kind === 'lake').map(z => (
        <g key={z.id} {...zoneProps?.(z)}>
          <rect x={z.cx - z.rx} y={z.cy - z.ry} width={z.rx * 2} height={z.ry * 2} fill="url(#jWater)" />
          {label(z, z.cy + z.ry + 16)}
        </g>
      ))}
      {zones.filter(z => z.kind === 'land').map(z => (
        <g key={z.id} {...zoneProps?.(z)}>
          <rect x={z.cx - z.rx} y={z.cy - z.ry} width={z.rx * 2} height={z.ry * 2} fill="var(--map-land)" />
          <rect x={z.cx - z.rx} y={z.cy - z.ry} width={z.rx * 2} height={z.ry * 2} fill="url(#jLandTex)" />
          {label(z, z.cy + z.ry + 16)}
        </g>
      ))}
      {zones.filter(z => z.kind === 'mountain').map(z => (
        <g key={z.id} {...zoneProps?.(z)}>
          <path d={mountain(z)} fill={INK} fillOpacity="0.55" />
          {label(z, z.cy + z.ry + 16)}
        </g>
      ))}
      {zones.filter(z => z.kind === 'zone').map(z => (
        <g key={z.id} {...zoneProps?.(z)}>
          <rect x={z.cx - z.rx} y={z.cy - z.ry} width={z.rx * 2} height={z.ry * 2} fill="none" stroke={WAX} strokeOpacity="0.8" strokeWidth="3" strokeDasharray="10 10" />
          <text x={z.cx - z.rx + 10} y={z.cy - z.ry + 22} fill={WAX} fontSize="16" fontFamily="var(--font-text)" fontWeight="600">{handCase(z.label)}</text>
        </g>
      ))}

      {paths.map(p => {
        if (p.points.length < 2) return null;
        const river = p.kind === 'river';
        const d = stepped(p.points);
        return (
          <g key={p.id} fill="none" strokeLinecap="butt" strokeLinejoin="miter" {...pathProps?.(p)}>
            {river && <path className="b-trail" d={d} stroke="var(--map-water-2)" strokeWidth="14" />}
            <path className="b-trail" d={d} stroke={river ? 'var(--map-water)' : INK} strokeWidth={river ? 8 : 4} strokeDasharray={river ? undefined : '8 8'} />
          </g>
        );
      })}

      {locations.map(loc => (
        <g key={loc.id} className="b-pin-map" {...pinProps?.(loc)}>
          <rect className="b-pin-map__hit" x={loc.x - 22} y={loc.y - 30} width="44" height="44" />
          <MapPin loc={loc} active={loc.id === selectedId} />
        </g>
      ))}

      <g transform="translate(930 170)" fill={INK}>
        <rect x="-4" y="-40" width="8" height="80" fillOpacity="0.5" />
        <rect x="-40" y="-4" width="80" height="8" fillOpacity="0.5" />
        <rect x="-4" y="-40" width="8" height="36" fill={WAX} />
        <rect x="-8" y="-8" width="16" height="16" />
        <text y="-46" textAnchor="middle" fontSize="14" fontFamily="var(--font-data)">N</text>
      </g>
      {title && (
        <>
          <text x="44" y="56" fill={INK} fontSize="20" fontFamily="var(--font-display)">JOÐ · Heimurinn okkar</text>
          <text x="44" y="78" fill={INK} fillOpacity="0.75" fontSize="13" fontFamily="var(--font-data)">{locations.length} staðir, 2024 til {new Date().getFullYear()}</text>
        </>
      )}
    </g>
  );
}

export default function MapArt({ terrain, ...marks }: MapArtProps) {
  return (
    <>
      <Terrain terrain={terrain} />
      <MapMarks {...marks} />
    </>
  );
}

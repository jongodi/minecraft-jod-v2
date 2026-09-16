import type { SVGProps } from 'react';
import type { MapLocation, MapPath, MapZone } from '@/lib/map-types';
import { handCase } from './data';
import { MAP_CELL, MAP_GRID } from './mapGrid';

/* The map as blocks. Drawn once here so the public map and the admin
   editor show the same picture; the editor adds its handles on top. */

export const MAP_W = 1000;
export const MAP_H = 650;

const INK     = 'var(--map-ink)';
const LAND    = 'var(--map-land)';
const LAND_2  = 'var(--map-land-2)';
const SHORE   = 'var(--map-shore)';
const GRASS   = 'var(--map-grass)';
const WATER   = 'var(--map-water)';
const WATER_2 = 'var(--map-water-2)';
const BRASS   = 'var(--map-pin)';
const WAX     = 'var(--map-wax)';

/* One path per terrain kind: every matching block becomes a closed square. */
function blocks(kind: string): string {
  let d = '';
  MAP_GRID.forEach((row, r) => {
    for (let c = 0; c < row.length; c++) if (row[c] === kind) d += `M${c * MAP_CELL} ${r * MAP_CELL}h${MAP_CELL}v${MAP_CELL}h-${MAP_CELL}z`;
  });
  return d;
}
const LAND_D  = blocks('L');
const SHORE_D = blocks('S');

/* Rivers and roads walk the grid: each leg goes across, then down. */
const STEP = MAP_CELL / 2;
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
  /** The place drawn with the red banner. */
  selectedId?: number | null;
  /** Extra props for each pin group, zone group and path group: handlers, cursors, aria. */
  pinProps?: (loc: MapLocation) => G;
  zoneProps?: (zone: MapZone) => G;
  pathProps?: (path: MapPath) => G;
  /** The sheet title and count in the corner. */
  title?: boolean;
}

/** Shared <defs>: the water and land patterns. Render once per <svg>. */
export function MapDefs() {
  return (
    <defs>
      <pattern id="jWater" width="40" height="40" patternUnits="userSpaceOnUse">
        <rect width="40" height="40" fill={WATER} />
        <rect x="0" y="0" width="20" height="20" fill={WATER_2} />
        <rect x="20" y="20" width="20" height="20" fill={WATER_2} />
      </pattern>
      <pattern id="jLandTex" width="60" height="60" patternUnits="userSpaceOnUse">
        <rect x="20" y="0" width="20" height="20" fill={LAND_2} />
        <rect x="0" y="40" width="20" height="20" fill={LAND_2} />
      </pattern>
      <pattern id="jGrass" width="140" height="100" patternUnits="userSpaceOnUse">
        <rect x="40" y="20" width="20" height="20" fill={GRASS} />
        <rect x="60" y="20" width="20" height="20" fill={GRASS} />
        <rect x="100" y="60" width="20" height="20" fill={GRASS} />
        <rect x="0" y="80" width="20" height="20" fill={GRASS} />
      </pattern>
    </defs>
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

export default function MapArt({ locations, zones, paths, selectedId = null, pinProps, zoneProps, pathProps, title = true }: MapArtProps) {
  const label = (z: MapZone, y: number, fill = INK, opacity = 0.75) =>
    z.label ? <text x={z.cx} y={y} textAnchor="middle" fill={fill} fillOpacity={opacity} fontSize="14" fontFamily="var(--font-text)">{handCase(z.label)}</text> : null;

  return (
    <g shapeRendering="crispEdges">
      <rect width={MAP_W} height={MAP_H} fill="url(#jWater)" />
      <path d={SHORE_D} fill={SHORE} />
      <path d={LAND_D} fill={LAND} />
      <path d={LAND_D} fill="url(#jLandTex)" />
      <path d={LAND_D} fill="url(#jGrass)" />

      {zones.filter(z => z.kind === 'land').map(z => (
        <g key={z.id} {...zoneProps?.(z)}>
          <rect x={z.cx - z.rx} y={z.cy - z.ry} width={z.rx * 2} height={z.ry * 2} fill={LAND} />
          {label(z, z.cy + z.ry + 16)}
        </g>
      ))}
      {zones.filter(z => z.kind === 'lake').map(z => (
        <g key={z.id} {...zoneProps?.(z)}>
          <rect x={z.cx - z.rx} y={z.cy - z.ry} width={z.rx * 2} height={z.ry * 2} fill="url(#jWater)" />
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
            {river && <path className="b-trail" d={d} stroke={WATER_2} strokeWidth="14" />}
            <path className="b-trail" d={d} stroke={river ? WATER : INK} strokeWidth={river ? 8 : 4} strokeDasharray={river ? undefined : '8 8'} />
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

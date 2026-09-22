import type { MapLocation } from '@/lib/map-types';

/* The places, as BlueMap marker data: every place that has been given world
   coordinates in the map editor stands in the 3D map as a lantern. The viewer
   reads them from live/markers.json like any marker BlueMap made itself, so
   they are listed in its marker menu too. The markup is styled by
   public/bluemap-jod/jod.css, and public/bluemap-jod/jod.js turns a click on
   one into the place's postcard on the home page. */

export const PLACES_SET = 'jod-stadir';

const escape = (s: string) =>
  s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);

export interface MarkerData {
  type: 'html';
  position: { x: number; y: number; z: number };
  label: string;
  html: string;
  anchor: { x: number; y: number };
  sorting: number;
  listed: boolean;
  minDistance: number;
  maxDistance: number;
  classes: string[];
}

export interface MarkerSetData {
  label: string;
  toggleable: boolean;
  defaultHidden: boolean;
  sorting: number;
  markers: Record<string, MarkerData>;
}

export function placesMarkerSet(locations: MapLocation[]): MarkerSetData {
  const markers: Record<string, MarkerData> = {};
  locations.forEach((loc, i) => {
    if (!loc.world) return;
    const label = loc.label.trim() || 'Staður';
    const sub = loc.sublabel.replace(/\s*·\s*/g, ', ').trim();
    markers[`stadur-${loc.id}`] = {
      type: 'html',
      /* the middle of the block, a little over it, so the lantern stands on the ground */
      position: { x: loc.world.x + 0.5, y: loc.world.y + 1, z: loc.world.z + 0.5 },
      label,
      html:
        `<button type="button" class="jod-pin" data-stadur="${loc.id}" aria-label="${escape(label)}">` +
        `<span class="jod-pin__lamp" aria-hidden="true"></span>` +
        `<span class="jod-pin__label"><b>${escape(label)}</b>${sub ? `<small>${escape(sub)}</small>` : ''}</span>` +
        `</button>`,
      anchor: { x: 0, y: 0 },
      sorting: i,
      listed: true,
      minDistance: 0,
      maxDistance: 100000,
      classes: ['jod-place', `jod-place--${loc.type}`],
    };
  });
  return { label: 'Staðir', toggleable: true, defaultHidden: false, sorting: -1, markers };
}

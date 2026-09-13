'use client';

import { useState } from 'react';
import type { MapConfig } from '@/lib/map-types';
import { useResource } from './useResource';

export default function WorldMap() {
  const { data, loading, error, retry } = useResource<MapConfig>('/api/map');
  const [selected, setSelected] = useState<number | null>(null);
  const [zoom, setZoom] = useState(1);
  const location = data?.locations.find((item) => item.id === selected);
  const center = location ? [location.x, location.y] : [500, 350];
  if (!data)
    return (
      <div className="atlas-empty">
        {loading ? 'Loading the world map…' : 'The map is unavailable.'}
        {error && (
          <button className="atlas-text-button" onClick={retry}>
            Try again
          </button>
        )}
      </div>
    );
  return (
    <div className="atlas-map">
      <div className="atlas-map__drawing">
        <div className="atlas-map__label">
          <span>JOÐ / World atlas</span>
          <span>Sketch map · Not to scale</span>
        </div>
        <svg
          viewBox={`${center[0] - 500 / zoom} ${center[1] - 350 / zoom} ${1000 / zoom} ${700 / zoom}`}
          role="group"
          aria-label="World map with selectable locations"
        >
          <defs>
            <pattern
              id="atlas-grid"
              width="40"
              height="40"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M40 0H0V40"
                fill="none"
                stroke="currentColor"
                strokeWidth="0.5"
                opacity="0.15"
              />
            </pattern>
          </defs>
          <rect
            x="-1000"
            y="-1000"
            width="3000"
            height="3000"
            fill="url(#atlas-grid)"
          />
          {data.zones.map((zone) => (
            <g
              key={zone.id}
              className={`atlas-map__zone atlas-map__zone--${zone.kind}`}
            >
              {zone.kind === 'mountain' ? (
                <path
                  d={`M${zone.cx - zone.rx} ${zone.cy + zone.ry}L${zone.cx} ${zone.cy - zone.ry}L${zone.cx + zone.rx} ${zone.cy + zone.ry}Z`}
                />
              ) : (
                <ellipse cx={zone.cx} cy={zone.cy} rx={zone.rx} ry={zone.ry} />
              )}
              <text x={zone.cx} y={zone.cy - zone.ry - 12} textAnchor="middle">
                {zone.label}
              </text>
            </g>
          ))}
          {(data.paths ?? []).map((path) => (
            <polyline
              key={path.id}
              points={path.points.map((point) => point.join(',')).join(' ')}
              fill="none"
              stroke={path.kind === 'river' ? '#658b99' : '#7c8870'}
              strokeWidth={path.kind === 'river' ? 5 : 2}
              strokeDasharray={path.kind === 'border' ? '8 8' : undefined}
            />
          ))}
          {data.locations.map((place, index) => (
            <g
              key={place.id}
              role="button"
              tabIndex={0}
              aria-label={place.label}
              aria-pressed={selected === place.id}
              onClick={() => setSelected(place.id)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  setSelected(place.id);
                }
              }}
              className={`atlas-map__pin${selected === place.id ? ' is-selected' : ''}`}
              transform={`translate(${place.x},${place.y})`}
            >
              <rect x="-14" y="-14" width="28" height="28" />
              <text y="4" textAnchor="middle">
                {index + 1}
              </text>
              <title>
                {place.label} — {place.sublabel}
              </title>
            </g>
          ))}
        </svg>
        <div className="atlas-map__controls">
          <button
            onClick={() => setZoom((value) => Math.max(1, value - 0.5))}
            disabled={zoom === 1}
            aria-label="Zoom out"
          >
            −
          </button>
          <span>{zoom}×</span>
          <button
            onClick={() => setZoom((value) => Math.min(3, value + 0.5))}
            disabled={zoom === 3}
            aria-label="Zoom in"
          >
            +
          </button>
          <button
            onClick={() => {
              setZoom(1);
              setSelected(null);
            }}
          >
            Reset
          </button>
        </div>
      </div>
      <aside className="atlas-map__places">
        <span className="atlas-eyebrow">Find your bearings</span>
        <h3>
          {location ? location.label.toLocaleLowerCase() : 'Pick a place.'}
        </h3>
        <p aria-live="polite">
          {location
            ? `${location.sublabel} · ${location.type}`
            : 'Choose a marker or a place below to explore the world.'}
        </p>
        <label className="atlas-sr-only" htmlFor="map-place">
          Choose a location
        </label>
        <select
          id="map-place"
          value={selected ?? ''}
          onChange={(event) =>
            setSelected(event.target.value ? Number(event.target.value) : null)
          }
        >
          <option value="">All locations</option>
          {data.locations.map((place, i) => (
            <option key={place.id} value={place.id}>
              {String(i + 1).padStart(2, '0')} — {place.label}
            </option>
          ))}
        </select>
        <div className="atlas-map__key">
          <span>
            <i /> Settlements & builds
          </span>
          <span>
            <i /> Rivers & paths
          </span>
        </div>
        {error && (
          <button className="atlas-text-button" onClick={retry}>
            Refresh map
          </button>
        )}
      </aside>
    </div>
  );
}

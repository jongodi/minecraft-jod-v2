'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import type { Shot } from '@/data/gallery';
import { PLACES, REGIONS, RIVER, SEA, type Place } from '@/data/places';
import { contourPath } from './contour';

interface WorldMapProps {
  shots: readonly Shot[];
}

const RINGS = [0, 22, 44];

const LABEL: Record<Place['label'], { dx: number; dy: number; anchor: 'start' | 'end' | 'middle' }> = {
  right: { dx: 12, dy: 5, anchor: 'start' },
  left: { dx: -12, dy: 5, anchor: 'end' },
  above: { dx: 0, dy: -12, anchor: 'middle' },
  'below-right': { dx: 6, dy: 22, anchor: 'start' },
  'below-left': { dx: -6, dy: 22, anchor: 'end' },
};

const GRATICULE = { step: 100, w: 1000, h: 650 };

/**
 * The signature moment. An inline SVG of the world, contour rings drawn a
 * little unevenly like a hand would, the sea hatched, that surveys itself
 * once when it first scrolls into view; picking a place shows its picture. Pins
 * are small by nature, so the list beside the map is the real control on a
 * phone, and every pin has a 44 px hit area in the list.
 */
export function WorldMap({ shots }: WorldMapProps) {
  const [selected, setSelected] = useState<Place>(PLACES[1]);
  const [surveyed, setSurveyed] = useState(false);
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setSurveyed(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setSurveyed(true);
          io.disconnect();
        }
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const shot = shots.find((s) => s.pin === selected.pin);

  return (
    <div className="grid gap-y-6 lg:grid-cols-12 lg:gap-x-6">
      <svg
        ref={ref}
        viewBox="0 0 1000 650"
        className={`map w-full bg-bg-2 lg:col-span-8 ${surveyed ? 'is-surveyed' : ''}`}
        role="img"
        aria-label="Kort af heiminum: gamla basið efst til vinstri, nýja basið í miðjunni, Goði Castle langt til vinstri, Mushroom Island úti á hafi til hægri"
      >
        <g stroke="var(--line)" strokeWidth={0.75} opacity={0.5} aria-hidden="true">
          {Array.from({ length: GRATICULE.w / GRATICULE.step - 1 }, (_, i) => (
            <line key={`v${i}`} x1={(i + 1) * GRATICULE.step} y1={0} x2={(i + 1) * GRATICULE.step} y2={GRATICULE.h} />
          ))}
          {Array.from({ length: Math.floor(GRATICULE.h / GRATICULE.step) }, (_, i) => (
            <line key={`h${i}`} x1={0} y1={(i + 1) * GRATICULE.step} x2={GRATICULE.w} y2={(i + 1) * GRATICULE.step} />
          ))}
        </g>
        <defs>
          <pattern id="sea" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(-20)">
            <line x1="0" y1="7" x2="14" y2="7" stroke="var(--line)" strokeWidth="1.2" />
          </pattern>
        </defs>
        <path
          className="map-line"
          d={contourPath(SEA.cx, SEA.cy, SEA.rx, SEA.ry, 7, 0.1)}
          fill="url(#sea)"
          stroke="var(--line)"
          strokeWidth={1}
        />
        {REGIONS.map((r) =>
          RINGS.map((d, i) => (
            <path
              key={`${r.id}-${d}`}
              className="map-line"
              d={contourPath(r.cx, r.cy, r.rx + d, r.ry + d * (r.ry / r.rx), r.seed + i)}
              fill="none"
              stroke="var(--line)"
              strokeWidth={i === 0 ? 1.5 : 1}
              style={{ transitionDelay: `${i * 120}ms` }}
            />
          )),
        )}
        {REGIONS.map((r) => (
          <text
            key={r.id}
            x={r.cx}
            y={r.label === 'above' ? r.cy - r.ry - 52 : r.cy + r.ry + 62}
            textAnchor="middle"
            fontSize={15}
            letterSpacing={2}
            className="map-label fill-muted font-label uppercase"
          >
            {r.name}
          </text>
        ))}
        <polyline
          className="map-line"
          points={RIVER.map((p) => p.join(',')).join(' ')}
          fill="none"
          stroke="var(--muted)"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
          style={{ transitionDelay: '300ms' }}
        />
        {PLACES.map((p, i) => {
          const isSel = p.pin === selected.pin;
          return (
            <g
              key={p.pin}
              className="map-pin cursor-pointer"
              style={{ transitionDelay: `${500 + i * 60}ms` }}
              onClick={() => setSelected(p)}
            >
              <rect x={p.x - 5} y={p.y - 5} width={10} height={10} className={isSel ? 'fill-accent' : 'fill-text'} />
              <text
                x={p.x + LABEL[p.label].dx}
                y={p.y + LABEL[p.label].dy}
                textAnchor={LABEL[p.label].anchor}
                fontSize={17}
                letterSpacing={1.5}
                className={`font-label uppercase ${isSel ? 'fill-text' : 'fill-muted'}`}
              >
                {p.name}
              </text>
            </g>
          );
        })}
        <g className="map-label" aria-hidden="true">
          <text x={976} y={598} textAnchor="end" fontSize={15} letterSpacing={2} className="fill-text font-label uppercase">
            JOÐcraft, heimskortið
          </text>
          <text x={976} y={620} textAnchor="end" fontSize={13} letterSpacing={1.5} className="fill-muted font-label uppercase">
            {PLACES.length} staðir, {REGIONS.length} svæði, ekki í mælikvarða
          </text>
        </g>
      </svg>

      <div className="px-gutter lg:col-span-4 lg:px-0 lg:pr-gutter">
        {shot && (
          <figure>
            <Image
              src={shot.src}
              alt={shot.alt}
              width={shot.width}
              height={shot.height}
              sizes="(min-width: 1024px) 30vw, 100vw"
              className="aspect-photo w-full object-cover"
            />
            <figcaption className="mt-3 flex items-baseline justify-between gap-4">
              <span className="font-display text-name uppercase">{selected.name}</span>
              <span className="text-meta text-muted">{selected.where}</span>
            </figcaption>
          </figure>
        )}
        <ul className="mt-6 grid grid-cols-2 gap-x-4">
          {PLACES.map((p) => (
            <li key={p.pin}>
              <button
                type="button"
                onClick={() => setSelected(p)}
                aria-pressed={p.pin === selected.pin}
                className={`flex min-h-11 w-full items-center gap-3 py-2 text-left font-label text-label uppercase ${
                  p.pin === selected.pin ? 'text-text' : 'text-muted'
                }`}
              >
                <span className={`h-2 w-2 shrink-0 ${p.pin === selected.pin ? 'bg-accent' : 'bg-muted'}`} aria-hidden="true" />
                {p.name}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { motion, useMotionValue, animate } from 'framer-motion';
import type { MotionValue } from 'framer-motion';
import type { MapLocation, MapZone, MapPath } from '@/lib/map-types';
import { DEFAULT_LOCATIONS, DEFAULT_ZONES, DEFAULT_PATHS } from '@/lib/map-types';
import { Strata } from './Bits';
import { handCase, titleCase, type Plate } from './data';
import { MAP_CELL, MAP_GRID } from './mapGrid';
import { useReducedMotionPref } from './hooks';
import { clamp, rubberband, SPRING } from './motion';

const TYPE: Record<MapLocation['type'], string> = {
  surface: 'á yfirborði', underground: 'neðanjarðar', island: 'eyja', aerial: 'úr lofti',
};

/* Map colours are tokens; SVG presentation attributes accept var(). */
const INK    = 'var(--map-ink)';
const LAND   = 'var(--map-land)';
const LAND_2 = 'var(--map-land-2)';
const SHORE  = 'var(--map-shore)';
const GRASS  = 'var(--map-grass)';
const WATER  = 'var(--map-water)';
const WATER_2 = 'var(--map-water-2)';
const BRASS  = 'var(--map-pin)';
const WAX    = 'var(--map-wax)';

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
function stepped(points: [number, number][]): string {
  const snap = (v: number) => Math.round(v / STEP) * STEP;
  let d = '';
  points.forEach(([x, y], i) => {
    const sx = snap(x), sy = snap(y);
    d += i === 0 ? `M${sx} ${sy}` : `H${sx}V${sy}`;
  });
  return d;
}
const VB_W = 1000, VB_H = 650;
const MIN_Z = 1, MAX_Z = 3.2;

const spring = (mv: MotionValue<number>, to: number) =>
  animate(mv.get(), to, { ...SPRING, onUpdate: (v: number) => mv.set(v) });

export default function TerritoryMap({ plates }: { plates: Plate[] }) {
  const [locations, setLocations] = useState<MapLocation[]>(DEFAULT_LOCATIONS);
  const [zones,     setZones]     = useState<MapZone[]>(DEFAULT_ZONES);
  const [paths,     setPaths]     = useState<MapPath[]>(DEFAULT_PATHS);
  const [selectedId, setSelected] = useState<number>(DEFAULT_LOCATIONS[0]?.id ?? 0);
  const [surveyed, setSurveyed]   = useState(false);
  const sheet = useRef<HTMLDivElement>(null);

  const reduce = useReducedMotionPref();
  const x = useMotionValue(0), y = useMotionValue(0), z = useMotionValue(1);
  /* Under reduced motion the view still moves, it just does not spring. */
  const go = (mv: MotionValue<number>, to: number) => { if (reduce) mv.set(to); else spring(mv, to); };
  const drag = useRef<{ id: number; sx: number; sy: number; ox: number; oy: number; moved: boolean } | null>(null);
  const lastMoved = useRef(false);

  /* pan limits for the current zoom, in CSS px of the sheet */
  const limits = () => {
    const el = sheet.current!;
    const w = el.clientWidth, h = el.clientHeight, s = z.get();
    return { minX: w - w * s, minY: h - h * s, w, h };
  };
  const settle = () => {
    const { minX, minY } = limits();
    const tx = clamp(x.get(), minX, 0), ty = clamp(y.get(), minY, 0);
    spring(x, tx); spring(y, ty);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (reduce) return;
    drag.current = { id: e.pointerId, sx: e.clientX, sy: e.clientY, ox: x.get(), oy: y.get(), moved: false };
    x.stop(); y.stop();
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.sx, dy = e.clientY - d.sy;
    if (!d.moved && Math.abs(dx) + Math.abs(dy) > 6) {
      d.moved = true;
      try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* pointer may already be gone */ }
    }
    const { minX, minY, w, h } = limits();
    let nx = d.ox + dx, ny = d.oy + dy;
    if (nx > 0)    nx = rubberband(nx, w);
    if (nx < minX) nx = minX + rubberband(nx - minX, w);
    if (ny > 0)    ny = rubberband(ny, h);
    if (ny < minY) ny = minY + rubberband(ny - minY, h);
    x.set(nx); y.set(ny);
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (drag.current?.id !== e.pointerId) return;
    lastMoved.current = drag.current.moved;
    drag.current = null;
    settle();
  };
  const onWheel = (e: React.WheelEvent) => {
    const s0 = z.get();
    const zoomIntent = e.ctrlKey || e.metaKey;      // trackpad pinch arrives as ctrl+wheel
    if (reduce || !zoomIntent) return;              // plain wheel scrolls the page
    const s1 = clamp(s0 * (e.deltaY < 0 ? 1.12 : 1 / 1.12), MIN_Z, MAX_Z);
    if (s1 === s0) return;                          // nothing to do, let the page scroll
    e.preventDefault();
    const el = sheet.current!;
    const r = el.getBoundingClientRect();
    const px = e.clientX - r.left, py = e.clientY - r.top;
    /* keep the point under the cursor fixed */
    x.set(px - (px - x.get()) * (s1 / s0));
    y.set(py - (py - y.get()) * (s1 / s0));
    z.set(s1);
    settle();
  };
  /** Zoom by `factor`, centred on the sheet, springing to the new state. */
  const zoomBy = (factor: number) => {
    const el = sheet.current;
    if (!el) return;
    const w = el.clientWidth, h = el.clientHeight;
    const s0 = z.get();
    const s1 = clamp(s0 * factor, MIN_Z, MAX_Z);
    if (s1 === s0) return;
    const cx = w / 2, cy = h / 2;
    const nx = cx - (cx - x.get()) * (s1 / s0);
    const ny = cy - (cy - y.get()) * (s1 / s0);
    const minX = w - w * s1, minY = h - h * s1;
    go(z, s1);
    go(x, clamp(nx, minX, 0));
    go(y, clamp(ny, minY, 0));
  };
  /** Spring the view so `loc` sits at the centre at zoom 2. */
  const flyTo = (loc: MapLocation) => {
    setSelected(loc.id);
    const el = sheet.current!;
    const w = el.clientWidth, h = el.clientHeight;
    const s = 2;
    const cx = (loc.x / VB_W) * w * s, cy = (loc.y / VB_H) * h * s;
    go(z, s);
    go(x, clamp(w / 2 - cx, w - w * s, 0));
    go(y, clamp(h / 2 - cy, h - h * s, 0));
  };
  const resetView = () => { go(z, 1); go(x, 0); go(y, 0); };

  useEffect(() => {
    const el = sheet.current;
    if (!el) return;
    const h = (e: WheelEvent) => onWheel(e as unknown as React.WheelEvent);
    el.addEventListener('wheel', h, { passive: false });
    return () => el.removeEventListener('wheel', h);
  // onWheel reads motion values only; recreating it is harmless
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduce]);

  useEffect(() => {
    fetch('/api/map')
      .then(r => (r.ok ? r.json() : null))
      .then((cfg: { locations?: MapLocation[]; zones?: MapZone[]; paths?: MapPath[] } | null) => {
        if (cfg?.locations?.length) setLocations(cfg.locations);
        if (cfg?.zones?.length)     setZones(cfg.zones);
        if (cfg?.paths)             setPaths(cfg.paths);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const el = sheet.current;
    if (!el || !('IntersectionObserver' in window)) { setSurveyed(true); return; }
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSurveyed(true); obs.disconnect(); } }, { threshold: 0.3 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const selected = locations.find(l => l.id === selectedId) ?? locations[0] ?? null;
  const plate    = selected?.photoId ? plates.find(p => p.id === selected.photoId) ?? null : null;

  return (
    <section id="territory" className="b-sec b-sec--dusk-2" aria-labelledby="territory-title">
      <Strata flip />
      <div className="b-wrap">
        <div className="b-head">
          <div>
            <h2 id="territory-title" className="b-title">Landakort</h2>
            <p className="b-lede">Allir staðirnir í heiminum okkar. Dragðu kortið til, smelltu á pinna eða nafn til að sjá mynd.</p>
          </div>
        </div>
      </div>
      <div className="b-wrap b-map">
        <div className="b-map__wrap">
          <div ref={sheet} className={`b-map__sheet${surveyed ? ' is-surveyed' : ''}`}
            onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
            onDoubleClick={resetView}>
            <svg className="b-map__paper" viewBox="0 0 1000 650" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <defs>
                <pattern id="jWater" width="40" height="40" patternUnits="userSpaceOnUse">
                  <rect width="40" height="40" fill={WATER} />
                  <rect x="0" y="0" width="20" height="20" fill={WATER_2} />
                  <rect x="20" y="20" width="20" height="20" fill={WATER_2} />
                </pattern>
              </defs>
              <rect width="1000" height="650" fill="url(#jWater)" />
            </svg>
            <motion.div className="b-map__view" style={{ x, y, scale: z, transformOrigin: '0 0' }}>
            <svg viewBox="0 0 1000 650" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Landakort af JOÐ-heiminum" shapeRendering="crispEdges">
              <defs>
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

              <path d={SHORE_D} fill={SHORE} />
              <path d={LAND_D} fill={LAND} />
              <path d={LAND_D} fill="url(#jLandTex)" />
              <path d={LAND_D} fill="url(#jGrass)" />

              {zones.filter(z => z.kind === 'land').map(z => (
                <rect key={z.id} x={z.cx - z.rx} y={z.cy - z.ry} width={z.rx * 2} height={z.ry * 2} fill={LAND} />
              ))}
              {zones.filter(z => z.kind === 'lake').map(z => (
                <g key={z.id}>
                  <rect x={z.cx - z.rx} y={z.cy - z.ry} width={z.rx * 2} height={z.ry * 2} fill="url(#jWater)" />
                  {z.label && <text x={z.cx} y={z.cy + z.ry + 16} textAnchor="middle" fill={INK} fillOpacity="0.75" fontSize="14" fontFamily="var(--font-text)">{handCase(z.label)}</text>}
                </g>
              ))}
              {zones.filter(z => z.kind === 'mountain').map(z => (
                <g key={z.id}>
                  <path d={`M${z.cx - z.rx} ${z.cy + z.ry}H${z.cx + z.rx}V${z.cy + z.ry * 0.3}H${z.cx + z.rx * 0.5}V${z.cy - z.ry * 0.4}H${z.cx + z.rx * 0.2}V${z.cy - z.ry}H${z.cx - z.rx * 0.2}V${z.cy - z.ry * 0.4}H${z.cx - z.rx * 0.5}V${z.cy + z.ry * 0.3}H${z.cx - z.rx}Z`} fill={INK} fillOpacity="0.55" />
                  {z.label && <text x={z.cx} y={z.cy + z.ry + 16} textAnchor="middle" fill={INK} fillOpacity="0.75" fontSize="14" fontFamily="var(--font-text)">{handCase(z.label)}</text>}
                </g>
              ))}
              {zones.filter(z => z.kind === 'zone').map(z => (
                <g key={z.id}>
                  <rect x={z.cx - z.rx} y={z.cy - z.ry} width={z.rx * 2} height={z.ry * 2} fill="none" stroke={WAX} strokeOpacity="0.8" strokeWidth="3" strokeDasharray="10 10" />
                  <text x={z.cx - z.rx + 10} y={z.cy - z.ry + 22} fill={WAX} fontSize="16" fontFamily="var(--font-text)" fontWeight="600">{handCase(z.label)}</text>
                </g>
              ))}

              {paths.map(p => {
                if (p.points.length < 2) return null;
                const river = p.kind === 'river';
                return (
                  <g key={p.id} fill="none" strokeLinecap="butt" strokeLinejoin="miter">
                    {river && <path className="b-trail" d={stepped(p.points)} stroke={WATER_2} strokeWidth="14" />}
                    <path className="b-trail" d={stepped(p.points)} stroke={river ? WATER : INK} strokeWidth={river ? 8 : 4} strokeDasharray={river ? undefined : '8 8'} />
                  </g>
                );
              })}

              {locations.map(loc => {
                const active = loc.id === selected?.id;
                return (
                  <g key={loc.id} className="b-pin-map" onClick={() => { if (!lastMoved.current) setSelected(loc.id); }} role="button" tabIndex={0}
                    aria-label={`${loc.label}, ${TYPE[loc.type]}`}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelected(loc.id); } }}>
                    <rect className="b-pin-map__hit" x={loc.x - 22} y={loc.y - 30} width="44" height="44" />
                    <g className="b-pin-map__body">
                      {/* a pixel banner: pole, flag, base; the number rides beside it */}
                      <rect x={loc.x - 6} y={loc.y - 20} width="4" height="24" fill={INK} />
                      <rect x={loc.x - 2} y={loc.y - 22} width="16" height="12" fill={active ? WAX : BRASS} />
                      <rect x={loc.x - 2} y={loc.y - 12} width="16" height="2" fill={INK} fillOpacity="0.45" />
                      <rect x={loc.x - 10} y={loc.y + 2} width="12" height="4" fill={INK} />
                      {active && <rect x={loc.x - 14} y={loc.y - 30} width="36" height="40" fill="none" stroke={WAX} strokeWidth="2" strokeDasharray="4 4" />}
                      <text x={loc.x + 17} y={loc.y - 12} fill={INK} fontSize="13" fontFamily="var(--font-data)">{loc.id}</text>
                    </g>
                    {loc.type === 'underground' && <rect x={loc.x - 6} y={loc.y + 8} width="4" height="12" fill={INK} fillOpacity="0.5" />}
                    {loc.type === 'aerial' && <rect x={loc.x - 8} y={loc.y - 34} width="8" height="8" fill="none" stroke={INK} strokeWidth="2" />}
                  </g>
                );
              })}

              <g transform="translate(930 170)" fill={INK}>
                <rect x="-4" y="-40" width="8" height="80" fillOpacity="0.5" />
                <rect x="-40" y="-4" width="80" height="8" fillOpacity="0.5" />
                <rect x="-4" y="-40" width="8" height="36" fill={WAX} />
                <rect x="-8" y="-8" width="16" height="16" />
                <text y="-46" textAnchor="middle" fontSize="14" fontFamily="var(--font-data)">N</text>
              </g>
              <text x="44" y="56" fill={INK} fontSize="20" fontFamily="var(--font-display)">JOÐ · Heimurinn okkar</text>
              <text x="44" y="78" fill={INK} fillOpacity="0.75" fontSize="13" fontFamily="var(--font-data)">{locations.length} staðir, 2024 til {new Date().getFullYear()}</text>
            </svg>
            </motion.div>
            <button type="button" className="b-map__reset b-btn b-btn--small b-btn--solid" onClick={resetView}>Allt kortið</button>
            <div className="b-map__zoom">
              <button type="button" aria-label="Stækka kortið" onClick={() => zoomBy(1.4)}>+</button>
              <button type="button" aria-label="Minnka kortið" onClick={() => zoomBy(1 / 1.4)}>−</button>
            </div>
          </div>

          {selected && (
            <motion.figure
              key={selected.id}
              className="b-print b-map__print"
              initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.6, x: -120, y: -80, rotate: -6 }}
              animate={reduce ? { opacity: 1 } : { opacity: 1, scale: 1, x: 0, y: 0, rotate: 0 }}
              transition={reduce ? { duration: 0.2 } : SPRING}
              aria-live="polite"
            >
              {plate ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={plate.src} alt={plate.title} loading="lazy" />
              ) : (
                <div className="b-print__empty" aria-hidden="true"><span>engin mynd enn</span></div>
              )}
              <figcaption className="b-print__cap">
                <b>{selected.id}. {titleCase(selected.label)}</b>{selected.sublabel && <>, {handCase(selected.sublabel).replace(/\s*·\s*/g, ', ')}</>}
              </figcaption>
            </motion.figure>
          )}
        </div>

        <aside aria-label="Staðir á kortinu">
          <p className="b-note">{locations.length} staðir. Veldu einn og kortið flýgur þangað.</p>
          <ol className="b-index">
            {locations.map(loc => (
              <li key={loc.id}>
                <button className={loc.id === selected?.id ? 'is-active' : ''} onClick={() => flyTo(loc)}>
                  <span className="b-index__no">{loc.id}.</span>
                  <span className="b-index__label">{titleCase(loc.label)}</span>
                  <span className="b-index__type">{TYPE[loc.type]}</span>
                </button>
              </li>
            ))}
          </ol>
        </aside>
      </div>
    </section>
  );
}

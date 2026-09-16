'use client';

import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { motion, useMotionValue, animate } from 'framer-motion';
import type { MotionValue } from 'framer-motion';
import type { MapLocation, MapZone, MapPath } from '@/lib/map-types';
import { DEFAULT_LOCATIONS, DEFAULT_ZONES, DEFAULT_PATHS } from '@/lib/map-types';
import { Strata } from './Bits';
import { handCase, titleCase, type Plate } from './data';
import MapArt, { MapDefs, MAP_H, MAP_W } from './MapArt';
import { useReducedMotionPref } from './hooks';
import { clamp, rubberband, SPRING } from './motion';

const TYPE: Record<MapLocation['type'], string> = {
  surface: 'á yfirborði', underground: 'neðanjarðar', island: 'eyja', aerial: 'úr lofti',
};

const VB_W = MAP_W, VB_H = MAP_H;
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
            <motion.div className="b-map__view" style={{ x, y, scale: z, transformOrigin: '0 0' }}>
            <svg viewBox={`0 0 ${VB_W} ${VB_H}`} xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Landakort af JOÐ-heiminum">
              <MapDefs />
              <MapArt
                locations={locations}
                zones={zones}
                paths={paths}
                selectedId={selected?.id ?? null}
                pinProps={loc => ({
                  role: 'button',
                  tabIndex: 0,
                  'aria-label': `${loc.label}, ${TYPE[loc.type]}`,
                  onClick: () => { if (!lastMoved.current) setSelected(loc.id); },
                  onKeyDown: e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelected(loc.id); } },
                })}
              />
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

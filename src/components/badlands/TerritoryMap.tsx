'use client';

import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { motion, useMotionValue, animate } from 'framer-motion';
import type { MotionValue } from 'framer-motion';
import type { MapLocation, MapZone, MapPath } from '@/lib/map-types';
import { DEFAULT_LOCATIONS, DEFAULT_ZONES, DEFAULT_PATHS } from '@/lib/map-types';
import { Strata } from './Bits';
import { handCase, titleCase, type Plate } from './data';
import { useReducedMotionPref } from './hooks';
import { clamp, rubberband, SPRING } from './motion';

const TYPE: Record<MapLocation['type'], string> = {
  surface: 'á yfirborði', underground: 'neðanjarðar', island: 'eyja', aerial: 'úr lofti',
};

/* Map colours are tokens; SVG presentation attributes accept var(). */
const INK    = 'var(--map-ink)';
const PAPER  = 'var(--map-paper)';
const LAND   = 'var(--map-land)';
const WATER  = 'var(--map-water)';
const BRASS  = 'var(--map-pin)';
const WAX    = 'var(--map-wax)';
const LAND_PATH = 'M 435 60 C 528 45, 674 78, 752 142 C 810 194, 822 262, 818 330 C 814 402, 786 460, 746 502 C 700 550, 635 582, 555 596 C 476 610, 396 604, 320 582 C 232 558, 155 512, 110 458 C 62 400, 50 336, 56 278 C 62 218, 88 166, 132 136 C 182 100, 298 70, 435 60 Z';
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
                <filter id="jBurn2" x="-5%" y="-5%" width="110%" height="110%">
                  <feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="3" seed="4" result="n" />
                  <feDisplacementMap in="SourceGraphic" in2="n" scale="18" xChannelSelector="R" yChannelSelector="G" />
                </filter>
                <radialGradient id="jAge2" cx="0.5" cy="0.5" r="0.72">
                  <stop offset="0.55" stopColor={PAPER} />
                  <stop offset="0.86" stopColor="#c9b184" />
                  <stop offset="1" stopColor="#7a5230" />
                </radialGradient>
                <pattern id="jHatch2" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                  <line x1="0" y1="0" x2="0" y2="7" stroke={WATER} strokeOpacity="0.45" strokeWidth="1" />
                </pattern>
              </defs>
              <rect x="14" y="14" width="972" height="622" fill="url(#jAge2)" filter="url(#jBurn2)" />
              <rect x="14" y="14" width="972" height="622" fill="url(#jHatch2)" filter="url(#jBurn2)" opacity="0.9" />
            </svg>
            <motion.div className="b-map__view" style={{ x, y, scale: z, transformOrigin: '0 0' }}>
            <svg viewBox="0 0 1000 650" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Landakort af JOÐ-heiminum">
              <defs>
                <pattern id="jHatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                  <line x1="0" y1="0" x2="0" y2="7" stroke={WATER} strokeOpacity="0.45" strokeWidth="1" />
                </pattern>
                <radialGradient id="jTack" cx="0.35" cy="0.3" r="0.8">
                  <stop offset="0" stopColor="#f0d98a" /><stop offset="0.6" stopColor={BRASS} /><stop offset="1" stopColor="#7a5c1e" />
                </radialGradient>
                <radialGradient id="jWax" cx="0.35" cy="0.3" r="0.8">
                  <stop offset="0" stopColor="#c25a45" /><stop offset="0.7" stopColor={WAX} /><stop offset="1" stopColor="#5e2116" />
                </radialGradient>
                <radialGradient id="jShine" cx="0.3" cy="0.25" r="0.5"><stop offset="0" stopColor="#fff" stopOpacity="0.7" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></radialGradient>
              </defs>

              <path d={LAND_PATH} fill={LAND} stroke={INK} strokeWidth="1.5" />
              <path d={LAND_PATH} fill="none" stroke={INK} strokeOpacity="0.4" strokeWidth="0.8" transform="translate(500 325) scale(1.035) translate(-500 -325)" />
              <path d={LAND_PATH} fill="none" stroke={INK} strokeOpacity="0.2" strokeWidth="0.8" transform="translate(500 325) scale(1.07) translate(-500 -325)" />

              {zones.filter(z => z.kind === 'land').map(z => (
                <ellipse key={z.id} cx={z.cx} cy={z.cy} rx={z.rx} ry={z.ry} fill={LAND} stroke={INK} strokeOpacity="0.6" />
              ))}
              {zones.filter(z => z.kind === 'lake').map(z => (
                <g key={z.id}>
                  <ellipse cx={z.cx} cy={z.cy} rx={z.rx} ry={z.ry} fill="url(#jHatch)" stroke={INK} strokeOpacity="0.55" />
                  {z.label && <text x={z.cx} y={z.cy + z.ry + 16} textAnchor="middle" fill={INK} fillOpacity="0.75" fontSize="14" fontFamily="var(--font-text)">{handCase(z.label)}</text>}
                </g>
              ))}
              {zones.filter(z => z.kind === 'mountain').map(z => (
                <g key={z.id} fill="none" stroke={INK} strokeOpacity="0.75">
                  <polygon points={`${z.cx},${z.cy - z.ry} ${z.cx - z.rx},${z.cy + z.ry} ${z.cx + z.rx},${z.cy + z.ry}`} fill={PAPER} />
                  <line x1={z.cx} y1={z.cy - z.ry} x2={z.cx + z.rx * 0.35} y2={z.cy + z.ry * 0.4} />
                  {z.label && <text x={z.cx} y={z.cy + z.ry + 16} textAnchor="middle" fill={INK} fillOpacity="0.75" stroke="none" fontSize="14" fontFamily="var(--font-text)">{handCase(z.label)}</text>}
                </g>
              ))}
              {zones.filter(z => z.kind === 'zone').map(z => (
                <g key={z.id}>
                  <ellipse cx={z.cx} cy={z.cy} rx={z.rx} ry={z.ry} fill="none" stroke={WAX} strokeOpacity="0.75" strokeWidth="1.2" strokeDasharray="6 4" />
                  <text x={z.cx} y={z.cy - z.ry - 8} textAnchor="middle" fill={WAX} fontSize="16" fontFamily="var(--font-text)" fontWeight="600">{handCase(z.label)}</text>
                </g>
              ))}

              {paths.map(p => {
                if (p.points.length < 2) return null;
                const pts = p.points.map(([x, y]) => `${x},${y}`).join(' ');
                const river = p.kind === 'river';
                return (
                  <g key={p.id} fill="none" strokeLinecap="round" strokeLinejoin="round">
                    {river && <polyline className="b-trail" points={pts} stroke={WATER} strokeOpacity="0.4" strokeWidth="7" />}
                    <polyline className="b-trail" points={pts} stroke={river ? WATER : INK} strokeWidth={river ? 2 : 1.5} />
                  </g>
                );
              })}

              <ellipse cx="872" cy="260" rx="56" ry="44" fill={LAND} stroke={INK} strokeWidth="1.2" />
              {[[856, 247], [878, 238], [894, 256], [864, 268], [886, 272]].map(([x, y], i) => (
                <circle key={i} cx={x} cy={y} r="4" fill="none" stroke={WAX} strokeWidth="1.2" />
              ))}
              <ellipse cx="895" cy="490" rx="20" ry="14" fill={LAND} stroke={INK} strokeOpacity="0.7" />
              <ellipse cx="68"  cy="545" rx="24" ry="16" fill={LAND} stroke={INK} strokeOpacity="0.7" />
              <ellipse cx="780" cy="120" rx="16" ry="11" fill={LAND} stroke={INK} strokeOpacity="0.7" />

              {locations.map(loc => {
                const active = loc.id === selected?.id;
                return (
                  <g key={loc.id} className="b-pin-map" onClick={() => { if (!lastMoved.current) setSelected(loc.id); }} role="button" tabIndex={0}
                    aria-label={`${loc.label}, ${TYPE[loc.type]}`}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelected(loc.id); } }}>
                    <circle className="b-pin-map__hit" cx={loc.x} cy={loc.y} r="26" />
                    {active && <circle cx={loc.x} cy={loc.y} r="22" fill="none" stroke={WAX} strokeWidth="1" strokeDasharray="3 3" />}
                    <g className="b-pin-map__body">
                      <ellipse cx={loc.x + 2} cy={loc.y + 3} rx="13" ry="12" fill={INK} fillOpacity="0.35" />
                      <circle cx={loc.x} cy={loc.y} r="13" fill={active ? 'url(#jWax)' : 'url(#jTack)'} stroke={INK} strokeWidth="1" />
                      <circle cx={loc.x} cy={loc.y} r="13" fill="url(#jShine)" pointerEvents="none" />
                      <text x={loc.x} y={loc.y + 5} textAnchor="middle" fill={active ? '#f8f1de' : INK} fontSize="14" fontFamily="var(--font-text)" fontWeight="600">{loc.id}</text>
                    </g>
                    {loc.type === 'underground' && <line x1={loc.x} y1={loc.y + 15} x2={loc.x} y2={loc.y + 27} stroke={INK} strokeWidth="1.5" strokeDasharray="2 2" />}
                    {loc.type === 'aerial' && <circle cx={loc.x} cy={loc.y - 21} r="5" fill="none" stroke={INK} strokeWidth="1.2" />}
                  </g>
                );
              })}

              <g transform="translate(930 572)" fill="none" stroke={INK}>
                <circle r="30" strokeOpacity="0.7" /><circle r="22" strokeOpacity="0.35" />
                <path d="M0 -30 L6 -6 L0 -10 L-6 -6 Z" fill={WAX} stroke="none" />
                <path d="M0 30 L6 6 L0 10 L-6 6 Z M30 0 L6 6 L10 0 L6 -6 Z M-30 0 L-6 6 L-10 0 L-6 -6 Z" fill={INK} fillOpacity="0.7" stroke="none" />
                <circle r="2.2" fill={INK} stroke="none" />
                <text y="-36" textAnchor="middle" fill={INK} stroke="none" fontSize="14" fontFamily="var(--font-text)" fontWeight="600">N</text>
              </g>
              <text x="44" y="56" fill={INK} fontSize="20" fontFamily="var(--font-display)">JOÐ · Heimurinn okkar</text>
              <text x="44" y="78" fill={INK} fillOpacity="0.75" fontSize="15" fontFamily="var(--font-text)">{locations.length} staðir á kortinu, 2024 til {new Date().getFullYear()}</text>
              <rect x="30" y="30" width="940" height="590" fill="none" stroke={INK} strokeOpacity="0.55" strokeWidth="1" />
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

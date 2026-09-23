'use client';

import { useEffect, useRef } from 'react';
import { motion, useMotionValue, animate } from 'framer-motion';
import type { MotionValue } from 'framer-motion';
import type { MapConfig, MapLocation } from '@/lib/map-types';
import MapArt, { MapDefs, MAP_H, MAP_W } from './MapArt';
import { ZoomIcon } from './Bits';
import { useReducedMotionPref } from './hooks';
import { clamp, rubberband, SPRING } from './motion';

const TYPE: Record<MapLocation['type'], string> = {
  surface: 'á yfirborði', underground: 'neðanjarðar', island: 'eyja', aerial: 'úr lofti',
};

const MIN_Z = 1, MAX_Z = 3.2;

const spring = (mv: MotionValue<number>, to: number) =>
  animate(mv.get(), to, { ...SPRING, onUpdate: (v: number) => mv.set(v) });

interface Props {
  config: MapConfig;
  selectedId: number | null;
  onSelect: (id: number) => void;
}

/** The painted map, the paper sheet laid over the world when "Teiknað kort" is
    on. Drag to pan, pinch or the buttons to zoom, a flag to pick a place. It is
    the same sheet the admin panel paints, block for block. */
export default function MapSheet({ config, selectedId, onSelect }: Props) {
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
    go(x, clamp(x.get(), minX, 0));
    go(y, clamp(y.get(), minY, 0));
  };

  /* A drag is the hand moving the paper, not the page animating, so it works
     under reduced motion too; only the spring back into bounds is dropped. */
  const onPointerDown = (e: React.PointerEvent) => {
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
    go(z, s1);
    go(x, clamp(nx, w - w * s1, 0));
    go(y, clamp(ny, h - h * s1, 0));
  };
  const resetView = () => { go(z, 1); go(x, 0); go(y, 0); };

  /* trackpad pinch arrives as ctrl+wheel; a plain wheel scrolls the page */
  useEffect(() => {
    const el = sheet.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const s0 = z.get();
      const s1 = clamp(s0 * (e.deltaY < 0 ? 1.12 : 1 / 1.12), MIN_Z, MAX_Z);
      if (s1 === s0) return;
      e.preventDefault();
      const r = el.getBoundingClientRect();
      const px = e.clientX - r.left, py = e.clientY - r.top;
      x.set(px - (px - x.get()) * (s1 / s0));
      y.set(py - (py - y.get()) * (s1 / s0));
      z.set(s1);
      settle();
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  // motion values are stable; settle reads them fresh each call
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduce]);

  return (
    <div ref={sheet} className="b-sheet"
      onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
      onDoubleClick={resetView}>
      <motion.div className="b-sheet__view" style={{ x, y, scale: z, transformOrigin: '0 0' }}>
        <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Teiknað kort af JOÐ-heiminum">
          <MapDefs />
          <MapArt
            locations={config.locations}
            zones={config.zones}
            paths={config.paths ?? []}
            terrain={config.terrain}
            selectedId={selectedId}
            title={false}
            pinProps={loc => ({
              role: 'button',
              tabIndex: 0,
              'aria-label': `${loc.label}, ${TYPE[loc.type]}`,
              onClick: () => { if (!lastMoved.current) onSelect(loc.id); },
              onKeyDown: e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(loc.id); } },
            })}
          />
        </svg>
      </motion.div>
      <div className="b-sheet__zoom">
        <button type="button" aria-label="Stækka kortið" title="Stækka" onClick={() => zoomBy(1.4)}><ZoomIcon kind="in" /></button>
        <button type="button" aria-label="Minnka kortið" title="Minnka" onClick={() => zoomBy(1 / 1.4)}><ZoomIcon kind="out" /></button>
        <button type="button" aria-label="Allt kortið" title="Allt kortið" onClick={resetView}><ZoomIcon kind="fit" /></button>
      </div>
    </div>
  );
}

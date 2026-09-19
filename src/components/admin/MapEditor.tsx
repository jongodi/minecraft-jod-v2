'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MapConfig, MapLocation, MapPath, MapZone } from '@/lib/map-types';
import { CREW_USERNAMES } from '@/lib/crew-types';
import { mapLabel } from '@/lib/icelandic';
import {
  DEFAULT_TERRAIN, MATERIALS, TERRAIN_CELL, TERRAIN_COLS, TERRAIN_ROWS,
  fill as floodFill, normalizeTerrain, paint as paintBrush, terrainCounts,
  type Material,
} from '@/lib/terrain';
import { MapDefs, MapMarks, Terrain, MAP_H, MAP_W } from '@/components/badlands/MapArt';
import type { AdminPhoto } from './GalleryPanel';
import PhotoPicker from './PhotoPicker';
import { Button, Field, Kbd, Notice, Toggle, api, errText } from './ui';

/* ─── model ─────────────────────────────────────────────────────────────────── */

interface Doc { locations: MapLocation[]; zones: MapZone[]; paths: MapPath[]; terrain: string[] }
type Selection = { kind: 'pin'; id: number } | { kind: 'zone'; id: string } | { kind: 'path'; id: string } | null;
type Tool = 'select' | 'brush' | 'fill';
type Placing = 'pin' | 'zone' | 'land' | 'lake' | 'mountain' | null;
type Drag =
  | { kind: 'pin'; id: number; ox: number; oy: number }
  | { kind: 'zone'; id: string; ox: number; oy: number }
  | { kind: 'zone-size'; id: string; axis: 'rx' | 'ry'; start: number; from: number }
  | { kind: 'point'; id: string; idx: number; ox: number; oy: number }
  | null;

const GRID = 10;
const HISTORY = 60;
const BRUSH_SIZES = [1, 2, 3, 5, 8];
const ZONE_DEFAULTS: Record<Exclude<Placing, 'pin' | null>, { label: string; color: MapZone['colorKey']; rx: number; ry: number }> = {
  zone: { label: 'Nýtt svæði', color: 'purple', rx: 80, ry: 60 },
  land: { label: 'Ný landspilda', color: 'green', rx: 80, ry: 60 },
  lake: { label: 'Nýtt vatn', color: 'blue', rx: 30, ry: 30 },
  mountain: { label: 'Nýtt fjall', color: 'orange', rx: 40, ry: 50 },
};
const PATH_LABEL: Record<MapPath['kind'], string> = { river: 'Á', road: 'Vegur', border: 'Mörk' };

const serialize = (d: Doc) => JSON.stringify([d.locations, d.zones, d.paths, d.terrain]);
const clampX = (v: number) => Math.max(0, Math.min(MAP_W, Math.round(v)));
const clampY = (v: number) => Math.max(0, Math.min(MAP_H, Math.round(v)));

/** A document with undo and redo. Every committed change is one step. */
function useHistory(initial: Doc) {
  const [doc, setDoc] = useState<Doc>(initial);
  const past = useRef<Doc[]>([]);
  const future = useRef<Doc[]>([]);
  const [depth, setDepth] = useState({ past: 0, future: 0 });
  const sync = () => setDepth({ past: past.current.length, future: future.current.length });
  const push = (d: Doc) => { past.current = [...past.current.slice(-HISTORY + 1), d]; future.current = []; };
  const commit = useCallback((next: Doc | ((d: Doc) => Doc)) => {
    setDoc(d => {
      const n = typeof next === 'function' ? next(d) : next;
      if (serialize(n) === serialize(d)) return d;
      push(d);
      return n;
    });
    sync();
  }, []);
  /* live updates during a drag or a brush stroke do not add steps; `mark` opens one */
  const replace = useCallback((next: (d: Doc) => Doc) => setDoc(next), []);
  const mark = useCallback(() => { setDoc(d => { push(d); return d; }); sync(); }, []);
  const undo = useCallback(() => { setDoc(d => { const p = past.current.pop(); if (!p) return d; future.current.push(d); return p; }); sync(); }, []);
  const redo = useCallback(() => { setDoc(d => { const f = future.current.pop(); if (!f) return d; past.current.push(d); return f; }); sync(); }, []);
  const reset = useCallback((d: Doc) => { past.current = []; future.current = []; setDoc(d); sync(); }, []);
  return { doc, commit, replace, mark, undo, redo, reset, canUndo: depth.past > 0, canRedo: depth.future > 0 };
}

const toDoc = (cfg: MapConfig): Doc => ({
  locations: cfg.locations, zones: cfg.zones, paths: cfg.paths ?? [],
  terrain: normalizeTerrain(cfg.terrain ?? DEFAULT_TERRAIN),
});

/* ─── the editor ────────────────────────────────────────────────────────────── */

export default function MapEditor({ initialConfig }: { initialConfig: MapConfig }) {
  const h = useHistory(toDoc(initialConfig));
  const { doc, commit, replace, mark } = h;
  const [saved, setSaved] = useState(() => serialize(h.doc));
  const [selected, setSelected] = useState<Selection>(null);
  const [tool, setTool] = useState<Tool>('select');
  const [material, setMaterial] = useState<Material>('l');
  const [brush, setBrush] = useState(3);
  const [showGrid, setShowGrid] = useState(true);
  const [hover, setHover] = useState<[number, number] | null>(null);
  const [placing, setPlacing] = useState<Placing>(null);
  const [drawing, setDrawing] = useState<MapPath['kind'] | null>(null);
  const [drawPoints, setDrawPoints] = useState<[number, number][]>([]);
  const [snap, setSnap] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [photos, setPhotos] = useState<AdminPhoto[]>([]);
  const [photosError, setPhotosError] = useState('');
  const [picker, setPicker] = useState(false);
  const [uploading, setUploading] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<Drag>(null);
  const painting = useRef(false);
  const strokeStart = useRef<[number, number] | null>(null);
  const moved = useRef(false);

  const dirty = serialize(doc) !== saved;
  const painty = tool === 'brush' || tool === 'fill';
  const snapTo = useCallback((v: number) => (snap ? Math.round(v / GRID) * GRID : Math.round(v)), [snap]);

  const loadPhotos = useCallback(async () => {
    try { setPhotos(await api<AdminPhoto[]>('/api/admin/gallery')); setPhotosError(''); }
    catch { setPhotosError('Ekki tókst að sækja myndasafnið.'); }
  }, []);
  useEffect(() => { loadPhotos(); }, [loadPhotos]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  /* ─── coordinates ─── */
  const toSvg = useCallback((cx: number, cy: number): [number, number] => {
    const svg = svgRef.current;
    if (!svg) return [0, 0];
    const r = svg.getBoundingClientRect();
    return [(cx - r.left) * (MAP_W / r.width), (cy - r.top) * (MAP_H / r.height)];
  }, []);
  const toCell = useCallback((cx: number, cy: number): [number, number] => {
    const [x, y] = toSvg(cx, cy);
    return [Math.floor(x / TERRAIN_CELL), Math.floor(y / TERRAIN_CELL)];
  }, [toSvg]);

  /* ─── selection helpers ─── */
  const selPin  = selected?.kind === 'pin'  ? doc.locations.find(l => l.id === selected.id) ?? null : null;
  const selZone = selected?.kind === 'zone' ? doc.zones.find(z => z.id === selected.id) ?? null : null;
  const selPath = selected?.kind === 'path' ? doc.paths.find(p => p.id === selected.id) ?? null : null;
  const selPhoto = selPin?.photoId ? photos.find(p => p.id === selPin.photoId) ?? null : null;
  const photoById = useMemo(() => new Map(photos.map(p => [p.id, p])), [photos]);
  const land = useMemo(() => {
    const counts = terrainCounts(doc.terrain);
    const total = TERRAIN_COLS * TERRAIN_ROWS;
    return { counts, total, dry: total - (counts['~'] ?? 0) };
  }, [doc.terrain]);

  const updatePin  = (id: number, patch: Partial<MapLocation>) => commit(d => ({ ...d, locations: d.locations.map(l => l.id === id ? { ...l, ...patch } : l) }));
  const updateZone = (id: string, patch: Partial<MapZone>)     => commit(d => ({ ...d, zones: d.zones.map(z => z.id === id ? { ...z, ...patch } : z) }));
  const updatePath = (id: string, patch: Partial<MapPath>)     => commit(d => ({ ...d, paths: d.paths.map(p => p.id === id ? { ...p, ...patch } : p) }));

  function deleteSelected() {
    if (!selected) return;
    commit(d => selected.kind === 'pin' ? { ...d, locations: d.locations.filter(l => l.id !== selected.id) }
      : selected.kind === 'zone' ? { ...d, zones: d.zones.filter(z => z.id !== selected.id) }
      : { ...d, paths: d.paths.filter(p => p.id !== selected.id) });
    setSelected(null);
  }
  function duplicatePin(pin: MapLocation) {
    const id = Math.max(0, ...doc.locations.map(l => l.id)) + 1;
    commit(d => ({ ...d, locations: [...d.locations, { ...pin, id, x: clampX(pin.x + 30), y: clampY(pin.y + 30), photoId: null }] }));
    setSelected({ kind: 'pin', id });
  }
  /** A photo belongs to one place at a time: linking it here takes it off any other. */
  function linkPhoto(pinId: number, photoId: string | null): Doc {
    const next = { ...doc, locations: doc.locations.map(l => l.id === pinId ? { ...l, photoId } : photoId !== null && l.photoId === photoId ? { ...l, photoId: null } : l) };
    commit(next);
    return next;
  }

  /* ─── painting the ground ─── */
  const applyBrush = useCallback((cx: number, cy: number, straight = false) => {
    let [c, r] = toCell(cx, cy);
    /* Shift keeps a stroke on one axis, which is how a straight coast gets drawn. */
    const start = strokeStart.current;
    if (straight && start) {
      if (Math.abs(c - start[0]) >= Math.abs(r - start[1])) r = start[1];
      else c = start[0];
    }
    if (c < 0 || c >= TERRAIN_COLS || r < 0 || r >= TERRAIN_ROWS) return;
    replace(d => ({ ...d, terrain: paintBrush(d.terrain, c, r, brush, material) }));
  }, [toCell, replace, brush, material]);

  /* ─── pointer: drag, place, draw ─── */
  const startDrag = (e: React.PointerEvent, d: Exclude<Drag, null>) => {
    e.stopPropagation();
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    drag.current = d; moved.current = false;
    mark();
  };
  const pinDown = (e: React.PointerEvent, loc: MapLocation) => {
    const [mx, my] = toSvg(e.clientX, e.clientY);
    startDrag(e, { kind: 'pin', id: loc.id, ox: mx - loc.x, oy: my - loc.y });
    setSelected({ kind: 'pin', id: loc.id });
  };
  const zoneDown = (e: React.PointerEvent, z: MapZone) => {
    const [mx, my] = toSvg(e.clientX, e.clientY);
    startDrag(e, { kind: 'zone', id: z.id, ox: mx - z.cx, oy: my - z.cy });
    setSelected({ kind: 'zone', id: z.id });
  };
  const sizeDown = (e: React.PointerEvent, z: MapZone, axis: 'rx' | 'ry') => {
    const [mx, my] = toSvg(e.clientX, e.clientY);
    startDrag(e, { kind: 'zone-size', id: z.id, axis, start: z[axis], from: axis === 'rx' ? mx : my });
  };
  const pointDown = (e: React.PointerEvent, p: MapPath, idx: number) => {
    const [mx, my] = toSvg(e.clientX, e.clientY);
    startDrag(e, { kind: 'point', id: p.id, idx, ox: mx - p.points[idx][0], oy: my - p.points[idx][1] });
    setSelected({ kind: 'path', id: p.id });
  };

  const onSvgDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (tool !== 'brush' || placing || drawing) return;
    e.preventDefault();
    svgRef.current?.setPointerCapture(e.pointerId);
    painting.current = true;
    moved.current = true;
    strokeStart.current = toCell(e.clientX, e.clientY);
    mark();
    applyBrush(e.clientX, e.clientY, e.shiftKey);
  };

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (painty) setHover(toCell(e.clientX, e.clientY));
    if (painting.current) { applyBrush(e.clientX, e.clientY, e.shiftKey); return; }
    const d = drag.current;
    if (!d) return;
    moved.current = true;
    const [mx, my] = toSvg(e.clientX, e.clientY);
    if (d.kind === 'pin') replace(doc => ({ ...doc, locations: doc.locations.map(l => l.id === d.id ? { ...l, x: clampX(snapTo(mx - d.ox)), y: clampY(snapTo(my - d.oy)) } : l) }));
    else if (d.kind === 'zone') replace(doc => ({ ...doc, zones: doc.zones.map(z => z.id === d.id ? { ...z, cx: clampX(snapTo(mx - d.ox)), cy: clampY(snapTo(my - d.oy)) } : z) }));
    else if (d.kind === 'zone-size') {
      const delta = (d.axis === 'rx' ? mx : my) - d.from;
      replace(doc => ({ ...doc, zones: doc.zones.map(z => z.id === d.id ? { ...z, [d.axis]: Math.max(10, snapTo(d.start + delta)) } : z) }));
    } else if (d.kind === 'point') replace(doc => ({ ...doc, paths: doc.paths.map(p => p.id === d.id ? { ...p, points: p.points.map((pt, i) => i === d.idx ? [clampX(snapTo(mx - d.ox)), clampY(snapTo(my - d.oy))] as [number, number] : pt) } : p) }));
  };
  const onUp = () => { drag.current = null; painting.current = false; strokeStart.current = null; };

  const onClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (tool === 'fill' && !placing && !drawing) {
      const [c, r] = toCell(e.clientX, e.clientY);
      if (c >= 0 && c < TERRAIN_COLS && r >= 0 && r < TERRAIN_ROWS) commit(d => ({ ...d, terrain: floodFill(d.terrain, c, r, material) }));
      return;
    }
    if (moved.current) { moved.current = false; return; }
    const [rx, ry] = toSvg(e.clientX, e.clientY);
    const mx = clampX(snapTo(rx)), my = clampY(snapTo(ry));
    if (drawing) {
      if (e.detail >= 2) { finishDrawing(); return; }
      setDrawPoints(pts => [...pts, [mx, my]]);
      return;
    }
    if (!placing) { setSelected(null); return; }
    if (placing === 'pin') {
      const id = Math.max(0, ...doc.locations.map(l => l.id)) + 1;
      commit(d => ({ ...d, locations: [...d.locations, { id, label: 'Nýr staður', sublabel: '', x: mx, y: my, type: 'surface', photoId: null }] }));
      setSelected({ kind: 'pin', id });
    } else {
      const def = ZONE_DEFAULTS[placing];
      const id = `${placing}-${Date.now()}`;
      commit(d => ({ ...d, zones: [...d.zones, { id, label: def.label, kind: placing, cx: mx, cy: my, rx: def.rx, ry: def.ry, colorKey: def.color }] }));
      setSelected({ kind: 'zone', id });
    }
    setPlacing(null);
  };
  function finishDrawing() {
    if (drawing && drawPoints.length >= 2) {
      const id = `path-${Date.now()}`;
      const kind = drawing;
      commit(d => ({ ...d, paths: [...d.paths, { id, label: PATH_LABEL[kind], kind, points: drawPoints, colorKey: kind === 'river' ? 'blue' : 'orange' }] }));
      setSelected({ kind: 'path', id });
    }
    setDrawing(null); setDrawPoints([]);
  }

  /* ─── keyboard ─── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement | null)?.closest('input, textarea, select');
      if (e.key === 'Escape') { setPlacing(null); setDrawing(null); setDrawPoints([]); if (!typing) setSelected(null); return; }
      if (typing) return;
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); if (e.shiftKey) h.redo(); else h.undo(); return; }
      if (mod && e.key.toLowerCase() === 'y') { e.preventDefault(); h.redo(); return; }
      if (mod && e.key.toLowerCase() === 's') { e.preventDefault(); save(); return; }
      if (mod) return;
      const key = e.key.toLowerCase();
      if (key === 'v') { setTool('select'); return; }
      if (key === 'b') { setTool('brush'); setPlacing(null); setDrawing(null); return; }
      if (key === 'f') { setTool('fill'); setPlacing(null); setDrawing(null); return; }
      if (key === 'g') { setShowGrid(s => !s); return; }
      if (key === '[') { setBrush(b => BRUSH_SIZES[Math.max(0, BRUSH_SIZES.indexOf(b) - 1)]); return; }
      if (key === ']') { setBrush(b => BRUSH_SIZES[Math.min(BRUSH_SIZES.length - 1, BRUSH_SIZES.indexOf(b) + 1)]); return; }
      const slot = Number(e.key);
      if (slot >= 1 && slot <= MATERIALS.length) { setMaterial(MATERIALS[slot - 1].code); if (tool === 'select') setTool('brush'); return; }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selected) { e.preventDefault(); deleteSelected(); return; }
      if (e.key === 'Enter' && drawing) { e.preventDefault(); finishDrawing(); return; }
      const arrow = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
      if (arrow && selected && selected.kind !== 'path') {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        const dx = arrow[0] * step, dy = arrow[1] * step;
        if (selected.kind === 'pin') commit(d => ({ ...d, locations: d.locations.map(l => l.id === selected.id ? { ...l, x: clampX(l.x + dx), y: clampY(l.y + dy) } : l) }));
        else commit(d => ({ ...d, zones: d.zones.map(z => z.id === selected.id ? { ...z, cx: clampX(z.cx + dx), cy: clampY(z.cy + dy) } : z) }));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  /* ─── save ─── */
  async function persist(cfg: Doc): Promise<boolean> {
    setSaving(true);
    try {
      const r = await api<{ config?: MapConfig }>('/api/admin/map', { method: 'PUT', body: JSON.stringify(cfg) });
      const stored = r.config ? toDoc(r.config) : cfg;
      h.reset(stored);
      setSaved(serialize(stored));
      loadPhotos();
      return true;
    } catch (e) { setMsg(errText(e)); return false; }
    finally { setSaving(false); }
  }
  async function save() { setMsg(''); if (await persist(doc)) setMsg('✓ Kortið er vistað og komið á vefinn.'); }
  async function discard() {
    if (!confirm('Henda óvistuðum breytingum og sækja síðustu vistuðu útgáfu kortsins?')) return;
    try {
      const cfg = await api<MapConfig>('/api/admin/map');
      h.reset(toDoc(cfg));
      setSaved(serialize(toDoc(cfg)));
      setSelected(null); setMsg('✓ Síðasta vistaða útgáfa sótt.');
    } catch (e) { setMsg(errText(e)); }
  }
  function resetTerrain() {
    if (!confirm('Setja landslagið aftur í upprunalega heiminn? Staðir, svæði og línur haldast.')) return;
    commit(d => ({ ...d, terrain: normalizeTerrain(DEFAULT_TERRAIN) }));
  }
  async function uploadForPin(pin: MapLocation, file: File) {
    setUploading(true); setMsg('');
    try {
      const fd = new FormData();
      fd.append('file', file); fd.append('title', pin.label); fd.append('sublabel', pin.sublabel);
      const photo = await api<AdminPhoto>('/api/admin/gallery/upload', { method: 'POST', body: fd });
      setPhotos(ps => [...ps, photo]);
      const next = linkPhoto(pin.id, photo.id);
      setPicker(false);
      setMsg((await persist(next)) ? '✓ Myndin er komin í safnið, tengd staðnum og kortið vistað.' : '✗ Myndin er í safninu en kortið vistaðist ekki. Vistaðu aftur.');
    } catch (e) { setMsg(errText(e)); }
    finally { setUploading(false); }
  }

  /* ─── tool buttons ─── */
  const pick = (label: string, active: boolean, onClick: () => void, title?: string) =>
    <Button key={label} small tone="ghost" on={active} onClick={onClick} title={title}>{label}</Button>;
  const place = (mode: Exclude<Placing, null>, label: string) =>
    pick(label, placing === mode, () => { setTool('select'); setPlacing(placing === mode ? null : mode); setDrawing(null); setDrawPoints([]); setSelected(null); });
  const draw = (mode: MapPath['kind'], label: string) =>
    pick(label, drawing === mode, () => { setTool('select'); if (drawing === mode) finishDrawing(); else { setDrawing(mode); setDrawPoints([]); setPlacing(null); setSelected(null); } });

  const cursorClass = painty ? ' is-painting' : (placing || drawing) ? ' is-placing' : '';

  return (
    <div className="a-stack">
      {/* ground tools */}
      <div className="a-toolbar">
        {pick('Velja', tool === 'select' && !placing && !drawing, () => { setTool('select'); setPlacing(null); setDrawing(null); }, 'V')}
        {pick('Pensill', tool === 'brush', () => { setTool('brush'); setPlacing(null); setDrawing(null); setSelected(null); }, 'B')}
        {pick('Fylla', tool === 'fill', () => { setTool('fill'); setPlacing(null); setDrawing(null); setSelected(null); }, 'F')}
        <span className="a-toolbar__sep" />
        <div className="a-swatches" role="radiogroup" aria-label="Landslagsefni">
          {MATERIALS.map((m, i) => (
            <button
              key={m.code}
              type="button"
              role="radio"
              aria-checked={material === m.code}
              className={`a-swatch${material === m.code ? ' is-on' : ''}`}
              title={`${m.hint} (${i + 1})`}
              onClick={() => { setMaterial(m.code); if (tool === 'select') setTool('brush'); }}
            >
              <span className="a-swatch__chip" style={{ background: m.fill }} aria-hidden="true" />
              {m.label}
            </button>
          ))}
        </div>
        <span className="a-toolbar__sep" />
        <span className="a-muted">Pensill</span>
        {BRUSH_SIZES.map(s => pick(String(s), brush === s, () => { setBrush(s); if (tool !== 'brush') setTool('brush'); }, `${s}×${s} reitir`))}
      </div>

      {/* marks and document */}
      <div className="a-toolbar">
        {place('pin', '+ Staður')}{place('zone', '+ Svæði')}{place('land', '+ Land')}{place('lake', '+ Vatn')}{place('mountain', '+ Fjall')}
        <span className="a-toolbar__sep" />
        {draw('river', 'Teikna á')}{draw('road', 'Teikna veg')}{draw('border', 'Teikna mörk')}
        <span className="a-toolbar__sep" />
        {pick('Rist', showGrid, () => setShowGrid(g => !g), 'G')}
        {pick(`Grip ${snap ? 'á' : 'af'}`, snap, () => setSnap(s => !s), 'Staðir grípa í ristina')}
        <Button small tone="ghost" onClick={h.undo} disabled={!h.canUndo} title="Ctrl+Z">Afturkalla</Button>
        <Button small tone="ghost" onClick={h.redo} disabled={!h.canRedo} title="Ctrl+Shift+Z">Endurtaka</Button>
        <span className="a-toolbar__spacer" />
        {dirty && !saving && <span className="a-update a-update--new">óvistaðar breytingar</span>}
        <Button small tone="ghost" onClick={discard} disabled={saving || uploading || !dirty}>Henda</Button>
        <Button small tone="primary" onClick={save} disabled={saving || uploading} title="Ctrl+S">{saving ? 'Vista' : 'Vista kort'}</Button>
      </div>
      <Notice text={msg} />

      <div className="a-editor">
        <div className={`a-editor__map${cursorClass}`}>
          <svg
            ref={svgRef}
            viewBox={`0 0 ${MAP_W} ${MAP_H}`}
            onPointerDown={onSvgDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
            onPointerLeave={() => setHover(null)}
            onClick={onClick}
            aria-label="Kortaritill"
          >
            <MapDefs />
            <Terrain terrain={doc.terrain} />
            {showGrid && (
              <g className="a-editor__grid" aria-hidden="true">
                {Array.from({ length: TERRAIN_COLS - 1 }, (_, i) => <line key={`v${i}`} x1={(i + 1) * TERRAIN_CELL} y1={0} x2={(i + 1) * TERRAIN_CELL} y2={MAP_H} />)}
                {Array.from({ length: TERRAIN_ROWS - 1 }, (_, i) => <line key={`h${i}`} x1={0} y1={(i + 1) * TERRAIN_CELL} x2={MAP_W} y2={(i + 1) * TERRAIN_CELL} />)}
              </g>
            )}
            <MapMarks
              locations={doc.locations} zones={doc.zones} paths={doc.paths}
              selectedId={selPin?.id ?? null}
              pinProps={loc => (tool === 'select' && !placing && !drawing
                ? { onPointerDown: (e: React.PointerEvent) => pinDown(e, loc), style: { cursor: 'grab' } }
                : { style: { pointerEvents: 'none' } })}
              zoneProps={z => (tool === 'select' && !placing && !drawing
                ? { onPointerDown: (e: React.PointerEvent) => zoneDown(e, z), style: { cursor: 'move' } }
                : { style: { pointerEvents: 'none' } })}
              pathProps={p => (tool === 'select' && !placing && !drawing
                ? { onClick: (e: React.MouseEvent) => { e.stopPropagation(); setSelected({ kind: 'path', id: p.id }); }, style: { cursor: 'pointer' } }
                : { style: { pointerEvents: 'none' } })}
            />
            {/* editor overlays: selection, handles, drawing preview, brush */}
            <g shapeRendering="crispEdges" fill="none">
              {selZone && (
                <>
                  <rect x={selZone.cx - selZone.rx} y={selZone.cy - selZone.ry} width={selZone.rx * 2} height={selZone.ry * 2} stroke="var(--lantern)" strokeWidth="3" strokeDasharray="6 6" pointerEvents="none" />
                  {([['rx', selZone.cx + selZone.rx, selZone.cy], ['rx', selZone.cx - selZone.rx, selZone.cy], ['ry', selZone.cx, selZone.cy + selZone.ry], ['ry', selZone.cx, selZone.cy - selZone.ry]] as const).map(([axis, x, y], i) => (
                    <rect key={i} x={x - 7} y={y - 7} width="14" height="14" fill="var(--lantern)" stroke="var(--night)" strokeWidth="2" style={{ cursor: axis === 'rx' ? 'ew-resize' : 'ns-resize' }} onPointerDown={e => sizeDown(e, selZone, axis)} />
                  ))}
                </>
              )}
              {selPath && selPath.points.map(([x, y], i) => (
                <rect key={i} x={x - 7} y={y - 7} width="14" height="14" fill="var(--lantern)" stroke="var(--night)" strokeWidth="2" style={{ cursor: 'grab' }}
                  onPointerDown={e => pointDown(e, selPath, i)}
                  onDoubleClick={e => { e.stopPropagation(); if (selPath.points.length > 2) updatePath(selPath.id, { points: selPath.points.filter((_, k) => k !== i) }); }} />
              ))}
              {drawing && drawPoints.length > 0 && (
                <>
                  <polyline points={drawPoints.map(p => p.join(',')).join(' ')} stroke="var(--lantern)" strokeWidth="4" strokeDasharray="8 8" pointerEvents="none" />
                  {drawPoints.map(([x, y], i) => <rect key={i} x={x - 5} y={y - 5} width="10" height="10" fill="var(--lantern)" pointerEvents="none" />)}
                </>
              )}
              {painty && hover && (
                <rect
                  pointerEvents="none"
                  x={(hover[0] - Math.floor(((tool === 'brush' ? brush : 1) - 1) / 2)) * TERRAIN_CELL}
                  y={(hover[1] - Math.floor(((tool === 'brush' ? brush : 1) - 1) / 2)) * TERRAIN_CELL}
                  width={(tool === 'brush' ? brush : 1) * TERRAIN_CELL}
                  height={(tool === 'brush' ? brush : 1) * TERRAIN_CELL}
                  fill="var(--lantern)" fillOpacity="0.22" stroke="var(--lantern)" strokeWidth="3"
                />
              )}
            </g>
          </svg>
          {(placing || drawing || painty) && (
            <span className="a-editor__hint">
              {placing ? `Smelltu þar sem ${mapLabel(placing).toLowerCase()} á að vera. Esc hættir við.`
                : drawing ? `Smelltu til að bæta við punktum (${drawPoints.length}). Tvísmelltu eða Enter lýkur, Esc hættir við.`
                : tool === 'fill' ? `Smelltu á svæði til að fylla það af: ${MATERIALS.find(m => m.code === material)?.label.toLowerCase()}.`
                : `Dragðu til að mála: ${MATERIALS.find(m => m.code === material)?.label.toLowerCase()}, pensill ${brush}×${brush}. Haltu Shift niðri fyrir beina línu.`}
            </span>
          )}
        </div>

        <aside className="a-editor__side">
          {painty ? (
            <div className="a-side">
              <p className="a-side__title"><span>Landslag</span><Button tone="ghost" small onClick={resetTerrain}>Núllstilla</Button></p>
              <p className="a-help">
                Málaðu heiminn beint á kortið. Strönd teiknast sjálfkrafa þar sem land mætir sjó, svo hafið lítur rétt út án þess að þú málir hana.
              </p>
              <ul className="a-legend">
                {MATERIALS.map(m => (
                  <li key={m.code}>
                    <span className="a-swatch__chip" style={{ background: m.fill }} aria-hidden="true" />
                    <span>{m.label}</span>
                    <span className="a-muted">{Math.round(((land.counts[m.code] ?? 0) / land.total) * 100)}%</span>
                  </li>
                ))}
              </ul>
              <p className="a-help">
                Þurrlendi þekur {Math.round((land.dry / land.total) * 100)}% af kortinu.
              </p>
              <p className="a-help">
                <Kbd>B</Kbd> pensill, <Kbd>F</Kbd> fylla, <Kbd>V</Kbd> velja, <Kbd>G</Kbd> rist, <Kbd>1</Kbd>–<Kbd>6</Kbd> efni, <Kbd>[</Kbd> <Kbd>]</Kbd> stærð.
              </p>
            </div>
          ) : selPin ? (
            <div className="a-side">
              <p className="a-side__title"><span>Staður {selPin.id}</span><Button tone="ghost" small onClick={() => duplicatePin(selPin)}>Afrita</Button></p>
              <Field label="Heiti"><input className="a-input" value={selPin.label} onChange={e => updatePin(selPin.id, { label: e.target.value })} maxLength={100} /></Field>
              <Field label="Undirtitill"><input className="a-input" value={selPin.sublabel} onChange={e => updatePin(selPin.id, { sublabel: e.target.value })} maxLength={100} /></Field>
              <Field label="Tegund">
                <select className="a-select" value={selPin.type} onChange={e => updatePin(selPin.id, { type: e.target.value as MapLocation['type'] })}>
                  {(['surface', 'underground', 'island', 'aerial'] as const).map(t => <option key={t} value={t}>{mapLabel(t)}</option>)}
                </select>
              </Field>
              <div className="a-field">
                <span className="a-label">Byggt af</span>
                <div className="a-inline a-builders">
                  {CREW_USERNAMES.map(name => {
                    const on = (selPin.builders ?? []).includes(name);
                    return (
                      <Toggle key={name} checked={on} label={name} onChange={v => updatePin(selPin.id, { builders: v ? [...(selPin.builders ?? []), name] : (selPin.builders ?? []).filter(b => b !== name) })} />
                    );
                  })}
                </div>
                <span className="a-help">Póstkortið segir hver byggði staðinn og veggur hvers og eins telur upp það sem viðkomandi byggði.</span>
              </div>
              <div className="a-inline">
                <Field label="X"><input className="a-input a-input--num a-input--data" type="number" min={0} max={MAP_W} value={selPin.x} onChange={e => updatePin(selPin.id, { x: clampX(Number(e.target.value)) })} /></Field>
                <Field label="Y"><input className="a-input a-input--num a-input--data" type="number" min={0} max={MAP_H} value={selPin.y} onChange={e => updatePin(selPin.id, { y: clampY(Number(e.target.value)) })} /></Field>
              </div>
              <div className="a-field">
                <span className="a-label">Mynd sem birtist</span>
                {selPhoto ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <div className="a-photo"><img src={selPhoto.filename} alt={selPhoto.title} /></div>
                    <p className="a-muted">{selPhoto.title}{!selPhoto.active && '. Falin í albúminu, birtist því ekki á kortinu fyrr en hún er sýnd aftur.'}</p>
                    <div className="a-inline"><Button small onClick={() => setPicker(true)}>Skipta um mynd</Button><Button small tone="ghost" onClick={() => linkPhoto(selPin.id, null)}>Aftengja</Button></div>
                  </>
                ) : (
                  <>
                    <p className="a-muted">{selPin.photoId ? (photosError || 'Tengda myndin fannst ekki í myndasafninu.') : 'Engin mynd tengd þessum stað.'}</p>
                    <div className="a-inline">
                      <Button small onClick={() => setPicker(true)}>Velja úr myndasafni</Button>
                      <label className="a-btn a-btn--small a-btn--ghost" style={{ cursor: uploading ? 'wait' : 'pointer' }}>
                        {uploading ? 'Hleð upp' : 'Hlaða upp nýrri'}
                        <input type="file" accept="image/*" disabled={uploading} style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) uploadForPin(selPin, f); }} />
                      </label>
                    </div>
                  </>
                )}
              </div>
              <Button tone="danger" small onClick={deleteSelected}>Eyða stað</Button>
            </div>
          ) : selZone ? (
            <div className="a-side">
              <p className="a-side__title"><span>{mapLabel(selZone.kind)}</span></p>
              <Field label="Heiti"><input className="a-input" value={selZone.label} onChange={e => updateZone(selZone.id, { label: e.target.value })} maxLength={100} /></Field>
              <div className="a-inline">
                <Field label="Miðja X"><input className="a-input a-input--num a-input--data" type="number" value={selZone.cx} onChange={e => updateZone(selZone.id, { cx: clampX(Number(e.target.value)) })} /></Field>
                <Field label="Miðja Y"><input className="a-input a-input--num a-input--data" type="number" value={selZone.cy} onChange={e => updateZone(selZone.id, { cy: clampY(Number(e.target.value)) })} /></Field>
              </div>
              <div className="a-inline">
                <Field label="Hálf breidd"><input className="a-input a-input--num a-input--data" type="number" min={10} value={selZone.rx} onChange={e => updateZone(selZone.id, { rx: Math.max(10, Math.round(Number(e.target.value))) })} /></Field>
                <Field label="Hálf hæð"><input className="a-input a-input--num a-input--data" type="number" min={10} value={selZone.ry} onChange={e => updateZone(selZone.id, { ry: Math.max(10, Math.round(Number(e.target.value))) })} /></Field>
              </div>
              <p className="a-help">Dragðu til að færa, dragðu gulu handföngin til að breyta stærð, örvatakkar færa um einn pixil (með Shift um tíu).</p>
              <Button tone="danger" small onClick={deleteSelected}>Eyða</Button>
            </div>
          ) : selPath ? (
            <div className="a-side">
              <p className="a-side__title"><span>{mapLabel(selPath.kind)}</span></p>
              <Field label="Heiti"><input className="a-input" value={selPath.label} onChange={e => updatePath(selPath.id, { label: e.target.value })} maxLength={100} /></Field>
              <Field label="Tegund">
                <select className="a-select" value={selPath.kind} onChange={e => updatePath(selPath.id, { kind: e.target.value as MapPath['kind'] })}>
                  {(['river', 'road', 'border'] as const).map(k => <option key={k} value={k}>{mapLabel(k)}</option>)}
                </select>
              </Field>
              <p className="a-help">{selPath.points.length} punktar. Dragðu punkt til að færa hann, tvísmelltu á punkt til að fjarlægja hann.</p>
              <div className="a-inline">
                <Button small tone="ghost" onClick={() => { const last = selPath.points[selPath.points.length - 1]; updatePath(selPath.id, { points: [...selPath.points, [clampX(last[0] + 40), clampY(last[1] + 20)]] }); }}>Bæta við punkti</Button>
                <Button tone="danger" small onClick={deleteSelected}>Eyða</Button>
              </div>
            </div>
          ) : (
            <div className="a-side">
              <p className="a-side__title"><span>Ritillinn</span></p>
              <p className="a-help">Smelltu á stað, svæði eða línu til að breyta. Dragðu til að færa. Veldu <b>Pensil</b> til að mála land, sjó, gras, skóg, kletta og sand beint á kortið.</p>
              <p className="a-help"><Kbd>Ctrl</Kbd>+<Kbd>Z</Kbd> afturkallar, <Kbd>Ctrl</Kbd>+<Kbd>S</Kbd> vistar, <Kbd>Del</Kbd> eyðir því sem er valið, örvatakkar færa það.</p>
            </div>
          )}

          <div className="a-side">
            <p className="a-side__title"><span>Staðir ({doc.locations.length})</span></p>
            <div className="a-list">
              {doc.locations.map(loc => {
                const ph = loc.photoId ? photoById.get(loc.photoId) : null;
                return (
                  <button key={loc.id} type="button" className={`a-list__item${selPin?.id === loc.id ? ' is-active' : ''}`} onClick={() => { setTool('select'); setSelected(s => s?.kind === 'pin' && s.id === loc.id ? null : { kind: 'pin', id: loc.id }); }}>
                    <span>{loc.id}. {loc.label || 'án heitis'}</span>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {ph ? <img className="a-list__thumb" src={ph.filename} alt="" /> : <span className="a-list__thumb a-list__thumb--empty" title="Engin mynd" />}
                  </button>
                );
              })}
            </div>
          </div>
          {(doc.zones.length > 0 || doc.paths.length > 0) && (
            <div className="a-side">
              <p className="a-side__title"><span>Svæði og línur ({doc.zones.length + doc.paths.length})</span></p>
              <div className="a-list">
                {doc.zones.map(z => (
                  <button key={z.id} type="button" className={`a-list__item${selZone?.id === z.id ? ' is-active' : ''}`} onClick={() => { setTool('select'); setSelected(s => s?.kind === 'zone' && s.id === z.id ? null : { kind: 'zone', id: z.id }); }}>
                    <span>{z.label || 'án heitis'}</span><span className="a-muted">{mapLabel(z.kind)}</span>
                  </button>
                ))}
                {doc.paths.map(p => (
                  <button key={p.id} type="button" className={`a-list__item${selPath?.id === p.id ? ' is-active' : ''}`} onClick={() => { setTool('select'); setSelected(s => s?.kind === 'path' && s.id === p.id ? null : { kind: 'path', id: p.id }); }}>
                    <span>{p.label || 'án heitis'}</span><span className="a-muted">{mapLabel(p.kind)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>

      {picker && selPin && (
        <PhotoPicker photos={photos} locations={doc.locations} currentId={selPin.photoId ?? null} pin={selPin} error={photosError} uploading={uploading}
          onPick={id => { linkPhoto(selPin.id, id); setPicker(false); }} onUpload={f => uploadForPin(selPin, f)} onClose={() => setPicker(false)} />
      )}
    </div>
  );
}

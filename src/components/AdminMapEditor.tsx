'use client';

import { mapLabel } from '@/lib/icelandic';

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import type { MapConfig, MapLocation, MapZone, MapPath } from '@/lib/map-types';
import type { GalleryPhoto } from '@/lib/gallery';

/** A gallery photo as the admin API returns it: with the pin it is linked to. */
export type AdminPhoto = GalleryPhoto & { locationId: number | null };

const mono  = "'JetBrains Mono', monospace";
const green = '#c8960c';

const TYPE_COLOR: Record<string, string> = {
  surface:     '#c8960c',
  underground: '#c084fc',
  island:      '#f97316',
  aerial:      '#38bdf8',
};

const ZONE_STYLE: Record<string, { stroke: string; fill: string; land: string }> = {
  purple: { stroke: 'rgba(185,115,255,0.6)', fill: 'rgba(45,18,72,0.22)',  land: '#1a1228' },
  blue:   { stroke: 'rgba(56,189,248,0.6)',  fill: 'rgba(8,38,78,0.28)',   land: '#0a1828' },
  orange: { stroke: 'rgba(249,115,22,0.6)',  fill: 'rgba(80,30,0,0.22)',   land: '#180c04' },
  green:  { stroke: 'rgba(0,255,65,0.5)',    fill: 'rgba(5,35,10,0.28)',   land: '#0a1a0a' },
};

const PATH_COLORS: Record<string, { outer: string; mid: string; inner: string; label: string }> = {
  blue:   { outer: '#061828', mid: '#0d2e52', inner: 'rgba(22,90,165,0.7)',   label: 'rgba(56,189,248,0.7)'  },
  orange: { outer: '#180808', mid: '#3d1508', inner: 'rgba(200,80,20,0.6)',   label: 'rgba(249,115,22,0.7)'  },
  green:  { outer: '#061208', mid: '#0a2210', inner: 'rgba(20,120,40,0.6)',   label: 'rgba(0,200,80,0.7)'    },
  purple: { outer: '#10081a', mid: '#1e0c38', inner: 'rgba(100,40,180,0.6)', label: 'rgba(185,115,255,0.7)' },
};

const VW = 1000;
const VH = 650;

type DragMode =
  | { kind: 'pin';         id: number; ox: number; oy: number }
  | { kind: 'zone-center'; id: string; ox: number; oy: number }
  | { kind: 'zone-rx';     id: string; startRx: number; startMx: number }
  | { kind: 'zone-ry';     id: string; startRy: number; startMy: number }
  | { kind: 'path-point';  id: string; pointIdx: number; ox: number; oy: number }
  | null;

type Selection =
  | { kind: 'pin';  id: number }
  | { kind: 'zone'; id: string }
  | { kind: 'path'; id: string }
  | null;

export default function AdminMapEditor({ initialConfig }: { initialConfig: MapConfig }) {
  const [locations, setLocations] = useState<MapLocation[]>(initialConfig.locations);
  const [zones,     setZones]     = useState<MapZone[]>(initialConfig.zones);
  const [paths,     setPaths]     = useState<MapPath[]>(initialConfig.paths ?? []);
  const [selected,  setSelected]  = useState<Selection>(null);
  const [saving,    setSaving]    = useState(false);
  const [msg,       setMsg]       = useState('');
  const [placing,   setPlacing]   = useState<'pin' | 'zone' | 'land' | 'lake' | 'mountain' | null>(null);
  const [drawing,   setDrawing]   = useState<'river' | 'road' | 'border' | null>(null);
  const [drawPoints, setDrawPoints] = useState<[number, number][]>([]);
  const [drawColor,  setDrawColor]  = useState<MapPath['colorKey']>('blue');

  // Gallery photos, for linking a photo to a pin
  const [photos,      setPhotos]      = useState<AdminPhoto[]>([]);
  const [photosError, setPhotosError] = useState('');
  const [pickerOpen,  setPickerOpen]  = useState(false);
  const [uploading,   setUploading]   = useState(false);

  // What the server last confirmed, to know whether there are unsaved changes
  const [savedJson, setSavedJson] = useState(() => serialize(initialConfig));
  const dirty = useMemo(() => serialize({ locations, zones, paths }) !== savedJson, [locations, zones, paths, savedJson]);

  const svgRef  = useRef<SVGSVGElement>(null);
  const dragRef = useRef<DragMode>(null);

  const loadPhotos = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/gallery', { cache: 'no-store' });
      if (!res.ok) throw new Error();
      setPhotos(await res.json() as AdminPhoto[]);
      setPhotosError('');
    } catch {
      setPhotosError('Ekki tókst að sækja myndasafnið.');
    }
  }, []);
  useEffect(() => { loadPhotos(); }, [loadPhotos]);

  // Warn before leaving the page with unsaved changes
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  // ─── SVG coord conversion ──────────────────────────────────────────────────

  const toSvg = useCallback((clientX: number, clientY: number): [number, number] => {
    const svg = svgRef.current;
    if (!svg) return [0, 0];
    const r = svg.getBoundingClientRect();
    return [
      Math.round((clientX - r.left) * (VW / r.width)),
      Math.round((clientY - r.top)  * (VH / r.height)),
    ];
  }, []);

  // ─── Drag ─────────────────────────────────────────────────────────────────

  const onPinDown = useCallback((e: React.PointerEvent, id: number) => {
    if (placing || drawing) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    const [mx, my] = toSvg(e.clientX, e.clientY);
    const loc = locations.find(l => l.id === id)!;
    dragRef.current = { kind: 'pin', id, ox: mx - loc.x, oy: my - loc.y };
    setSelected({ kind: 'pin', id });
  }, [placing, drawing, toSvg, locations]);

  const onZoneDown = useCallback((e: React.PointerEvent, id: string) => {
    if (drawing) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    const [mx, my] = toSvg(e.clientX, e.clientY);
    dragRef.current = { kind: 'zone-center', id, ox: mx, oy: my };
    setSelected({ kind: 'zone', id });
  }, [drawing, toSvg]);

  const onHandleDown = useCallback((e: React.PointerEvent, id: string, axis: 'rx' | 'ry') => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    const [mx, my] = toSvg(e.clientX, e.clientY);
    const z = zones.find(z => z.id === id)!;
    dragRef.current = axis === 'rx'
      ? { kind: 'zone-rx', id, startRx: z.rx, startMx: mx }
      : { kind: 'zone-ry', id, startRy: z.ry, startMy: my };
    setSelected({ kind: 'zone', id });
  }, [toSvg, zones]);

  const onPathPointDown = useCallback((e: React.PointerEvent, id: string, pointIdx: number) => {
    if (drawing) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    const [mx, my] = toSvg(e.clientX, e.clientY);
    const p = paths.find(p => p.id === id)!;
    const [px, py] = p.points[pointIdx];
    dragRef.current = { kind: 'path-point', id, pointIdx, ox: mx - px, oy: my - py };
    setSelected({ kind: 'path', id });
  }, [drawing, toSvg, paths]);

  const onMove = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    const d = dragRef.current;
    if (!d) return;
    const [mx, my] = toSvg(e.clientX, e.clientY);

    if (d.kind === 'pin') {
      const nx = Math.max(0, Math.min(VW, mx - d.ox));
      const ny = Math.max(0, Math.min(VH, my - d.oy));
      setLocations(prev => prev.map(l => l.id === d.id ? { ...l, x: nx, y: ny } : l));
    } else if (d.kind === 'zone-center') {
      const dx = mx - d.ox;
      const dy = my - d.oy;
      dragRef.current = { ...d, ox: mx, oy: my };
      setZones(prev => prev.map(z => z.id === d.id
        ? { ...z, cx: Math.max(0, Math.min(VW, z.cx + dx)), cy: Math.max(0, Math.min(VH, z.cy + dy)) }
        : z));
    } else if (d.kind === 'zone-rx') {
      setZones(prev => prev.map(z => z.id === d.id
        ? { ...z, rx: Math.max(10, Math.round(d.startRx + (mx - d.startMx))) }
        : z));
    } else if (d.kind === 'zone-ry') {
      setZones(prev => prev.map(z => z.id === d.id
        ? { ...z, ry: Math.max(10, Math.round(d.startRy + (my - d.startMy))) }
        : z));
    } else if (d.kind === 'path-point') {
      const nx = Math.max(0, Math.min(VW, mx - d.ox));
      const ny = Math.max(0, Math.min(VH, my - d.oy));
      setPaths(prev => prev.map(p => p.id === d.id
        ? { ...p, points: p.points.map((pt, i) => i === d.pointIdx ? [nx, ny] : pt) as [number, number][] }
        : p));
    }
  }, [toSvg]);

  const onUp = useCallback(() => { dragRef.current = null; }, []);

  // ─── Place / Draw (click on map) ──────────────────────────────────────────

  const onSvgClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const [mx, my] = toSvg(e.clientX, e.clientY);

    // Drawing mode: add a point
    if (drawing) {
      if (e.detail >= 2) {
        // Double-click: finish drawing
        if (drawPoints.length >= 2) {
          const uid = `path-${Date.now()}`;
          const kindLabel = drawing === 'river' ? 'Á' : drawing === 'road' ? 'Vegur' : 'Mörk';
          const newPath: MapPath = {
            id: uid, label: kindLabel, kind: drawing,
            points: drawPoints, colorKey: drawColor,
          };
          setPaths(prev => [...prev, newPath]);
          setSelected({ kind: 'path', id: uid });
        }
        setDrawing(null);
        setDrawPoints([]);
        return;
      }
      setDrawPoints(prev => [...prev, [mx, my]]);
      return;
    }

    if (!placing) return;

    if (placing === 'pin') {
      const newId = Math.max(0, ...locations.map(l => l.id)) + 1;
      const pin: MapLocation = { id: newId, label: 'Nýr staður', sublabel: '', x: mx, y: my, type: 'surface', photoId: null };
      setLocations(prev => [...prev, pin]);
      setSelected({ kind: 'pin', id: newId });
    } else {
      const uid = `${placing}-${Date.now()}`;
      const defaultLabels: Record<string, string> = {
        zone: 'Nýtt svæði', land: 'Ný landspilda', lake: 'Nýtt vatn', mountain: 'Nýtt fjall',
      };
      const defaultColors: Record<string, MapZone['colorKey']> = {
        zone: 'purple', land: 'green', lake: 'blue', mountain: 'orange',
      };
      const defaultRx: Record<string, number> = {
        zone: 80, land: 80, lake: 30, mountain: 40,
      };
      const defaultRy: Record<string, number> = {
        zone: 60, land: 60, lake: 60, mountain: 50,
      };
      const z: MapZone = {
        id: uid, label: defaultLabels[placing],
        kind: placing as MapZone['kind'],
        cx: mx, cy: my,
        rx: defaultRx[placing], ry: defaultRy[placing],
        colorKey: defaultColors[placing],
      };
      setZones(prev => [...prev, z]);
      setSelected({ kind: 'zone', id: uid });
    }
    setPlacing(null);
  }, [placing, drawing, drawPoints, drawColor, toSvg, locations]);

  // Cancel drawing with Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (drawing) { setDrawing(null); setDrawPoints([]); }
        if (placing)  setPlacing(null);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [drawing, placing]);

  // ─── Edits (fields write straight into the map; text is kept exactly as typed) ──

  function updatePin(id: number, patch: Partial<MapLocation>) {
    setLocations(prev => prev.map(l => l.id === id ? { ...l, ...patch } : l));
  }

  function updateZone(id: string, patch: Partial<MapZone>) {
    setZones(prev => prev.map(z => z.id === id ? { ...z, ...patch } : z));
  }

  function updatePath(id: string, patch: Partial<MapPath>) {
    setPaths(prev => prev.map(p => p.id === id ? { ...p, ...patch } : p));
  }

  /** A photo belongs to one pin at a time: linking it here takes it off any other pin. */
  function linkPhoto(pinId: number, photoId: string | null): MapLocation[] {
    const next = locations.map(l => {
      if (l.id === pinId) return { ...l, photoId };
      if (photoId !== null && l.photoId === photoId) return { ...l, photoId: null };
      return l;
    });
    setLocations(next);
    return next;
  }

  /** Upload a new photo straight from the pin panel, link it, and save the map. */
  async function uploadForPin(pin: MapLocation, file: File) {
    setUploading(true); setMsg('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('title', pin.label);
      fd.append('sublabel', pin.sublabel);
      const res = await fetch('/api/admin/gallery/upload', { method: 'POST', body: fd });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Upphleðsla mistókst' })) as { error?: string };
        setMsg(`✗ ${err.error ?? 'Upphleðsla mistókst'}`);
        return;
      }
      const photo = await res.json() as AdminPhoto;
      setPhotos(prev => [...prev, photo]);
      const nextLocations = linkPhoto(pin.id, photo.id);
      setPickerOpen(false);
      const ok = await persist({ locations: nextLocations, zones, paths });
      setMsg(ok ? '✓ Mynd hlaðið upp, tengd við pinnann og kortið vistað' : '✗ Myndin er komin í safnið en kortið vistaðist ekki. Reyndu að vista aftur.');
    } catch {
      setMsg('✗ Villa í nettengingu');
    } finally {
      setUploading(false);
    }
  }

  function deleteSelected() {
    if (!selected) return;
    if (selected.kind === 'pin')  setLocations(prev => prev.filter(l => l.id !== selected.id));
    if (selected.kind === 'zone') setZones(prev => prev.filter(z => z.id !== selected.id));
    if (selected.kind === 'path') setPaths(prev => prev.filter(p => p.id !== selected.id));
    setSelected(null);
  }

  function deletePathPoint(pathId: string, idx: number) {
    setPaths(prev => prev.map(p =>
      p.id === pathId
        ? { ...p, points: p.points.filter((_, i) => i !== idx) as [number, number][] }
        : p
    ));
  }

  // ─── Save / Reset ─────────────────────────────────────────────────────────

  /** Send a config to the server. On success the editor shows exactly what was stored. */
  async function persist(cfg: MapConfig): Promise<boolean> {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/map', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cfg),
      });
      const data = await res.json().catch(() => null) as { ok?: boolean; config?: MapConfig; error?: string } | null;
      if (!res.ok) { setMsg(`✗ ${data?.error ?? 'Ekki tókst að vista'}`); return false; }
      const stored = data?.config ?? cfg;
      setLocations(stored.locations);
      setZones(stored.zones);
      setPaths(stored.paths ?? []);
      setSavedJson(serialize(stored));
      // The gallery's "linked pin" info depends on the map, so refresh it
      loadPhotos();
      return true;
    } catch {
      setMsg('✗ Villa í nettengingu');
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function save() {
    setMsg('');
    const ok = await persist({ locations, zones, paths });
    if (ok) setMsg('✓ Kort vistað. Breytingarnar eru komnar á vefinn.');
  }

  async function reset() {
    if (!confirm('Henda óvistuðum breytingum og fara til baka í síðustu vistuðu útgáfu kortsins?')) return;
    setMsg('');
    const ok = await persist({ locations: initialConfig.locations, zones: initialConfig.zones, paths: initialConfig.paths ?? [] });
    if (ok) { setSelected(null); setMsg('✓ Síðasta vistaða útgáfa endurheimt'); }
  }

  // ─── Derived ──────────────────────────────────────────────────────────────

  const selPin  = selected?.kind === 'pin'  ? locations.find(l => l.id === selected.id) : null;
  const selZone = selected?.kind === 'zone' ? zones.find(z => z.id === selected.id)     : null;
  const selPath = selected?.kind === 'path' ? paths.find(p => p.id === selected.id)     : null;
  const selPhoto = selPin?.photoId ? photos.find(p => p.id === selPin.photoId) ?? null : null;
  const photoById = useMemo(() => new Map(photos.map(p => [p.id, p])), [photos]);

  const landZones     = zones.filter(z => z.kind === 'land');
  const namedZones    = zones.filter(z => z.kind === 'zone');
  const lakeZones     = zones.filter(z => z.kind === 'lake');
  const mountainZones = zones.filter(z => z.kind === 'mountain');

  const inputStyle: React.CSSProperties = {
    width: '100%', background: '#080808', border: '1px solid #2a2a2a',
    color: '#f0f0f0', fontFamily: mono, fontSize: '0.65rem',
    padding: '0.3rem 0.5rem', outline: 'none',
  };
  const labelStyle: React.CSSProperties = {
    fontFamily: mono, fontSize: '0.5rem', color: '#555',
    letterSpacing: '0.1em', display: 'block', marginBottom: '0.25rem',
  };
  const fieldStyle: React.CSSProperties = { marginBottom: '0.6rem' };

  const isDrawingActive = drawing !== null;
  const cursor = (placing || isDrawingActive) ? 'crosshair' : 'default';

  function PlaceBtn({ mode, label }: { mode: 'pin' | 'zone' | 'land' | 'lake' | 'mountain'; label: string }) {
    const active = placing === mode;
    return (
      <button
        onClick={() => { setPlacing(active ? null : mode); setSelected(null); setDrawing(null); setDrawPoints([]); }}
        style={{
          fontFamily: mono, fontSize: '0.55rem', letterSpacing: '0.12em',
          textTransform: 'uppercase', padding: '0.35rem 0.7rem', cursor: 'pointer',
          border: `1px solid ${active ? green + '88' : '#2a2a2a'}`,
          background: active ? green + '18' : 'transparent',
          color: active ? green : '#555',
        }}
      >
        {active ? `SMELLTU Á KORTIÐ…` : label}
      </button>
    );
  }

  function DrawBtn({ mode, label }: { mode: MapPath['kind']; label: string }) {
    const active = drawing === mode;
    return (
      <button
        onClick={() => {
          if (active) { setDrawing(null); setDrawPoints([]); }
          else { setDrawing(mode); setDrawPoints([]); setPlacing(null); setSelected(null); }
        }}
        style={{
          fontFamily: mono, fontSize: '0.55rem', letterSpacing: '0.12em',
          textTransform: 'uppercase', padding: '0.35rem 0.7rem', cursor: 'pointer',
          border: `1px solid ${active ? 'rgba(56,189,248,0.6)' : '#2a2a2a'}`,
          background: active ? 'rgba(56,189,248,0.1)' : 'transparent',
          color: active ? 'rgba(56,189,248,0.9)' : '#555',
        }}
      >
        {active ? `TEIKNA… (tvísmelltu til að ljúka)` : label}
      </button>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

      {/* Toolbar row 1 */}
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <PlaceBtn mode="pin"      label="+ PINNI" />
        <PlaceBtn mode="zone"     label="+ SVÆÐI" />
        <PlaceBtn mode="land"     label="+ LAND" />
        <PlaceBtn mode="lake"     label="+ VATN" />
        <PlaceBtn mode="mountain" label="+ FJALL" />
        <div style={{ width: '1px', height: '20px', background: '#2a2a2a', margin: '0 0.25rem' }}/>
        <DrawBtn mode="river"  label="✏ TEIKNA Á" />
        <DrawBtn mode="road"   label="✏ TEIKNA VEG" />
        <DrawBtn mode="border" label="✏ TEIKNA MÖRK" />
        {isDrawingActive && (
          <select value={drawColor} onChange={e => setDrawColor(e.target.value as MapPath['colorKey'])}
            style={{ ...inputStyle, width: 'auto', padding: '0.3rem 0.5rem' }}>
            {(['blue','orange','green','purple'] as const).map(c => (
              <option key={c} value={c}>{mapLabel(c)}</option>
            ))}
          </select>
        )}
        <div style={{ flex: 1 }} />
        {dirty && !saving && (
          <span style={{ fontFamily: mono, fontSize: '0.5rem', letterSpacing: '0.1em', color: '#f0a500' }}>● ÓVISTAÐAR BREYTINGAR</span>
        )}
        <button onClick={save} disabled={saving || uploading}
          style={{ fontFamily: mono, fontSize: '0.55rem', letterSpacing: '0.15em', textTransform: 'uppercase', padding: '0.35rem 0.7rem', cursor: saving ? 'not-allowed' : 'pointer', border: `1px solid ${dirty ? green : green + '44'}`, background: dirty ? green + '30' : green + '18', color: green, fontWeight: dirty ? 700 : 400 }}>
          {saving ? 'VISTA…' : 'VISTA KORT'}
        </button>
        <button onClick={reset} disabled={saving || uploading}
          style={{ fontFamily: mono, fontSize: '0.55rem', letterSpacing: '0.15em', textTransform: 'uppercase', padding: '0.35rem 0.7rem', cursor: 'pointer', border: '1px solid #2a2a2a', background: 'transparent', color: '#444' }}>
          HÆTTA VIÐ
        </button>
      </div>
      {msg && (
        <div style={{ fontFamily: mono, fontSize: '0.55rem', color: msg.startsWith('✓') ? green : '#ff4466', padding: '0.4rem 0.6rem', border: `1px solid ${msg.startsWith('✓') ? green + '33' : '#ff446633'}`, background: msg.startsWith('✓') ? green + '08' : '#ff446608' }}>
          {msg}
        </div>
      )}

      {/* Drawing status hint */}
      {isDrawingActive && (
        <div style={{ fontFamily: mono, fontSize: '0.5rem', color: 'rgba(56,189,248,0.7)', letterSpacing: '0.1em', padding: '0.4rem 0.6rem', border: '1px solid rgba(56,189,248,0.2)', background: 'rgba(56,189,248,0.05)' }}>
          TEIKNA: {mapLabel(drawing ?? '')} · Smelltu til að bæta við punktum ({drawPoints.length}) · Tvísmelltu til að ljúka · Esc til að hætta við
        </div>
      )}

      <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>

        {/* SVG map */}
        <div style={{ flex: 1, minWidth: 0, border: '1px solid #1a1a1a', background: '#040d18', cursor }}>
          <svg
            ref={svgRef}
            viewBox={`0 0 ${VW} ${VH}`}
            style={{ width: '100%', display: 'block', userSelect: 'none', touchAction: 'none' }}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onClick={onSvgClick}
          >
            <defs>
              <radialGradient id="landGradEdit" cx="50%" cy="45%" r="55%">
                <stop offset="0%" stopColor="#0f1e0f"/>
                <stop offset="100%" stopColor="#090f09"/>
              </radialGradient>
            </defs>

            {/* Background + grid */}
            <rect width={VW} height={VH} fill="#040d18"/>
            {[100,200,300,400,500,600,700,800,900].map(x => (
              <line key={`gx${x}`} x1={x} y1={0} x2={x} y2={VH} stroke="rgba(0,255,65,0.035)" strokeWidth={0.5}/>
            ))}
            {[100,200,300,400,500,600].map(y => (
              <line key={`gy${y}`} x1={0} y1={y} x2={VW} y2={y} stroke="rgba(0,255,65,0.035)" strokeWidth={0.5}/>
            ))}

            {/* Land patches */}
            {landZones.map(z => {
              const s = ZONE_STYLE[z.colorKey] ?? ZONE_STYLE.green;
              const isSel = selected?.kind === 'zone' && selected.id === z.id;
              return (
                <g key={z.id}>
                  <ellipse cx={z.cx} cy={z.cy} rx={z.rx} ry={z.ry}
                    fill={s.land} stroke={isSel ? s.stroke : 'rgba(0,255,65,0.12)'} strokeWidth={isSel ? 1.5 : 0.8}
                    style={{ cursor: drawing ? 'crosshair' : 'move' }}
                    onPointerDown={e => onZoneDown(e, z.id)}
                  />
                  {isSel && <ResizeHandles z={z} onHandleDown={onHandleDown} color={s.stroke}/>}
                </g>
              );
            })}

            {/* Lakes */}
            {lakeZones.map(z => {
              const isSel = selected?.kind === 'zone' && selected.id === z.id;
              const strokeColor = isSel ? 'rgba(56,189,248,0.9)' : 'rgba(56,189,248,0.4)';
              return (
                <g key={z.id}>
                  <ellipse cx={z.cx} cy={z.cy} rx={z.rx} ry={z.ry}
                    fill="#061828" stroke={strokeColor} strokeWidth={isSel ? 1.5 : 0.8}
                    style={{ cursor: drawing ? 'crosshair' : 'move' }}
                    onPointerDown={e => onZoneDown(e, z.id)}
                  />
                  <ellipse cx={z.cx} cy={z.cy} rx={Math.max(1, z.rx - 3)} ry={Math.max(1, z.ry - 3)}
                    fill="#0d2e52" stroke="none" pointerEvents="none"/>
                  <ellipse cx={z.cx} cy={z.cy} rx={Math.max(1, z.rx - 6)} ry={Math.max(1, z.ry - 6)}
                    fill="rgba(22,90,165,0.5)" stroke="none" pointerEvents="none"/>
                  <text x={z.cx} y={z.cy + z.ry + 12}
                    fill="rgba(56,189,248,0.5)" fontFamily={mono} fontSize={7} letterSpacing={1.5} textAnchor="middle" pointerEvents="none">
                    {z.label}
                  </text>
                  {isSel && <ResizeHandles z={z} onHandleDown={onHandleDown} color="rgba(56,189,248,0.9)"/>}
                </g>
              );
            })}

            {/* Main hardcoded landmass */}
            <path
              d="M 435 60 C 528 45, 674 78, 752 142 C 810 194, 822 262, 818 330 C 814 402, 786 460, 746 502 C 700 550, 635 582, 555 596 C 476 610, 396 604, 320 582 C 232 558, 155 512, 110 458 C 62 400, 50 336, 56 278 C 62 218, 88 166, 132 136 C 182 100, 298 70, 435 60 Z"
              fill="url(#landGradEdit)" stroke="rgba(0,255,65,0.15)" strokeWidth={1.2}
            />

            {/* Named zones */}
            {namedZones.map(z => {
              const s = ZONE_STYLE[z.colorKey] ?? ZONE_STYLE.purple;
              const isSel = selected?.kind === 'zone' && selected.id === z.id;
              return (
                <g key={z.id}>
                  <ellipse cx={z.cx} cy={z.cy} rx={z.rx} ry={z.ry}
                    fill={s.fill}
                    stroke={isSel ? s.stroke.replace('0.6', '1') : s.stroke}
                    strokeWidth={isSel ? 2 : 1.2}
                    strokeDasharray="5 4"
                    style={{ cursor: drawing ? 'crosshair' : 'move' }}
                    onPointerDown={e => onZoneDown(e, z.id)}
                  />
                  <text x={z.cx} y={z.cy + z.ry + 12}
                    fill={s.stroke} fontFamily={mono} fontSize={7} letterSpacing={1.5} textAnchor="middle" pointerEvents="none">
                    {z.label}
                  </text>
                  {isSel && <ResizeHandles z={z} onHandleDown={onHandleDown} color={s.stroke}/>}
                </g>
              );
            })}

            {/* Mountains */}
            {mountainZones.map(z => {
              const isSel = selected?.kind === 'zone' && selected.id === z.id;
              const pts = `${z.cx},${z.cy - z.ry} ${z.cx - z.rx},${z.cy + z.ry} ${z.cx + z.rx},${z.cy + z.ry}`;
              const snowLine = z.ry * 0.35;
              const snowPts  = `${z.cx},${z.cy - z.ry} ${z.cx - z.rx * 0.35},${z.cy - z.ry + snowLine} ${z.cx + z.rx * 0.35},${z.cy - z.ry + snowLine}`;
              return (
                <g key={z.id} onPointerDown={e => onZoneDown(e, z.id)} style={{ cursor: drawing ? 'crosshair' : 'move' }}>
                  <polygon points={pts}
                    fill={isSel ? 'rgba(100,75,50,0.5)' : 'rgba(80,60,40,0.35)'}
                    stroke={isSel ? 'rgba(200,160,100,0.8)' : 'rgba(150,120,80,0.4)'}
                    strokeWidth={isSel ? 1.5 : 0.8}
                  />
                  <polygon points={snowPts} fill="rgba(220,220,220,0.3)" stroke="none" pointerEvents="none"/>
                  <text x={z.cx} y={z.cy + z.ry + 12}
                    fill="rgba(150,120,80,0.6)" fontFamily={mono} fontSize={7} letterSpacing={1.5} textAnchor="middle" pointerEvents="none">
                    {z.label}
                  </text>
                  {isSel && <ResizeHandles z={z} onHandleDown={onHandleDown} color="rgba(200,160,100,0.8)"/>}
                </g>
              );
            })}

            {/* Freeform paths */}
            {paths.map(p => {
              if (p.points.length < 2) return null;
              const pts = p.points.map(([x, y]) => `${x},${y}`).join(' ');
              const c = PATH_COLORS[p.colorKey] ?? PATH_COLORS.blue;
              const isSel = selected?.kind === 'path' && selected.id === p.id;
              return (
                <g key={p.id}>
                  <polyline points={pts} fill="none" stroke={c.outer} strokeWidth={11} strokeLinecap="round" strokeLinejoin="round"/>
                  <polyline points={pts} fill="none" stroke={c.mid}   strokeWidth={6}  strokeLinecap="round" strokeLinejoin="round"/>
                  <polyline points={pts} fill="none" stroke={c.inner} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"/>
                  {/* Clickable hit area */}
                  <polyline points={pts} fill="none" stroke="transparent" strokeWidth={16} strokeLinecap="round" strokeLinejoin="round"
                    style={{ cursor: drawing ? 'crosshair' : 'pointer' }}
                    onClick={e => { if (!drawing) { e.stopPropagation(); setSelected({ kind: 'path', id: p.id }); } }}
                  />
                  {/* Point handles when selected */}
                  {isSel && p.points.map(([x, y], i) => (
                    <circle key={i} cx={x} cy={y} r={6} fill={c.inner} stroke="#fff" strokeWidth={1}
                      style={{ cursor: 'grab' }}
                      onPointerDown={e => onPathPointDown(e, p.id, i)}
                      onDoubleClick={e => { e.stopPropagation(); deletePathPoint(p.id, i); }}
                    />
                  ))}
                </g>
              );
            })}

            {/* In-progress drawing preview */}
            {isDrawingActive && drawPoints.length > 0 && (
              <g>
                {drawPoints.length > 1 && (
                  <polyline
                    points={drawPoints.map(([x, y]) => `${x},${y}`).join(' ')}
                    fill="none" stroke="rgba(56,189,248,0.5)" strokeWidth={2.5}
                    strokeLinecap="round" strokeLinejoin="round" strokeDasharray="6 4"
                  />
                )}
                {drawPoints.map(([x, y], i) => (
                  <circle key={i} cx={x} cy={y} r={4} fill="rgba(56,189,248,0.8)" stroke="none"/>
                ))}
              </g>
            )}

            {/* Pins */}
            {locations.map((loc, i) => {
              const color = TYPE_COLOR[loc.type];
              const isSel = selected?.kind === 'pin' && selected.id === loc.id;
              return (
                <g key={loc.id} onPointerDown={e => onPinDown(e, loc.id)}
                  style={{ cursor: (placing || drawing) ? 'crosshair' : 'grab' }}>
                  {isSel && <circle cx={loc.x} cy={loc.y} r={14} fill="none" stroke={color} strokeWidth={1.5} opacity={0.9}/>}
                  <circle cx={loc.x} cy={loc.y} r={10} fill="none" stroke={color} strokeWidth={0.8} opacity={0.2}>
                    <animate attributeName="r" values="8;18;8" dur="3s" repeatCount="indefinite" begin={`${i * 0.4}s`}/>
                    <animate attributeName="opacity" values="0.3;0;0.3" dur="3s" repeatCount="indefinite" begin={`${i * 0.4}s`}/>
                  </circle>
                  <rect x={loc.x - (isSel ? 5 : 3.5)} y={loc.y - (isSel ? 5 : 3.5)}
                    width={isSel ? 10 : 7} height={isSel ? 10 : 7} fill={color} opacity={isSel ? 1 : 0.85}/>
                  <text x={loc.x + 10} y={loc.y + 4} fill={color} fontFamily={mono} fontSize={8} letterSpacing={1} pointerEvents="none">{loc.label}</text>
                  <text x={loc.x + 10} y={loc.y + 14} fill="#444" fontFamily={mono} fontSize={6} pointerEvents="none">{loc.x},{loc.y}</text>
                </g>
              );
            })}

            {/* Border */}
            <rect x={8} y={8} width={984} height={634} fill="none" stroke="rgba(0,255,65,0.1)" strokeWidth={1}/>
          </svg>
        </div>

        {/* Side panel */}
        <div style={{ width: '260px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>

          {/* Selected item editor */}
          {selPin ? (
            <div style={{ background: '#0d0d0d', border: `1px solid ${TYPE_COLOR[selPin.type]}33`, padding: '1rem' }}>
              <p style={{ fontFamily: mono, fontSize: '0.5rem', letterSpacing: '0.2em', color: TYPE_COLOR[selPin.type], marginBottom: '0.75rem' }}>
                PINNI #{selPin.id}
              </p>
              <div style={fieldStyle}>
                <label style={labelStyle}>HEITI</label>
                <input value={selPin.label} onChange={e => updatePin(selPin.id, { label: e.target.value })} style={inputStyle} maxLength={100}/>
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>UNDIRTITILL</label>
                <input value={selPin.sublabel} onChange={e => updatePin(selPin.id, { sublabel: e.target.value })} style={inputStyle} maxLength={100}/>
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>TEGUND</label>
                <select value={selPin.type} onChange={e => updatePin(selPin.id, { type: e.target.value as MapLocation['type'] })}
                  style={{ ...inputStyle, width: '100%' }}>
                  {(['surface','underground','island','aerial'] as const).map(t => (
                    <option key={t} value={t}>{mapLabel(t)}</option>
                  ))}
                </select>
              </div>

              {/* Photo shown when the pin is clicked on the public map */}
              <div style={{ ...fieldStyle, borderTop: '1px solid #1a1a1a', paddingTop: '0.6rem' }}>
                <label style={labelStyle}>MYND Á KORTINU</label>
                {selPhoto ? (
                  <div>
                    <div style={{ position: 'relative', aspectRatio: '4/3', overflow: 'hidden', background: '#080808', border: '1px solid #2a2a2a' }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={selPhoto.filename} alt={selPhoto.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}/>
                      {!selPhoto.active && (
                        <span style={{ position: 'absolute', top: '0.3rem', right: '0.3rem', fontFamily: mono, fontSize: '0.45rem', letterSpacing: '0.15em', color: '#f0a500', background: '#000c', padding: '0.15rem 0.4rem' }}>FALIN Í ALBÚMI</span>
                      )}
                    </div>
                    <p style={{ fontFamily: mono, fontSize: '0.55rem', color: '#aaa', margin: '0.4rem 0 0.5rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selPhoto.title}</p>
                    {!selPhoto.active && (
                      <p style={{ fontFamily: mono, fontSize: '0.5rem', color: '#f0a500', marginBottom: '0.5rem', lineHeight: 1.5 }}>Myndin er falin í myndasafninu og birtist því ekki á kortinu fyrr en hún er sýnd aftur.</p>
                    )}
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                      <button onClick={() => setPickerOpen(true)} style={smallBtn(green)}>SKIPTA UM MYND</button>
                      <button onClick={() => linkPhoto(selPin.id, null)} style={smallBtn('#888')}>AFTENGJA</button>
                    </div>
                  </div>
                ) : selPin.photoId ? (
                  <div>
                    <p style={{ fontFamily: mono, fontSize: '0.5rem', color: '#f0a500', marginBottom: '0.5rem', lineHeight: 1.5 }}>
                      {photosError || 'Tengda myndin fannst ekki í myndasafninu.'}
                    </p>
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                      <button onClick={() => setPickerOpen(true)} style={smallBtn(green)}>VELJA MYND</button>
                      <button onClick={() => linkPhoto(selPin.id, null)} style={smallBtn('#888')}>AFTENGJA</button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p style={{ fontFamily: mono, fontSize: '0.5rem', color: '#444', marginBottom: '0.5rem', lineHeight: 1.5 }}>Engin mynd tengd þessum pinna.</p>
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                      <button onClick={() => setPickerOpen(true)} style={smallBtn(green)}>VELJA ÚR MYNDASAFNI</button>
                      <label style={{ ...smallBtn('#38bdf8'), cursor: uploading ? 'wait' : 'pointer' }}>
                        {uploading ? 'HLEÐ UPP…' : 'HLAÐA UPP NÝRRI'}
                        <input type="file" accept="image/*" disabled={uploading} style={{ display: 'none' }}
                          onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) uploadForPin(selPin, f); }}/>
                      </label>
                    </div>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={deleteSelected}
                  style={{ fontFamily: mono, fontSize: '0.5rem', letterSpacing: '0.1em', padding: '0.3rem 0.6rem', border: '1px solid #ff446633', background: 'transparent', color: '#ff4466', cursor: 'pointer' }}>
                  EYÐA PINNA
                </button>
              </div>
              <p style={{ fontFamily: mono, fontSize: '0.5rem', color: '#333', marginTop: '0.5rem' }}>
                X: {selPin.x} · Z: {selPin.y}
              </p>
            </div>
          ) : selZone ? (
            <div style={{ background: '#0d0d0d', border: '1px solid #2a2a2a', padding: '1rem' }}>
              <p style={{ fontFamily: mono, fontSize: '0.5rem', letterSpacing: '0.2em', color: '#888', marginBottom: '0.75rem' }}>
                {mapLabel(selZone.kind)} — {selZone.label}
              </p>
              <div style={fieldStyle}>
                <label style={labelStyle}>HEITI</label>
                <input value={selZone.label} onChange={e => updateZone(selZone.id, { label: e.target.value })} style={inputStyle} maxLength={100}/>
              </div>
              {selZone.kind !== 'lake' && (
                <div style={fieldStyle}>
                  <label style={labelStyle}>LITUR</label>
                  <select value={selZone.colorKey} onChange={e => updateZone(selZone.id, { colorKey: e.target.value as MapZone['colorKey'] })}
                    style={{ ...inputStyle, width: '100%' }}>
                    {(['purple','blue','orange','green'] as const).map(c => (
                      <option key={c} value={c}>{mapLabel(c)}</option>
                    ))}
                  </select>
                </div>
              )}
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={deleteSelected}
                  style={{ fontFamily: mono, fontSize: '0.5rem', letterSpacing: '0.1em', padding: '0.3rem 0.6rem', border: '1px solid #ff446633', background: 'transparent', color: '#ff4466', cursor: 'pointer' }}>
                  EYÐA
                </button>
              </div>
              <p style={{ fontFamily: mono, fontSize: '0.55rem', color: '#444', marginTop: '0.6rem', lineHeight: 1.7 }}>
                CX {selZone.cx} · CY {selZone.cy}<br/>
                RX {selZone.rx} · RY {selZone.ry}<br/>
                <span style={{ color: '#333' }}>Dragðu til að færa · notaðu handföng til að breyta stærð</span>
              </p>
            </div>
          ) : selPath ? (
            <div style={{ background: '#0d0d0d', border: '1px solid #2a2a2a', padding: '1rem' }}>
              <p style={{ fontFamily: mono, fontSize: '0.5rem', letterSpacing: '0.2em', color: '#888', marginBottom: '0.75rem' }}>
                {mapLabel(selPath.kind)} — {selPath.label}
              </p>
              <div style={fieldStyle}>
                <label style={labelStyle}>HEITI</label>
                <input value={selPath.label} onChange={e => updatePath(selPath.id, { label: e.target.value })} style={inputStyle} maxLength={100}/>
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>TEGUND</label>
                <select value={selPath.kind} onChange={e => updatePath(selPath.id, { kind: e.target.value as MapPath['kind'] })}
                  style={{ ...inputStyle, width: '100%' }}>
                  {(['river','road','border'] as const).map(k => (
                    <option key={k} value={k}>{mapLabel(k)}</option>
                  ))}
                </select>
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>LITUR</label>
                <select value={selPath.colorKey} onChange={e => updatePath(selPath.id, { colorKey: e.target.value as MapPath['colorKey'] })}
                  style={{ ...inputStyle, width: '100%' }}>
                  {(['blue','orange','green','purple'] as const).map(c => (
                    <option key={c} value={c}>{mapLabel(c)}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <button onClick={deleteSelected}
                  style={{ fontFamily: mono, fontSize: '0.5rem', letterSpacing: '0.1em', padding: '0.3rem 0.6rem', border: '1px solid #ff446633', background: 'transparent', color: '#ff4466', cursor: 'pointer' }}>
                  EYÐA
                </button>
              </div>
              <p style={{ fontFamily: mono, fontSize: '0.5rem', color: '#333', lineHeight: 1.7 }}>
                {selPath.points.length} punktar · dragðu punkta til að færa þá<br/>
                <span style={{ color: '#2a2a2a' }}>tvísmelltu á punkt til að fjarlægja hann</span>
              </p>
            </div>
          ) : (
            <div style={{ background: '#0d0d0d', border: '1px solid #1a1a1a', padding: '1rem' }}>
              <p style={{ fontFamily: mono, fontSize: '0.55rem', color: '#333', lineHeight: 1.9, letterSpacing: '0.05em', whiteSpace: 'pre-line' }}>
                {placing
                  ? `Smelltu á kortið til að\nbæta við: ${mapLabel(placing ?? '')}.`
                  : drawing
                  ? `Smelltu til að bæta við punktum.\nTvísmelltu til að ljúka.\nEsc til að hætta við.`
                  : `Smelltu á pinna eða form\ntil að velja og breyta.\n\nDragðu til að færa.\nNotaðu handföng til að breyta stærð.\nSmelltu á línu til að velja hana.\n\nHver pinni getur haft mynd\nsem birtist þegar smellt er\ná hann á vefnum.\n\nMundu að vista kortið.`}
              </p>
            </div>
          )}

          {/* Zone/feature lists */}
          <ZoneList title="NAFNGREIND SVÆÐI"  zones={namedZones}    selected={selected} onSelect={id => setSelected(s => s?.id === id ? null : { kind: 'zone', id })} colors={ZONE_STYLE}/>
          <ZoneList title="LANDSPILDUR" zones={landZones}     selected={selected} onSelect={id => setSelected(s => s?.id === id ? null : { kind: 'zone', id })} colors={ZONE_STYLE}/>
          <ZoneList title="VÖTN"        zones={lakeZones}     selected={selected} onSelect={id => setSelected(s => s?.id === id ? null : { kind: 'zone', id })} colors={ZONE_STYLE}/>
          <ZoneList title="FJÖLL"    zones={mountainZones} selected={selected} onSelect={id => setSelected(s => s?.id === id ? null : { kind: 'zone', id })} colors={ZONE_STYLE}/>

          {/* Paths list */}
          {paths.length > 0 && (
            <div style={{ background: '#0d0d0d', border: '1px solid #1a1a1a', padding: '1rem' }}>
              <p style={{ fontFamily: mono, fontSize: '0.5rem', letterSpacing: '0.2em', color: '#555', marginBottom: '0.5rem' }}>
                LÍNUR ({paths.length})
              </p>
              {paths.map(p => {
                const c = PATH_COLORS[p.colorKey] ?? PATH_COLORS.blue;
                const isSel = selected?.id === p.id;
                return (
                  <button key={p.id} onClick={() => setSelected(s => s?.id === p.id ? null : { kind: 'path', id: p.id })}
                    style={{
                      display: 'block', width: '100%', textAlign: 'left',
                      fontFamily: mono, fontSize: '0.55rem', letterSpacing: '0.1em',
                      padding: '0.3rem 0.5rem', marginBottom: '0.25rem',
                      border: `1px solid ${isSel ? c.inner : '#2a2a2a'}`,
                      background: isSel ? 'rgba(56,189,248,0.08)' : 'transparent',
                      color: isSel ? '#f0f0f0' : '#555', cursor: 'pointer',
                    }}>
                    {mapLabel(p.kind)} · {p.label}
                  </button>
                );
              })}
            </div>
          )}

          {/* Pin list */}
          <div style={{ background: '#0d0d0d', border: '1px solid #1a1a1a', padding: '1rem', maxHeight: '260px', overflowY: 'auto' }}>
            <p style={{ fontFamily: mono, fontSize: '0.5rem', letterSpacing: '0.2em', color: '#555', marginBottom: '0.6rem' }}>
              PINNAR ({locations.length})
            </p>
            {locations.map(loc => {
              const color = TYPE_COLOR[loc.type];
              const isSel = selected?.kind === 'pin' && selected.id === loc.id;
              return (
                <button key={loc.id}
                  onClick={() => setSelected(s => s?.id === loc.id ? null : { kind: 'pin', id: loc.id })}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.4rem', width: '100%', textAlign: 'left',
                    fontFamily: mono, fontSize: '0.55rem', letterSpacing: '0.08em',
                    padding: '0.25rem 0.4rem', marginBottom: '0.2rem',
                    border: `1px solid ${isSel ? color + '66' : '#1a1a1a'}`,
                    background: isSel ? color + '10' : 'transparent',
                    color: isSel ? color : '#555', cursor: 'pointer',
                  }}>
                  <span style={{ width: '6px', height: '6px', background: color, flexShrink: 0 }}/>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{loc.label}</span>
                  {loc.photoId && photoById.get(loc.photoId) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photoById.get(loc.photoId)!.filename} alt="" title="Mynd tengd" style={{ width: '18px', height: '14px', objectFit: 'cover', flexShrink: 0, border: '1px solid #2a2a2a' }}/>
                  ) : (
                    <span title="Engin mynd" style={{ width: '18px', height: '14px', flexShrink: 0, border: '1px dashed #2a2a2a' }}/>
                  )}
                  <span style={{ color: '#333', fontSize: '0.45rem', flexShrink: 0 }}>{loc.x},{loc.y}</span>
                </button>
              );
            })}
          </div>

        </div>
      </div>

      {pickerOpen && selPin && (
        <PhotoPicker
          photos={photos}
          locations={locations}
          currentId={selPin.photoId ?? null}
          pin={selPin}
          error={photosError}
          uploading={uploading}
          onPick={id => { linkPhoto(selPin.id, id); setPickerOpen(false); }}
          onUpload={file => uploadForPin(selPin, file)}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  );
}

function serialize(cfg: MapConfig): string {
  return JSON.stringify({ locations: cfg.locations, zones: cfg.zones, paths: cfg.paths ?? [] });
}

function smallBtn(color: string): React.CSSProperties {
  return {
    fontFamily: mono, fontSize: '0.5rem', letterSpacing: '0.1em', padding: '0.3rem 0.6rem',
    border: `1px solid ${color}55`, background: color + '14', color, cursor: 'pointer',
    display: 'inline-block',
  };
}

// ─── Photo picker ──────────────────────────────────────────────────────────────

function PhotoPicker({ photos, locations, currentId, pin, error, uploading, onPick, onUpload, onClose }: {
  photos: AdminPhoto[];
  locations: MapLocation[];
  currentId: string | null;
  pin: MapLocation;
  error: string;
  uploading: boolean;
  onPick: (id: string) => void;
  onUpload: (file: File) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Which pin (in the editor's unsaved state) currently shows each photo
  const pinByPhoto = new Map<string, MapLocation>();
  for (const l of locations) if (l.photoId) pinByPhoto.set(l.photoId, l);

  const q = query.trim().toLocaleLowerCase('is-IS');
  const shown = [...photos]
    .sort((a, b) => a.order - b.order)
    .filter(p => !q || p.title.toLocaleLowerCase('is-IS').includes(q) || p.sublabel.toLocaleLowerCase('is-IS').includes(q));

  return (
    <div onClick={onClose} role="dialog" aria-modal="true" aria-label="Velja mynd fyrir pinna"
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div onClick={e => e.stopPropagation()}
        style={{ width: 'min(900px, 100%)', maxHeight: '90vh', display: 'flex', flexDirection: 'column', background: '#0d0d0d', border: '1px solid #2a2a2a' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', borderBottom: '1px solid #1a1a1a', flexWrap: 'wrap' }}>
          <p style={{ fontFamily: mono, fontSize: '0.55rem', letterSpacing: '0.2em', color: green }}>
            VELJA MYND FYRIR PINNA #{pin.id} · {pin.label || 'án heitis'}
          </p>
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Leita eftir titli…" autoFocus
            style={{ background: '#080808', border: '1px solid #2a2a2a', color: '#f0f0f0', fontFamily: mono, fontSize: '0.6rem', padding: '0.3rem 0.5rem', outline: 'none', flex: 1, minWidth: '10rem' }}/>
          <label style={{ ...smallBtn('#38bdf8'), cursor: uploading ? 'wait' : 'pointer' }}>
            {uploading ? 'HLEÐ UPP…' : '+ HLAÐA UPP NÝRRI MYND'}
            <input type="file" accept="image/*" disabled={uploading} style={{ display: 'none' }}
              onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) onUpload(f); }}/>
          </label>
          <button onClick={onClose} aria-label="Loka"
            style={{ fontFamily: mono, fontSize: '0.6rem', background: 'none', color: '#666', border: '1px solid #2a2a2a', padding: '0.25rem 0.5rem', cursor: 'pointer' }}>✕</button>
        </div>

        <div style={{ overflowY: 'auto', padding: '1rem' }}>
          {error && <p style={{ fontFamily: mono, fontSize: '0.6rem', color: '#ff4466', marginBottom: '0.75rem' }}>{error}</p>}
          {!error && photos.length === 0 && (
            <p style={{ fontFamily: mono, fontSize: '0.6rem', color: '#444' }}>Engar myndir í safninu enn. Hladdu upp mynd hér að ofan.</p>
          )}
          {photos.length > 0 && shown.length === 0 && (
            <p style={{ fontFamily: mono, fontSize: '0.6rem', color: '#444' }}>Engin mynd passar við leitina.</p>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '0.6rem' }}>
            {shown.map(p => {
              const isCurrent = p.id === currentId;
              const usedBy = pinByPhoto.get(p.id);
              const usedElsewhere = usedBy && usedBy.id !== pin.id ? usedBy : null;
              return (
                <button key={p.id} onClick={() => onPick(p.id)} title={p.title}
                  style={{
                    textAlign: 'left', padding: 0, cursor: 'pointer', background: '#111',
                    border: `1px solid ${isCurrent ? green : '#2a2a2a'}`, outline: isCurrent ? `1px solid ${green}` : 'none',
                    opacity: p.active ? 1 : 0.55,
                  }}>
                  <div style={{ position: 'relative', aspectRatio: '4/3', overflow: 'hidden', background: '#080808' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.filename} alt={p.title} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}/>
                    {isCurrent && (
                      <span style={{ position: 'absolute', top: '0.3rem', left: '0.3rem', fontFamily: mono, fontSize: '0.45rem', letterSpacing: '0.15em', color: green, background: '#000c', padding: '0.15rem 0.4rem' }}>VALIN</span>
                    )}
                    {!p.active && (
                      <span style={{ position: 'absolute', top: '0.3rem', right: '0.3rem', fontFamily: mono, fontSize: '0.45rem', letterSpacing: '0.15em', color: '#f0a500', background: '#000c', padding: '0.15rem 0.4rem' }}>FALIN</span>
                    )}
                  </div>
                  <div style={{ padding: '0.4rem 0.5rem' }}>
                    <p style={{ fontFamily: mono, fontSize: '0.55rem', color: '#ccc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</p>
                    <p style={{ fontFamily: mono, fontSize: '0.45rem', color: usedElsewhere ? '#f0a500' : '#444', marginTop: '0.15rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {usedElsewhere ? `Á pinna #${usedElsewhere.id} · ${usedElsewhere.label}` : (p.sublabel || '—')}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
          <p style={{ fontFamily: mono, fontSize: '0.5rem', color: '#333', marginTop: '1rem', lineHeight: 1.6 }}>
            Hver mynd getur aðeins verið á einum pinna. Sé mynd valin sem er þegar á öðrum pinna flyst hún hingað. Vistaðu kortið á eftir.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Resize handles ────────────────────────────────────────────────────────────

function ResizeHandles({ z, onHandleDown, color }: {
  z: MapZone;
  onHandleDown: (e: React.PointerEvent, id: string, axis: 'rx' | 'ry') => void;
  color: string;
}) {
  return (
    <>
      <circle cx={z.cx + z.rx} cy={z.cy} r={7} fill={color} stroke="#fff" strokeWidth={1} style={{ cursor: 'ew-resize' }} onPointerDown={e => onHandleDown(e, z.id, 'rx')}/>
      <circle cx={z.cx - z.rx} cy={z.cy} r={7} fill={color} stroke="#fff" strokeWidth={1} style={{ cursor: 'ew-resize' }} onPointerDown={e => onHandleDown(e, z.id, 'rx')}/>
      <circle cx={z.cx} cy={z.cy + z.ry} r={7} fill={color} stroke="#fff" strokeWidth={1} style={{ cursor: 'ns-resize' }} onPointerDown={e => onHandleDown(e, z.id, 'ry')}/>
      <circle cx={z.cx} cy={z.cy - z.ry} r={7} fill={color} stroke="#fff" strokeWidth={1} style={{ cursor: 'ns-resize' }} onPointerDown={e => onHandleDown(e, z.id, 'ry')}/>
    </>
  );
}

function ZoneList({ title, zones, selected, onSelect, colors }: {
  title: string;
  zones: MapZone[];
  selected: Selection;
  onSelect: (id: string) => void;
  colors: Record<string, { stroke: string }>;
}) {
  if (zones.length === 0) return null;
  return (
    <div style={{ background: '#0d0d0d', border: '1px solid #1a1a1a', padding: '1rem' }}>
      <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.5rem', letterSpacing: '0.2em', color: '#555', marginBottom: '0.5rem' }}>
        {title} ({zones.length})
      </p>
      {zones.map(z => {
        const c = colors[z.colorKey] ?? colors.green;
        const isSel = selected?.id === z.id;
        return (
          <button key={z.id} onClick={() => onSelect(z.id)}
            style={{
              display: 'block', width: '100%', textAlign: 'left',
              fontFamily: "'JetBrains Mono', monospace", fontSize: '0.55rem', letterSpacing: '0.1em',
              padding: '0.3rem 0.5rem', marginBottom: '0.25rem',
              border: `1px solid ${isSel ? c.stroke : '#2a2a2a'}`,
              background: isSel ? c.stroke.replace('0.6', '0.1') : 'transparent',
              color: isSel ? '#f0f0f0' : '#555', cursor: 'pointer',
            }}>
            {z.label}
          </button>
        );
      })}
    </div>
  );
}

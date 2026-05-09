'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import type { MapConfig, MapLocation, MapZone, MapPath } from '@/lib/map-types';

const mono  = "'JetBrains Mono', monospace";
const green = '#00ff41';

const TYPE_COLOR: Record<string, string> = {
  surface:     '#00ff41',
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

  // Pin edit fields
  const [editPinLabel,    setEditPinLabel]    = useState('');
  const [editPinSublabel, setEditPinSublabel] = useState('');
  const [editPinType,     setEditPinType]     = useState<MapLocation['type']>('surface');

  // Zone edit fields
  const [editZoneLabel, setEditZoneLabel] = useState('');
  const [editZoneColor, setEditZoneColor] = useState<MapZone['colorKey']>('purple');

  // Path edit fields
  const [editPathLabel, setEditPathLabel] = useState('');
  const [editPathKind,  setEditPathKind]  = useState<MapPath['kind']>('river');
  const [editPathColor, setEditPathColor] = useState<MapPath['colorKey']>('blue');

  const svgRef  = useRef<SVGSVGElement>(null);
  const dragRef = useRef<DragMode>(null);

  // Populate pin edit fields on selection
  useEffect(() => {
    if (!selected || selected.kind !== 'pin') return;
    const loc = locations.find(l => l.id === selected.id);
    if (loc) { setEditPinLabel(loc.label); setEditPinSublabel(loc.sublabel); setEditPinType(loc.type); }
  }, [selected, locations]);

  // Populate zone edit fields on selection
  useEffect(() => {
    if (!selected || selected.kind !== 'zone') return;
    const z = zones.find(z => z.id === selected.id);
    if (z) { setEditZoneLabel(z.label); setEditZoneColor(z.colorKey); }
  }, [selected, zones]);

  // Populate path edit fields on selection
  useEffect(() => {
    if (!selected || selected.kind !== 'path') return;
    const p = paths.find(p => p.id === selected.id);
    if (p) { setEditPathLabel(p.label); setEditPathKind(p.kind); setEditPathColor(p.colorKey); }
  }, [selected, paths]);

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
          const kindLabel = drawing === 'river' ? 'RIVER' : drawing === 'road' ? 'ROAD' : 'BORDER';
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
      const pin: MapLocation = { id: newId, label: 'NEW LOCATION', sublabel: '', x: mx, y: my, type: 'surface' };
      setLocations(prev => [...prev, pin]);
      setSelected({ kind: 'pin', id: newId });
    } else {
      const uid = `${placing}-${Date.now()}`;
      const defaultLabels: Record<string, string> = {
        zone: 'NEW ZONE', land: 'NEW LAND', lake: 'NEW LAKE', mountain: 'NEW MOUNTAIN',
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

  // ─── Edit commits ─────────────────────────────────────────────────────────

  function commitPin() {
    if (!selected || selected.kind !== 'pin') return;
    setLocations(prev => prev.map(l =>
      l.id === selected.id
        ? { ...l, label: editPinLabel.toUpperCase(), sublabel: editPinSublabel.toUpperCase(), type: editPinType }
        : l
    ));
  }

  function commitZone() {
    if (!selected || selected.kind !== 'zone') return;
    setZones(prev => prev.map(z =>
      z.id === selected.id
        ? { ...z, label: editZoneLabel.toUpperCase(), colorKey: editZoneColor }
        : z
    ));
  }

  function commitPath() {
    if (!selected || selected.kind !== 'path') return;
    setPaths(prev => prev.map(p =>
      p.id === selected.id
        ? { ...p, label: editPathLabel.toUpperCase(), kind: editPathKind, colorKey: editPathColor }
        : p
    ));
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

  async function save() {
    setSaving(true); setMsg('');
    try {
      const res = await fetch('/api/admin/map', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locations, zones, paths }),
      });
      setMsg(res.ok ? '✓ Map saved' : '✗ Save failed');
    } catch { setMsg('✗ Network error'); }
    finally { setSaving(false); }
  }

  async function reset() {
    if (!confirm('Reset map to defaults?')) return;
    setSaving(true); setMsg('');
    try {
      const res = await fetch('/api/admin/map', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locations: initialConfig.locations, zones: initialConfig.zones, paths: initialConfig.paths ?? [] }),
      });
      if (res.ok) {
        setLocations(initialConfig.locations);
        setZones(initialConfig.zones);
        setPaths(initialConfig.paths ?? []);
        setSelected(null);
        setMsg('✓ Reset to defaults');
      } else { setMsg('✗ Reset failed'); }
    } catch { setMsg('✗ Network error'); }
    finally { setSaving(false); }
  }

  // ─── Derived ──────────────────────────────────────────────────────────────

  const selPin  = selected?.kind === 'pin'  ? locations.find(l => l.id === selected.id) : null;
  const selZone = selected?.kind === 'zone' ? zones.find(z => z.id === selected.id)     : null;
  const selPath = selected?.kind === 'path' ? paths.find(p => p.id === selected.id)     : null;

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
        {active ? `CLICK MAP…` : label}
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
        {active ? `DRAWING… (dbl-click finish)` : label}
      </button>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

      {/* Toolbar row 1 */}
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <PlaceBtn mode="pin"      label="+ PIN" />
        <PlaceBtn mode="zone"     label="+ ZONE" />
        <PlaceBtn mode="land"     label="+ LAND" />
        <PlaceBtn mode="lake"     label="+ LAKE" />
        <PlaceBtn mode="mountain" label="+ MOUNTAIN" />
        <div style={{ width: '1px', height: '20px', background: '#2a2a2a', margin: '0 0.25rem' }}/>
        <DrawBtn mode="river"  label="✏ DRAW RIVER" />
        <DrawBtn mode="road"   label="✏ DRAW ROAD" />
        <DrawBtn mode="border" label="✏ DRAW BORDER" />
        {isDrawingActive && (
          <select value={drawColor} onChange={e => setDrawColor(e.target.value as MapPath['colorKey'])}
            style={{ ...inputStyle, width: 'auto', padding: '0.3rem 0.5rem' }}>
            {(['blue','orange','green','purple'] as const).map(c => (
              <option key={c} value={c}>{c.toUpperCase()}</option>
            ))}
          </select>
        )}
        <div style={{ flex: 1 }} />
        <button onClick={save} disabled={saving}
          style={{ fontFamily: mono, fontSize: '0.55rem', letterSpacing: '0.15em', textTransform: 'uppercase', padding: '0.35rem 0.7rem', cursor: saving ? 'not-allowed' : 'pointer', border: `1px solid ${green}44`, background: green + '18', color: green }}>
          {saving ? 'SAVING…' : 'SAVE MAP'}
        </button>
        <button onClick={reset} disabled={saving}
          style={{ fontFamily: mono, fontSize: '0.55rem', letterSpacing: '0.15em', textTransform: 'uppercase', padding: '0.35rem 0.7rem', cursor: 'pointer', border: '1px solid #2a2a2a', background: 'transparent', color: '#444' }}>
          RESET DEFAULTS
        </button>
        {msg && <span style={{ fontFamily: mono, fontSize: '0.55rem', color: msg.startsWith('✓') ? green : '#ff4466' }}>{msg}</span>}
      </div>

      {/* Drawing status hint */}
      {isDrawingActive && (
        <div style={{ fontFamily: mono, fontSize: '0.5rem', color: 'rgba(56,189,248,0.7)', letterSpacing: '0.1em', padding: '0.4rem 0.6rem', border: '1px solid rgba(56,189,248,0.2)', background: 'rgba(56,189,248,0.05)' }}>
          DRAWING {drawing?.toUpperCase()} — click to add points ({drawPoints.length} pts) · double-click to finish · ESC to cancel
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
                PIN #{selPin.id}
              </p>
              <div style={fieldStyle}>
                <label style={labelStyle}>LABEL</label>
                <input value={editPinLabel} onChange={e => setEditPinLabel(e.target.value)} onBlur={commitPin} style={inputStyle}/>
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>SUBLABEL</label>
                <input value={editPinSublabel} onChange={e => setEditPinSublabel(e.target.value)} onBlur={commitPin} style={inputStyle}/>
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>TYPE</label>
                <select value={editPinType} onChange={e => setEditPinType(e.target.value as MapLocation['type'])} onBlur={commitPin}
                  style={{ ...inputStyle, width: '100%' }}>
                  {(['surface','underground','island','aerial'] as const).map(t => (
                    <option key={t} value={t}>{t.toUpperCase()}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={commitPin}
                  style={{ fontFamily: mono, fontSize: '0.5rem', letterSpacing: '0.1em', padding: '0.3rem 0.6rem', border: `1px solid ${green}44`, background: green + '18', color: green, cursor: 'pointer' }}>
                  APPLY
                </button>
                <button onClick={deleteSelected}
                  style={{ fontFamily: mono, fontSize: '0.5rem', letterSpacing: '0.1em', padding: '0.3rem 0.6rem', border: '1px solid #ff446633', background: 'transparent', color: '#ff4466', cursor: 'pointer' }}>
                  DELETE
                </button>
              </div>
              <p style={{ fontFamily: mono, fontSize: '0.5rem', color: '#333', marginTop: '0.5rem' }}>
                X: {selPin.x} · Z: {selPin.y}
              </p>
            </div>
          ) : selZone ? (
            <div style={{ background: '#0d0d0d', border: '1px solid #2a2a2a', padding: '1rem' }}>
              <p style={{ fontFamily: mono, fontSize: '0.5rem', letterSpacing: '0.2em', color: '#888', marginBottom: '0.75rem' }}>
                {selZone.kind.toUpperCase()} — {selZone.label}
              </p>
              <div style={fieldStyle}>
                <label style={labelStyle}>LABEL</label>
                <input value={editZoneLabel} onChange={e => setEditZoneLabel(e.target.value)} onBlur={commitZone} style={inputStyle}/>
              </div>
              {selZone.kind !== 'lake' && (
                <div style={fieldStyle}>
                  <label style={labelStyle}>COLOR</label>
                  <select value={editZoneColor} onChange={e => setEditZoneColor(e.target.value as MapZone['colorKey'])} onBlur={commitZone}
                    style={{ ...inputStyle, width: '100%' }}>
                    {(['purple','blue','orange','green'] as const).map(c => (
                      <option key={c} value={c}>{c.toUpperCase()}</option>
                    ))}
                  </select>
                </div>
              )}
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={commitZone}
                  style={{ fontFamily: mono, fontSize: '0.5rem', letterSpacing: '0.1em', padding: '0.3rem 0.6rem', border: `1px solid ${green}44`, background: green + '18', color: green, cursor: 'pointer' }}>
                  APPLY
                </button>
                <button onClick={deleteSelected}
                  style={{ fontFamily: mono, fontSize: '0.5rem', letterSpacing: '0.1em', padding: '0.3rem 0.6rem', border: '1px solid #ff446633', background: 'transparent', color: '#ff4466', cursor: 'pointer' }}>
                  DELETE
                </button>
              </div>
              <p style={{ fontFamily: mono, fontSize: '0.55rem', color: '#444', marginTop: '0.6rem', lineHeight: 1.7 }}>
                CX {selZone.cx} · CY {selZone.cy}<br/>
                RX {selZone.rx} · RY {selZone.ry}<br/>
                <span style={{ color: '#333' }}>Drag to move · handles to resize</span>
              </p>
            </div>
          ) : selPath ? (
            <div style={{ background: '#0d0d0d', border: '1px solid #2a2a2a', padding: '1rem' }}>
              <p style={{ fontFamily: mono, fontSize: '0.5rem', letterSpacing: '0.2em', color: '#888', marginBottom: '0.75rem' }}>
                {selPath.kind.toUpperCase()} — {selPath.label}
              </p>
              <div style={fieldStyle}>
                <label style={labelStyle}>LABEL</label>
                <input value={editPathLabel} onChange={e => setEditPathLabel(e.target.value)} onBlur={commitPath} style={inputStyle}/>
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>TYPE</label>
                <select value={editPathKind} onChange={e => setEditPathKind(e.target.value as MapPath['kind'])} onBlur={commitPath}
                  style={{ ...inputStyle, width: '100%' }}>
                  {(['river','road','border'] as const).map(k => (
                    <option key={k} value={k}>{k.toUpperCase()}</option>
                  ))}
                </select>
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>COLOR</label>
                <select value={editPathColor} onChange={e => setEditPathColor(e.target.value as MapPath['colorKey'])} onBlur={commitPath}
                  style={{ ...inputStyle, width: '100%' }}>
                  {(['blue','orange','green','purple'] as const).map(c => (
                    <option key={c} value={c}>{c.toUpperCase()}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <button onClick={commitPath}
                  style={{ fontFamily: mono, fontSize: '0.5rem', letterSpacing: '0.1em', padding: '0.3rem 0.6rem', border: `1px solid ${green}44`, background: green + '18', color: green, cursor: 'pointer' }}>
                  APPLY
                </button>
                <button onClick={deleteSelected}
                  style={{ fontFamily: mono, fontSize: '0.5rem', letterSpacing: '0.1em', padding: '0.3rem 0.6rem', border: '1px solid #ff446633', background: 'transparent', color: '#ff4466', cursor: 'pointer' }}>
                  DELETE
                </button>
              </div>
              <p style={{ fontFamily: mono, fontSize: '0.5rem', color: '#333', lineHeight: 1.7 }}>
                {selPath.points.length} pts · drag dots to move<br/>
                <span style={{ color: '#2a2a2a' }}>double-click a dot to remove it</span>
              </p>
            </div>
          ) : (
            <div style={{ background: '#0d0d0d', border: '1px solid #1a1a1a', padding: '1rem' }}>
              <p style={{ fontFamily: mono, fontSize: '0.55rem', color: '#333', lineHeight: 1.9, letterSpacing: '0.05em', whiteSpace: 'pre-line' }}>
                {placing
                  ? `Click the map to\nplace the new ${placing}.`
                  : drawing
                  ? `Click to add points.\nDouble-click to finish.\nESC to cancel.`
                  : `Click a pin or shape\nto select and edit it.\n\nDrag to move.\nDrag handles to resize.\nClick path to select.`}
              </p>
            </div>
          )}

          {/* Zone/feature lists */}
          <ZoneList title="NAMED ZONES"  zones={namedZones}    selected={selected} onSelect={id => setSelected(s => s?.id === id ? null : { kind: 'zone', id })} colors={ZONE_STYLE}/>
          <ZoneList title="LAND PATCHES" zones={landZones}     selected={selected} onSelect={id => setSelected(s => s?.id === id ? null : { kind: 'zone', id })} colors={ZONE_STYLE}/>
          <ZoneList title="LAKES"        zones={lakeZones}     selected={selected} onSelect={id => setSelected(s => s?.id === id ? null : { kind: 'zone', id })} colors={ZONE_STYLE}/>
          <ZoneList title="MOUNTAINS"    zones={mountainZones} selected={selected} onSelect={id => setSelected(s => s?.id === id ? null : { kind: 'zone', id })} colors={ZONE_STYLE}/>

          {/* Paths list */}
          {paths.length > 0 && (
            <div style={{ background: '#0d0d0d', border: '1px solid #1a1a1a', padding: '1rem' }}>
              <p style={{ fontFamily: mono, fontSize: '0.5rem', letterSpacing: '0.2em', color: '#555', marginBottom: '0.5rem' }}>
                PATHS ({paths.length})
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
                    {p.kind.toUpperCase()} · {p.label}
                  </button>
                );
              })}
            </div>
          )}

          {/* Pin list */}
          <div style={{ background: '#0d0d0d', border: '1px solid #1a1a1a', padding: '1rem', maxHeight: '260px', overflowY: 'auto' }}>
            <p style={{ fontFamily: mono, fontSize: '0.5rem', letterSpacing: '0.2em', color: '#555', marginBottom: '0.6rem' }}>
              PINS ({locations.length})
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
                  <span style={{ color: '#333', fontSize: '0.45rem', flexShrink: 0 }}>{loc.x},{loc.y}</span>
                </button>
              );
            })}
          </div>

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

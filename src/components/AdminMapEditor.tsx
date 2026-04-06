'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import type { MapConfig, MapLocation, MapZone } from '@/lib/map-types';

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

const VW = 1000;
const VH = 650;

type DragMode =
  | { kind: 'pin';         id: number; ox: number; oy: number }
  | { kind: 'zone-center'; id: string; ox: number; oy: number }
  | { kind: 'zone-rx';     id: string; startRx: number; startMx: number }
  | { kind: 'zone-ry';     id: string; startRy: number; startMy: number }
  | null;

type Selection =
  | { kind: 'pin';  id: number }
  | { kind: 'zone'; id: string }
  | null;

export default function AdminMapEditor({ initialConfig }: { initialConfig: MapConfig }) {
  const [locations, setLocations] = useState<MapLocation[]>(initialConfig.locations);
  const [zones,     setZones]     = useState<MapZone[]>(initialConfig.zones);
  const [selected,  setSelected]  = useState<Selection>(null);
  const [saving,    setSaving]    = useState(false);
  const [msg,       setMsg]       = useState('');
  const [placing,   setPlacing]   = useState<'pin' | 'zone' | 'land' | null>(null);

  // Pin edit fields
  const [editPinLabel,    setEditPinLabel]    = useState('');
  const [editPinSublabel, setEditPinSublabel] = useState('');
  const [editPinType,     setEditPinType]     = useState<MapLocation['type']>('surface');

  // Zone edit fields
  const [editZoneLabel, setEditZoneLabel] = useState('');
  const [editZoneColor, setEditZoneColor] = useState<MapZone['colorKey']>('purple');

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
    if (placing) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    const [mx, my] = toSvg(e.clientX, e.clientY);
    const loc = locations.find(l => l.id === id)!;
    dragRef.current = { kind: 'pin', id, ox: mx - loc.x, oy: my - loc.y };
    setSelected({ kind: 'pin', id });
  }, [placing, toSvg, locations]);

  const onZoneDown = useCallback((e: React.PointerEvent, id: string) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    const [mx, my] = toSvg(e.clientX, e.clientY);
    dragRef.current = { kind: 'zone-center', id, ox: mx, oy: my };
    setSelected({ kind: 'zone', id });
  }, [toSvg]);

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
      const z = zones.find(z => z.id === d.id)!;
      setZones(prev => prev.map(z => z.id === d.id
        ? { ...z, rx: Math.max(10, Math.round(d.startRx + (mx - d.startMx))) }
        : z));
      void z; // suppress lint
    } else if (d.kind === 'zone-ry') {
      setZones(prev => prev.map(z => z.id === d.id
        ? { ...z, ry: Math.max(10, Math.round(d.startRy + (my - d.startMy))) }
        : z));
    }
  }, [toSvg, zones]);

  const onUp = useCallback(() => { dragRef.current = null; }, []);

  // ─── Place (click on map) ─────────────────────────────────────────────────

  const onSvgClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!placing) return;
    const [mx, my] = toSvg(e.clientX, e.clientY);

    if (placing === 'pin') {
      const newId = Math.max(0, ...locations.map(l => l.id)) + 1;
      const pin: MapLocation = { id: newId, label: 'NEW LOCATION', sublabel: '', x: mx, y: my, type: 'surface' };
      setLocations(prev => [...prev, pin]);
      setSelected({ kind: 'pin', id: newId });
    } else {
      const uid = `zone-${Date.now()}`;
      const z: MapZone = {
        id: uid, label: placing === 'land' ? 'NEW LAND' : 'NEW ZONE',
        kind: placing, cx: mx, cy: my, rx: 80, ry: 60, colorKey: 'green',
      };
      setZones(prev => [...prev, z]);
      setSelected({ kind: 'zone', id: uid });
    }
    setPlacing(null);
  }, [placing, toSvg, locations]);

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

  function deleteSelected() {
    if (!selected) return;
    if (selected.kind === 'pin')  setLocations(prev => prev.filter(l => l.id !== selected.id));
    if (selected.kind === 'zone') setZones(prev => prev.filter(z => z.id !== selected.id));
    setSelected(null);
  }

  // ─── Save / Reset ─────────────────────────────────────────────────────────

  async function save() {
    setSaving(true); setMsg('');
    try {
      const res = await fetch('/api/admin/map', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locations, zones }),
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
        body: JSON.stringify({ locations: initialConfig.locations, zones: initialConfig.zones }),
      });
      if (res.ok) {
        setLocations(initialConfig.locations);
        setZones(initialConfig.zones);
        setSelected(null);
        setMsg('✓ Reset to defaults');
      } else { setMsg('✗ Reset failed'); }
    } catch { setMsg('✗ Network error'); }
    finally { setSaving(false); }
  }

  // ─── Derived ──────────────────────────────────────────────────────────────

  const selPin  = selected?.kind === 'pin'  ? locations.find(l => l.id === selected.id) : null;
  const selZone = selected?.kind === 'zone' ? zones.find(z => z.id === selected.id)     : null;

  const landZones = zones.filter(z => z.kind === 'land');
  const namedZones = zones.filter(z => z.kind === 'zone');

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

  function PlaceBtn({ mode, label }: { mode: 'pin' | 'zone' | 'land'; label: string }) {
    const active = placing === mode;
    return (
      <button
        onClick={() => { setPlacing(active ? null : mode); setSelected(null); }}
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <PlaceBtn mode="pin"  label="+ ADD PIN" />
        <PlaceBtn mode="zone" label="+ ADD ZONE" />
        <PlaceBtn mode="land" label="+ ADD LAND" />
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

      <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>

        {/* SVG map */}
        <div style={{ flex: 1, minWidth: 0, border: '1px solid #1a1a1a', background: '#040d18', cursor: placing ? 'crosshair' : 'default' }}>
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

            {/* Extra land patches (rendered below main land) */}
            {landZones.map(z => {
              const s = ZONE_STYLE[z.colorKey] ?? ZONE_STYLE.green;
              const isSel = selected?.kind === 'zone' && selected.id === z.id;
              return (
                <g key={z.id}>
                  <ellipse cx={z.cx} cy={z.cy} rx={z.rx} ry={z.ry}
                    fill={s.land} stroke={isSel ? s.stroke : 'rgba(0,255,65,0.12)'} strokeWidth={isSel ? 1.5 : 0.8}
                    style={{ cursor: 'move' }}
                    onPointerDown={e => onZoneDown(e, z.id)}
                  />
                  {isSel && <ResizeHandles z={z} onHandleDown={onHandleDown} color={s.stroke}/>}
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
                    style={{ cursor: 'move' }}
                    onPointerDown={e => onZoneDown(e, z.id)}
                  />
                  {/* Zone label */}
                  <text x={z.cx} y={z.cy + z.ry + 12}
                    fill={s.stroke} fontFamily={mono} fontSize={7} letterSpacing={1.5} textAnchor="middle" pointerEvents="none">
                    {z.label}
                  </text>
                  {isSel && <ResizeHandles z={z} onHandleDown={onHandleDown} color={s.stroke}/>}
                </g>
              );
            })}

            {/* Pins */}
            {locations.map((loc, i) => {
              const color = TYPE_COLOR[loc.type];
              const isSel = selected?.kind === 'pin' && selected.id === loc.id;
              return (
                <g key={loc.id} onPointerDown={e => onPinDown(e, loc.id)}
                  style={{ cursor: placing ? 'crosshair' : 'grab' }}>
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
                {selZone.kind === 'land' ? 'LAND PATCH' : 'ZONE'} — {selZone.label}
              </p>
              <div style={fieldStyle}>
                <label style={labelStyle}>LABEL</label>
                <input value={editZoneLabel} onChange={e => setEditZoneLabel(e.target.value)} onBlur={commitZone} style={inputStyle}/>
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>COLOR</label>
                <select value={editZoneColor} onChange={e => setEditZoneColor(e.target.value as MapZone['colorKey'])} onBlur={commitZone}
                  style={{ ...inputStyle, width: '100%' }}>
                  {(['purple','blue','orange','green'] as const).map(c => (
                    <option key={c} value={c}>{c.toUpperCase()}</option>
                  ))}
                </select>
              </div>
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
          ) : (
            <div style={{ background: '#0d0d0d', border: '1px solid #1a1a1a', padding: '1rem' }}>
              <p style={{ fontFamily: mono, fontSize: '0.55rem', color: '#333', lineHeight: 1.9, letterSpacing: '0.05em', whiteSpace: 'pre-line' }}>
                {placing
                  ? `Click the map to\nplace the new ${placing}.`
                  : `Click a pin or shape\nto select and edit it.\n\nDrag to move.\nDrag handles to resize.`}
              </p>
            </div>
          )}

          {/* Zones list */}
          <ZoneList title="NAMED ZONES" zones={namedZones} selected={selected} onSelect={id => setSelected(s => s?.id === id ? null : { kind: 'zone', id })} colors={ZONE_STYLE}/>
          <ZoneList title="LAND PATCHES" zones={landZones} selected={selected} onSelect={id => setSelected(s => s?.id === id ? null : { kind: 'zone', id })} colors={ZONE_STYLE}/>

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

// ─── Resize handles (extracted for reuse) ─────────────────────────────────────

function ResizeHandles({ z, onHandleDown, color }: {
  z: MapZone;
  onHandleDown: (e: React.PointerEvent, id: string, axis: 'rx' | 'ry') => void;
  color: string;
}) {
  const handleStyle: React.CSSProperties = { cursor: 'ew-resize' };
  return (
    <>
      <circle cx={z.cx + z.rx} cy={z.cy} r={7} fill={color} stroke="#fff" strokeWidth={1} style={handleStyle} onPointerDown={e => onHandleDown(e, z.id, 'rx')}/>
      <circle cx={z.cx - z.rx} cy={z.cy} r={7} fill={color} stroke="#fff" strokeWidth={1} style={handleStyle} onPointerDown={e => onHandleDown(e, z.id, 'rx')}/>
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
  return (
    <div style={{ background: '#0d0d0d', border: '1px solid #1a1a1a', padding: '1rem' }}>
      <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.5rem', letterSpacing: '0.2em', color: '#555', marginBottom: '0.5rem' }}>
        {title} ({zones.length})
      </p>
      {zones.length === 0 && (
        <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.5rem', color: '#2a2a2a' }}>none yet</p>
      )}
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

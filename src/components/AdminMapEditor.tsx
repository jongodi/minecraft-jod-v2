'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import type { MapConfig, MapLocation, MapZone } from '@/lib/map-types';

const mono  = "'JetBrains Mono', monospace";
const sans  = "'Space Grotesk', sans-serif";
const green = '#00ff41';

const TYPE_COLOR: Record<string, string> = {
  surface:     '#00ff41',
  underground: '#c084fc',
  island:      '#f97316',
  aerial:      '#38bdf8',
};

const ZONE_COLORS: Record<string, { stroke: string; fill: string }> = {
  purple: { stroke: 'rgba(185,115,255,0.5)', fill: 'rgba(45,18,72,0.2)'   },
  blue:   { stroke: 'rgba(56,189,248,0.5)',  fill: 'rgba(8,38,78,0.25)'   },
  orange: { stroke: 'rgba(249,115,22,0.5)',  fill: 'rgba(80,30,0,0.2)'    },
};

// SVG viewBox dimensions
const VW = 1000;
const VH = 650;

type DragMode =
  | { kind: 'pin'; id: number; ox: number; oy: number }
  | { kind: 'zone-center'; id: string; ox: number; oy: number }
  | { kind: 'zone-rx'; id: string; startRx: number; startMx: number }
  | { kind: 'zone-ry'; id: string; startRy: number; startMy: number }
  | null;

interface Props {
  initialConfig: MapConfig;
}

export default function AdminMapEditor({ initialConfig }: Props) {
  const [locations, setLocations]   = useState<MapLocation[]>(initialConfig.locations);
  const [zones,     setZones]       = useState<MapZone[]>(initialConfig.zones);
  const [selected,  setSelected]    = useState<{ kind: 'pin' | 'zone'; id: number | string } | null>(null);
  const [saving,    setSaving]      = useState(false);
  const [msg,       setMsg]         = useState('');
  const [placing,   setPlacing]     = useState(false); // "add pin" mode

  // Editing fields for selected pin
  const [editLabel,    setEditLabel]    = useState('');
  const [editSublabel, setEditSublabel] = useState('');
  const [editType,     setEditType]     = useState<MapLocation['type']>('surface');

  const svgRef   = useRef<SVGSVGElement>(null);
  const dragRef  = useRef<DragMode>(null);

  // When selection changes, populate edit fields
  useEffect(() => {
    if (!selected || selected.kind !== 'pin') return;
    const loc = locations.find(l => l.id === selected.id);
    if (loc) { setEditLabel(loc.label); setEditSublabel(loc.sublabel); setEditType(loc.type); }
  }, [selected, locations]);

  // Convert client coords to SVG coords
  const toSvgCoords = useCallback((clientX: number, clientY: number): [number, number] => {
    const svg = svgRef.current;
    if (!svg) return [0, 0];
    const rect = svg.getBoundingClientRect();
    const scaleX = VW / rect.width;
    const scaleY = VH / rect.height;
    return [
      Math.round((clientX - rect.left) * scaleX),
      Math.round((clientY - rect.top)  * scaleY),
    ];
  }, []);

  // ─── Drag handlers ────────────────────────────────────────────────────────

  const onPinPointerDown = useCallback((e: React.PointerEvent, id: number) => {
    if (placing) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    const [mx, my] = toSvgCoords(e.clientX, e.clientY);
    const loc = locations.find(l => l.id === id)!;
    dragRef.current = { kind: 'pin', id, ox: mx - loc.x, oy: my - loc.y };
    setSelected({ kind: 'pin', id });
  }, [placing, toSvgCoords, locations]);

  const onZoneCenterDown = useCallback((e: React.PointerEvent, id: string) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    const [mx, my] = toSvgCoords(e.clientX, e.clientY);
    dragRef.current = { kind: 'zone-center', id, ox: mx, oy: my };
    setSelected({ kind: 'zone', id });
  }, [toSvgCoords]);

  const onZoneHandleDown = useCallback((e: React.PointerEvent, id: string, axis: 'rx' | 'ry') => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    const [mx, my] = toSvgCoords(e.clientX, e.clientY);
    const zone = zones.find(z => z.id === id)!;
    if (axis === 'rx') dragRef.current = { kind: 'zone-rx', id, startRx: zone.rx, startMx: mx };
    else               dragRef.current = { kind: 'zone-ry', id, startRy: zone.ry, startMy: my };
    setSelected({ kind: 'zone', id });
  }, [toSvgCoords, zones]);

  const onPointerMove = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    const d = dragRef.current;
    if (!d) return;
    const [mx, my] = toSvgCoords(e.clientX, e.clientY);

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
        : z
      ));
    } else if (d.kind === 'zone-rx') {
      const zone = zones.find(z => z.id === d.id)!;
      const newRx = Math.max(10, d.startRx + (mx - d.startMx));
      setZones(prev => prev.map(z => z.id === d.id ? { ...z, rx: Math.round(newRx) } : z));
    } else if (d.kind === 'zone-ry') {
      const zone = zones.find(z => z.id === d.id)!;
      const newRy = Math.max(10, d.startRy + (my - d.startMy));
      setZones(prev => prev.map(z => z.id === d.id ? { ...z, ry: Math.round(newRy) } : z));
    }
  }, [toSvgCoords, zones]);

  const onPointerUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  // ─── Canvas click for "add pin" mode ─────────────────────────────────────

  const onSvgClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!placing) return;
    const [mx, my] = toSvgCoords(e.clientX, e.clientY);
    const newId = Math.max(0, ...locations.map(l => l.id)) + 1;
    const newPin: MapLocation = {
      id: newId, label: 'NEW LOCATION', sublabel: '', x: mx, y: my, type: 'surface',
    };
    setLocations(prev => [...prev, newPin]);
    setSelected({ kind: 'pin', id: newId });
    setPlacing(false);
  }, [placing, toSvgCoords, locations]);

  // ─── Selected pin field updates ───────────────────────────────────────────

  function commitPinEdits() {
    if (!selected || selected.kind !== 'pin') return;
    setLocations(prev => prev.map(l =>
      l.id === selected.id
        ? { ...l, label: editLabel.toUpperCase(), sublabel: editSublabel.toUpperCase(), type: editType }
        : l
    ));
  }

  function deleteSelectedPin() {
    if (!selected || selected.kind !== 'pin') return;
    setLocations(prev => prev.filter(l => l.id !== selected.id));
    setSelected(null);
  }

  // ─── Save & Reset ─────────────────────────────────────────────────────────

  async function save() {
    setSaving(true); setMsg('');
    try {
      const res = await fetch('/api/admin/map', {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ locations, zones }),
      });
      setMsg(res.ok ? '✓ Map saved' : '✗ Save failed');
    } catch {
      setMsg('✗ Network error');
    } finally {
      setSaving(false);
    }
  }

  async function reset() {
    if (!confirm('Reset map to defaults? This cannot be undone.')) return;
    setSaving(true); setMsg('');
    try {
      const res = await fetch('/api/admin/map', {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ locations: initialConfig.locations, zones: initialConfig.zones }),
      });
      if (res.ok) {
        setLocations(initialConfig.locations);
        setZones(initialConfig.zones);
        setSelected(null);
        setMsg('✓ Map reset to defaults');
      } else {
        setMsg('✗ Reset failed');
      }
    } catch {
      setMsg('✗ Network error');
    } finally {
      setSaving(false);
    }
  }

  // ─── Derive selected pin / zone ───────────────────────────────────────────

  const selPin  = selected?.kind === 'pin'  ? locations.find(l => l.id === selected.id) : null;
  const selZone = selected?.kind === 'zone' ? zones.find(z => z.id === selected.id) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontFamily: mono, fontSize: '0.55rem', color: '#555', letterSpacing: '0.1em' }}>
          DRAG PINS TO REPOSITION · CLICK TO SELECT
        </span>
        <div style={{ flex: 1 }} />
        <button
          onClick={() => { setPlacing(p => !p); setSelected(null); }}
          style={{ fontFamily: mono, fontSize: '0.55rem', letterSpacing: '0.15em', textTransform: 'uppercase', padding: '0.35rem 0.7rem', cursor: 'pointer', border: `1px solid ${placing ? green + '88' : '#2a2a2a'}`, background: placing ? green + '18' : 'transparent', color: placing ? green : '#555' }}
        >
          {placing ? '+ CLICK MAP TO PLACE' : '+ ADD PIN'}
        </button>
        <button
          onClick={save}
          disabled={saving}
          style={{ fontFamily: mono, fontSize: '0.55rem', letterSpacing: '0.15em', textTransform: 'uppercase', padding: '0.35rem 0.7rem', cursor: saving ? 'not-allowed' : 'pointer', border: `1px solid ${green}44`, background: green + '18', color: green }}
        >
          {saving ? 'SAVING...' : 'SAVE MAP'}
        </button>
        <button
          onClick={reset}
          disabled={saving}
          style={{ fontFamily: mono, fontSize: '0.55rem', letterSpacing: '0.15em', textTransform: 'uppercase', padding: '0.35rem 0.7rem', cursor: 'pointer', border: '1px solid #2a2a2a', background: 'transparent', color: '#444' }}
        >
          RESET DEFAULTS
        </button>
        {msg && (
          <span style={{ fontFamily: mono, fontSize: '0.55rem', color: msg.startsWith('✓') ? green : '#ff4466' }}>{msg}</span>
        )}
      </div>

      {/* Main layout: SVG + side panel */}
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>

        {/* SVG map */}
        <div style={{ flex: 1, minWidth: 0, border: '1px solid #1a1a1a', background: '#040d18', cursor: placing ? 'crosshair' : 'default', position: 'relative' }}>
          <svg
            ref={svgRef}
            viewBox={`0 0 ${VW} ${VH}`}
            style={{ width: '100%', display: 'block', userSelect: 'none', touchAction: 'none' }}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onClick={onSvgClick}
          >
            {/* Background */}
            <rect width={VW} height={VH} fill="#040d18"/>

            {/* Grid */}
            {[100,200,300,400,500,600,700,800,900].map(x => (
              <line key={`gx${x}`} x1={x} y1={0} x2={x} y2={VH} stroke="rgba(0,255,65,0.035)" strokeWidth={0.5}/>
            ))}
            {[100,200,300,400,500,600].map(y => (
              <line key={`gy${y}`} x1={0} y1={y} x2={VW} y2={y} stroke="rgba(0,255,65,0.035)" strokeWidth={0.5}/>
            ))}

            {/* Landmass */}
            <path
              d="M 435 60 C 528 45, 674 78, 752 142 C 810 194, 822 262, 818 330 C 814 402, 786 460, 746 502 C 700 550, 635 582, 555 596 C 476 610, 396 604, 320 582 C 232 558, 155 512, 110 458 C 62 400, 50 336, 56 278 C 62 218, 88 166, 132 136 C 182 100, 298 70, 435 60 Z"
              fill="#0f1e0f"
              stroke="rgba(0,255,65,0.15)"
              strokeWidth={1.2}
            />

            {/* Zones — editable */}
            {zones.map(z => {
              const c = ZONE_COLORS[z.colorKey] ?? ZONE_COLORS.purple;
              const isSel = selected?.kind === 'zone' && selected.id === z.id;
              return (
                <g key={z.id}>
                  <ellipse
                    cx={z.cx} cy={z.cy} rx={z.rx} ry={z.ry}
                    fill={c.fill}
                    stroke={isSel ? c.stroke.replace('0.5', '0.9') : c.stroke}
                    strokeWidth={isSel ? 2 : 1.2}
                    strokeDasharray="5 4"
                    style={{ cursor: 'move' }}
                    onPointerDown={e => onZoneCenterDown(e, z.id)}
                  />
                  {/* Resize handles — only show when selected */}
                  {isSel && (
                    <>
                      {/* rx handle (right) */}
                      <circle cx={z.cx + z.rx} cy={z.cy} r={6} fill={c.stroke} stroke="#fff" strokeWidth={1}
                        style={{ cursor: 'ew-resize' }}
                        onPointerDown={e => onZoneHandleDown(e, z.id, 'rx')}
                      />
                      {/* rx handle (left) */}
                      <circle cx={z.cx - z.rx} cy={z.cy} r={6} fill={c.stroke} stroke="#fff" strokeWidth={1}
                        style={{ cursor: 'ew-resize' }}
                        onPointerDown={e => onZoneHandleDown(e, z.id, 'rx')}
                      />
                      {/* ry handle (bottom) */}
                      <circle cx={z.cx} cy={z.cy + z.ry} r={6} fill={c.stroke} stroke="#fff" strokeWidth={1}
                        style={{ cursor: 'ns-resize' }}
                        onPointerDown={e => onZoneHandleDown(e, z.id, 'ry')}
                      />
                      {/* ry handle (top) */}
                      <circle cx={z.cx} cy={z.cy - z.ry} r={6} fill={c.stroke} stroke="#fff" strokeWidth={1}
                        style={{ cursor: 'ns-resize' }}
                        onPointerDown={e => onZoneHandleDown(e, z.id, 'ry')}
                      />
                    </>
                  )}
                </g>
              );
            })}

            {/* Pins — draggable */}
            {locations.map(loc => {
              const color = TYPE_COLOR[loc.type];
              const isSel = selected?.kind === 'pin' && selected.id === loc.id;
              return (
                <g
                  key={loc.id}
                  onPointerDown={e => onPinPointerDown(e, loc.id)}
                  style={{ cursor: placing ? 'crosshair' : 'grab' }}
                >
                  {isSel && <circle cx={loc.x} cy={loc.y} r={14} fill="none" stroke={color} strokeWidth={1.5} opacity={0.9}/>}
                  <circle cx={loc.x} cy={loc.y} r={10} fill="none" stroke={color} strokeWidth={0.8} opacity={0.2}>
                    <animate attributeName="r" values="8;18;8" dur="3s" repeatCount="indefinite"/>
                    <animate attributeName="opacity" values="0.3;0;0.3" dur="3s" repeatCount="indefinite"/>
                  </circle>
                  <rect
                    x={loc.x - (isSel ? 5 : 3.5)}
                    y={loc.y - (isSel ? 5 : 3.5)}
                    width={isSel ? 10 : 7}
                    height={isSel ? 10 : 7}
                    fill={color}
                    opacity={isSel ? 1 : 0.85}
                  />
                  {/* Label */}
                  <text x={loc.x + 10} y={loc.y + 4} fill={color} fontFamily={mono} fontSize={8} letterSpacing={1} pointerEvents="none">
                    {loc.label}
                  </text>
                  {/* Coordinate hint */}
                  <text x={loc.x + 10} y={loc.y + 14} fill="#444" fontFamily={mono} fontSize={6} pointerEvents="none">
                    {loc.x},{loc.y}
                  </text>
                </g>
              );
            })}

            {/* Border */}
            <rect x={8} y={8} width={984} height={634} fill="none" stroke="rgba(0,255,65,0.1)" strokeWidth={1}/>
          </svg>
        </div>

        {/* Side panel */}
        <div style={{ width: '260px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>

          {/* Selected pin editor */}
          {selPin ? (
            <div style={{ background: '#0d0d0d', border: `1px solid ${TYPE_COLOR[selPin.type]}33`, padding: '1rem' }}>
              <p style={{ fontFamily: mono, fontSize: '0.5rem', letterSpacing: '0.2em', color: TYPE_COLOR[selPin.type], marginBottom: '0.75rem' }}>
                PIN #{selPin.id} — {selPin.type.toUpperCase()}
              </p>

              <div style={{ marginBottom: '0.6rem' }}>
                <label style={{ fontFamily: mono, fontSize: '0.5rem', color: '#555', letterSpacing: '0.1em', display: 'block', marginBottom: '0.25rem' }}>LABEL</label>
                <input
                  value={editLabel}
                  onChange={e => setEditLabel(e.target.value)}
                  onBlur={commitPinEdits}
                  style={{ width: '100%', background: '#080808', border: '1px solid #2a2a2a', color: '#f0f0f0', fontFamily: mono, fontSize: '0.65rem', padding: '0.3rem 0.5rem', outline: 'none' }}
                />
              </div>

              <div style={{ marginBottom: '0.6rem' }}>
                <label style={{ fontFamily: mono, fontSize: '0.5rem', color: '#555', letterSpacing: '0.1em', display: 'block', marginBottom: '0.25rem' }}>SUBLABEL</label>
                <input
                  value={editSublabel}
                  onChange={e => setEditSublabel(e.target.value)}
                  onBlur={commitPinEdits}
                  style={{ width: '100%', background: '#080808', border: '1px solid #2a2a2a', color: '#f0f0f0', fontFamily: mono, fontSize: '0.65rem', padding: '0.3rem 0.5rem', outline: 'none' }}
                />
              </div>

              <div style={{ marginBottom: '0.75rem' }}>
                <label style={{ fontFamily: mono, fontSize: '0.5rem', color: '#555', letterSpacing: '0.1em', display: 'block', marginBottom: '0.25rem' }}>TYPE</label>
                <select
                  value={editType}
                  onChange={e => { setEditType(e.target.value as MapLocation['type']); }}
                  onBlur={commitPinEdits}
                  style={{ width: '100%', background: '#080808', border: '1px solid #2a2a2a', color: '#f0f0f0', fontFamily: mono, fontSize: '0.65rem', padding: '0.3rem 0.5rem', outline: 'none' }}
                >
                  {(['surface', 'underground', 'island', 'aerial'] as const).map(t => (
                    <option key={t} value={t}>{t.toUpperCase()}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={commitPinEdits}
                  style={{ fontFamily: mono, fontSize: '0.5rem', letterSpacing: '0.1em', padding: '0.3rem 0.6rem', border: `1px solid ${green}44`, background: green + '18', color: green, cursor: 'pointer' }}
                >
                  APPLY
                </button>
                <button
                  onClick={deleteSelectedPin}
                  style={{ fontFamily: mono, fontSize: '0.5rem', letterSpacing: '0.1em', padding: '0.3rem 0.6rem', border: '1px solid #ff446633', background: 'transparent', color: '#ff4466', cursor: 'pointer' }}
                >
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
                ZONE — {selZone.label}
              </p>
              <p style={{ fontFamily: mono, fontSize: '0.6rem', color: '#555', lineHeight: 1.8 }}>
                CX: {selZone.cx} · CY: {selZone.cy}<br/>
                RX: {selZone.rx} · RY: {selZone.ry}
              </p>
              <p style={{ fontFamily: mono, fontSize: '0.5rem', color: '#333', marginTop: '0.5rem' }}>
                Drag the center to move, drag handles to resize.
              </p>
            </div>
          ) : (
            <div style={{ background: '#0d0d0d', border: '1px solid #1a1a1a', padding: '1rem' }}>
              <p style={{ fontFamily: mono, fontSize: '0.55rem', color: '#444', lineHeight: 1.8, letterSpacing: '0.05em' }}>
                {placing
                  ? 'Click anywhere on the map to place a new pin.'
                  : 'Click a pin to select and edit it.\nDrag a pin to reposition it.\nDrag a zone ellipse to move it.\nDrag zone handles to resize.'}
              </p>
            </div>
          )}

          {/* Zone list */}
          <div style={{ background: '#0d0d0d', border: '1px solid #1a1a1a', padding: '1rem' }}>
            <p style={{ fontFamily: mono, fontSize: '0.5rem', letterSpacing: '0.2em', color: '#555', marginBottom: '0.6rem' }}>ZONES</p>
            {zones.map(z => {
              const c = ZONE_COLORS[z.colorKey];
              const isSel = selected?.kind === 'zone' && selected.id === z.id;
              return (
                <button
                  key={z.id}
                  onClick={() => setSelected(isSel ? null : { kind: 'zone', id: z.id })}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left',
                    fontFamily: mono, fontSize: '0.55rem', letterSpacing: '0.1em',
                    padding: '0.3rem 0.5rem', marginBottom: '0.25rem',
                    border: `1px solid ${isSel ? c.stroke : '#2a2a2a'}`,
                    background: isSel ? c.fill : 'transparent',
                    color: isSel ? '#f0f0f0' : '#555',
                    cursor: 'pointer',
                  }}
                >
                  {z.label}
                </button>
              );
            })}
          </div>

          {/* Pin list */}
          <div style={{ background: '#0d0d0d', border: '1px solid #1a1a1a', padding: '1rem', maxHeight: '300px', overflowY: 'auto' }}>
            <p style={{ fontFamily: mono, fontSize: '0.5rem', letterSpacing: '0.2em', color: '#555', marginBottom: '0.6rem' }}>
              PINS ({locations.length})
            </p>
            {locations.map(loc => {
              const color = TYPE_COLOR[loc.type];
              const isSel = selected?.kind === 'pin' && selected.id === loc.id;
              return (
                <button
                  key={loc.id}
                  onClick={() => setSelected(isSel ? null : { kind: 'pin', id: loc.id })}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.4rem', width: '100%', textAlign: 'left',
                    fontFamily: mono, fontSize: '0.55rem', letterSpacing: '0.08em',
                    padding: '0.25rem 0.4rem', marginBottom: '0.2rem',
                    border: `1px solid ${isSel ? color + '66' : '#1a1a1a'}`,
                    background: isSel ? color + '10' : 'transparent',
                    color: isSel ? color : '#555',
                    cursor: 'pointer',
                  }}
                >
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

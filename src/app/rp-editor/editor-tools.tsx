'use client';

// ─────────────────────────────────────────────────────────────────────────────
// Deep editor utilities: pixel painter, audio player, JSON + pack.mcmeta editors
// and the file tree. Extracted verbatim from the original editor so the hands-on
// editing surface is preserved while the analysis UI is rebuilt around it.
// Colors come from the shared (site-aligned) constants.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useRef, useCallback, useMemo, memo, useEffect } from 'react';
import { BG, BG2, BG3, BORDER, ACCENT, ACCENT2, DIM, TEXT, TEXT2 } from './rp-constants';

// ── Tree helpers ───────────────────────────────────────────────────────────────
export function buildTree(paths: string[]) {
  const root: any = {};
  for (const path of paths) {
    const parts = path.split('/'); let node = root;
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      if (!node[p]) node[p] = i === parts.length - 1 ? null : {};
      if (i < parts.length - 1) node = node[p];
    }
  }
  return root;
}

export const TreeNode = memo(function TreeNode({ name, node, path, depth, selected, onSelect, onRename }: any) {
  const [open, setOpen] = useState(depth < 2);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(name);
  const isDir = node !== null && typeof node === 'object';
  const full = path ? `${path}/${name}` : name;
  const ext = name.split('.').pop().toLowerCase();
  const icon = isDir ? (open ? '▼' : '►') : ext === 'png' ? '▪' : ext === 'json' ? '{}' : ext === 'mcmeta' ? '⚙' : ext === 'ogg' ? '♪' : '·';
  if (isDir) return (
    <div>
      <div className="tree-node" style={{ '--depth': depth } as any} onClick={() => setOpen((o) => !o)}>
        <span style={{ color: DIM, fontSize: 11, flexShrink: 0 }}>{icon}</span>
        <span style={{ color: TEXT2 }}>{name}</span>
      </div>
      {open && Object.entries(node).sort(([, a], [, b]: any) => (typeof a === 'object' && a !== null ? -1 : 0) - (typeof b === 'object' && b !== null ? -1 : 0)).map(([k, v]) => (
        <TreeNode key={k} name={k} node={v} path={full} depth={depth + 1} selected={selected} onSelect={onSelect} onRename={onRename} />
      ))}
    </div>
  );
  if (editing) {
    return (
      <div className="tree-node" style={{ '--depth': depth } as any}>
        <input
          autoFocus
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onBlur={() => {
            const newName = editName.trim();
            if (newName && newName !== name) onRename?.(full, path ? `${path}/${newName}` : newName);
            setEditing(false);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.currentTarget.blur(); }
            if (e.key === 'Escape') { setEditName(name); setEditing(false); }
          }}
          style={{ background: BG3, border: `1px solid ${ACCENT}`, color: TEXT, fontFamily: 'inherit', fontSize: 12, padding: '1px 4px', outline: 'none', width: 'calc(100% - 20px)', flex: 1 }}
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    );
  }
  return (
    <div className={`tree-node${selected === full ? ' selected' : ''}`} style={{ '--depth': depth } as any}
      onClick={() => onSelect(full)}
      onDoubleClick={(e) => { e.stopPropagation(); setEditName(name); setEditing(true); }}
      title="Double-click to rename"
    >
      <span style={{ color: ext === 'png' ? ACCENT2 : ext === 'ogg' ? '#a78bfa' : ext === 'json' ? '#f0a500' : DIM, fontSize: 11, flexShrink: 0 }}>{icon}</span>
      <span>{name}</span>
    </div>
  );
});

// ── PixelPainter helpers ────────────────────────────────────────────────────
function bresenhamLine(x0: number, y0: number, x1: number, y1: number, cb: (x: number, y: number) => void) {
  const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let err = dx - dy;
  for (; ;) { cb(x0, y0); if (x0 === x1 && y0 === y1) break; const e2 = 2 * err; if (e2 > -dy) { err -= dy; x0 += sx; } if (e2 < dx) { err += dx; y0 += sy; } }
}
function pixelRectOutline(x0: number, y0: number, x1: number, y1: number, cw: number, ch: number, cb: (x: number, y: number) => void) {
  const lx = Math.max(0, Math.min(x0, x1)), rx = Math.min(cw - 1, Math.max(x0, x1));
  const ty = Math.max(0, Math.min(y0, y1)), by = Math.min(ch - 1, Math.max(y0, y1));
  for (let x = lx; x <= rx; x++) { cb(x, ty); if (by !== ty) cb(x, by); }
  for (let y = ty + 1; y < by; y++) { cb(lx, y); if (rx !== lx) cb(rx, y); }
}
function floodFill(ctx: CanvasRenderingContext2D, sx: number, sy: number, fillHex: string, cw: number, ch: number) {
  const img = ctx.getImageData(0, 0, cw, ch); const d = img.data;
  const idx = (x: number, y: number) => (y * cw + x) * 4;
  const si = idx(sx, sy); const [tr, tg, tb, ta] = [d[si], d[si + 1], d[si + 2], d[si + 3]];
  const fr = parseInt(fillHex.slice(1, 3), 16), fg = parseInt(fillHex.slice(3, 5), 16), fb = parseInt(fillHex.slice(5, 7), 16);
  if (tr === fr && tg === fg && tb === fb && ta === 255) return;
  const stack: number[][] = [[sx, sy]];
  while (stack.length) {
    const [x, y] = stack.pop()!; if (x < 0 || x >= cw || y < 0 || y >= ch) continue;
    const i = idx(x, y); if (d[i] !== tr || d[i + 1] !== tg || d[i + 2] !== tb || d[i + 3] !== ta) continue;
    d[i] = fr; d[i + 1] = fg; d[i + 2] = fb; d[i + 3] = 255;
    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
  ctx.putImageData(img, 0, 0);
}

const TOOLS = [
  { id: 'pen', label: '✏ Pen' }, { id: 'line', label: '╱ Line' }, { id: 'rect', label: '□ Rect' },
  { id: 'fill', label: '◉ Fill' }, { id: 'eraser', label: '◻ Erase' }, { id: 'picker', label: '✦ Pick' },
  { id: 'select', label: '▣ Select' },
];
const PALETTE_KEY = 'jod_rp_palette';
const PALETTE_SIZE = 16;
function loadPalette(): string[] {
  try { const s = localStorage.getItem(PALETTE_KEY); if (s) return JSON.parse(s); } catch {}
  return Array(PALETTE_SIZE).fill('');
}
function savePaletteStorage(p: string[]) { try { localStorage.setItem(PALETTE_KEY, JSON.stringify(p)); } catch {} }

export function PixelPainter({ dataUrl, onSave, compact }: any) {
  const canvasRef = useRef<any>(); const overlayRef = useRef<any>();
  const [scale, setScale] = useState(8); const [color, setColor] = useState('#00ff41');
  const [tool, setTool] = useState('pen'); const [painting, setPainting] = useState(false);
  const [palette, setPalette] = useState<string[]>(() => loadPalette());
  const [showHistory, setShowHistory] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const historyLabelsRef = useRef<string[]>([]);

  const historyRef = useRef<ImageData[]>([]);
  const historyIdxRef = useRef<number>(-1);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const paintedRef = useRef(false);

  const [showImport, setShowImport] = useState(false);
  const [importSrc, setImportSrc] = useState<string | null>(null);
  const [pixelBlock, setPixelBlock] = useState(16);
  const importFileRef = useRef<any>();
  const importImgRef = useRef<HTMLImageElement | null>(null);
  const previewRef = useRef<any>();

  const dragStartRef = useRef<{ x: number, y: number } | null>(null);
  const baseSnapRef = useRef<ImageData | null>(null);
  const [selection, setSelection] = useState<{ x1: number, y1: number, x2: number, y2: number } | null>(null);
  const selectionRef = useRef<{ x1: number, y1: number, x2: number, y2: number } | null>(null);
  const [replaceFrom, setReplaceFrom] = useState('#000000');
  const [replaceTo, setReplaceTo] = useState('#00ff41');

  const drawOverlayRef = useRef<(s?: number) => void>(() => {});
  const drawSelMarqueeRef = useRef<(x1: number, y1: number, x2: number, y2: number, s?: number) => void>(() => {});

  const drawOverlay = useCallback((s = scale) => {
    const c = canvasRef.current; const ov = overlayRef.current; if (!c || !ov) return;
    ov.width = c.width * s; ov.height = c.height * s;
    const ctx = ov.getContext('2d')!; ctx.imageSmoothingEnabled = false; ctx.drawImage(c, 0, 0, c.width * s, c.height * s);
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    for (let x = 0; x <= c.width; x++) { ctx.beginPath(); ctx.moveTo(x * s, 0); ctx.lineTo(x * s, ov.height); ctx.stroke(); }
    for (let y = 0; y <= c.height; y++) { ctx.beginPath(); ctx.moveTo(0, y * s); ctx.lineTo(ov.width, y * s); ctx.stroke(); }
    if (selectionRef.current) { const { x1, y1, x2, y2 } = selectionRef.current; drawSelMarqueeRef.current(x1, y1, x2, y2, s); }
  }, [scale]);
  drawOverlayRef.current = drawOverlay;

  const drawSelMarquee = useCallback((x1: number, y1: number, x2: number, y2: number, s = scale) => {
    const ov = overlayRef.current; if (!ov) return;
    const ctx = ov.getContext('2d')!;
    const lx = Math.min(x1, x2) * s, ty = Math.min(y1, y2) * s;
    const rw = (Math.abs(x2 - x1) + 1) * s, bh = (Math.abs(y2 - y1) + 1) * s;
    ctx.save(); ctx.strokeStyle = ACCENT2; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
    ctx.strokeRect(lx + 0.5, ty + 0.5, rw, bh);
    ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineDashOffset = 3; ctx.strokeRect(lx + 0.5, ty + 0.5, rw, bh);
    ctx.restore();
  }, [scale]);
  drawSelMarqueeRef.current = drawSelMarquee;

  const syncButtons = useCallback(() => {
    setCanUndo(historyIdxRef.current > 0);
    setCanRedo(historyIdxRef.current < historyRef.current.length - 1);
  }, []);

  const pushHistory = useCallback((label = 'Edit') => {
    const c = canvasRef.current; if (!c) return;
    const snap = c.getContext('2d')!.getImageData(0, 0, c.width, c.height);
    historyRef.current = historyRef.current.slice(0, historyIdxRef.current + 1);
    historyLabelsRef.current = historyLabelsRef.current.slice(0, historyIdxRef.current + 1);
    historyRef.current.push(snap); historyLabelsRef.current.push(label);
    historyIdxRef.current = historyRef.current.length - 1; syncButtons();
  }, [syncButtons]);

  const undo = useCallback(() => {
    if (historyIdxRef.current <= 0) return;
    historyIdxRef.current--;
    const c = canvasRef.current; if (!c) return;
    c.getContext('2d')!.putImageData(historyRef.current[historyIdxRef.current], 0, 0);
    drawOverlayRef.current(); syncButtons();
  }, [syncButtons]);

  const redo = useCallback(() => {
    if (historyIdxRef.current >= historyRef.current.length - 1) return;
    historyIdxRef.current++;
    const c = canvasRef.current; if (!c) return;
    c.getContext('2d')!.putImageData(historyRef.current[historyIdxRef.current], 0, 0);
    drawOverlayRef.current(); syncButtons();
  }, [syncButtons]);

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      const c = canvasRef.current; if (!c) return;
      c.width = img.width; c.height = img.height;
      const ctx = c.getContext('2d')!; ctx.imageSmoothingEnabled = false; ctx.drawImage(img, 0, 0);
      historyRef.current = [ctx.getImageData(0, 0, c.width, c.height)];
      historyIdxRef.current = 0; setCanUndo(false); setCanRedo(false);
      const maxPx = compact ? 260 : 400;
      const auto = Math.max(1, Math.min(32, Math.floor(maxPx / Math.max(img.width, img.height))));
      setScale(auto); drawOverlay(auto);
    }; img.src = dataUrl;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataUrl]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo(); }
      if (e.key === 'Escape') { selectionRef.current = null; setSelection(null); drawOverlayRef.current(); }
      const k = e.key.toLowerCase();
      if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        if (k === 'b') { setTool('pen'); selectionRef.current = null; setSelection(null); }
        if (k === 'e') { setTool('eraser'); selectionRef.current = null; setSelection(null); }
        if (k === 'f') { setTool('fill'); selectionRef.current = null; setSelection(null); }
        if (k === 'l') { setTool('line'); selectionRef.current = null; setSelection(null); }
        if (k === 'r') { setTool('rect'); selectionRef.current = null; setSelection(null); }
        if (k === 'p') { setTool('picker'); selectionRef.current = null; setSelection(null); }
        if (k === 's' && !e.shiftKey) { e.preventDefault(); const c = canvasRef.current; if (c) onSave(c.toDataURL('image/png')); }
        if (k === '?' || k == '/') { setShowShortcuts((v) => !v); }
      }
    };
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h);
  }, [undo, redo, onSave]);

  const renderImportPreview = useCallback((img: HTMLImageElement, block: number) => {
    const pv = previewRef.current; if (!pv) return;
    const tw = Math.max(1, Math.round(img.width / block)), th = Math.max(1, Math.round(img.height / block));
    const tmp = document.createElement('canvas'); tmp.width = tw; tmp.height = th;
    const tc = tmp.getContext('2d')!; tc.imageSmoothingEnabled = true; tc.drawImage(img, 0, 0, tw, th);
    const maxPv = compact ? 220 : 320;
    const ds = Math.max(1, Math.floor(maxPv / Math.max(tw, th)));
    pv.width = tw * ds; pv.height = th * ds;
    const pc = pv.getContext('2d')!; pc.imageSmoothingEnabled = false; pc.drawImage(tmp, 0, 0, tw * ds, th * ds);
  }, [compact]);

  useEffect(() => {
    if (importSrc && importImgRef.current) renderImportPreview(importImgRef.current, pixelBlock);
  }, [importSrc, pixelBlock, renderImportPreview]);

  const handleImportFile = (e: any) => {
    const f = e.target.files?.[0]; if (!f) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const src = ev.target?.result as string; setImportSrc(src);
      const img = new Image(); img.onload = () => { importImgRef.current = img; renderImportPreview(img, pixelBlock); }; img.src = src;
    }; reader.readAsDataURL(f);
  };

  const applyImport = useCallback(() => {
    const img = importImgRef.current; const c = canvasRef.current; if (!img || !c) return;
    const tw = Math.max(1, Math.round(img.width / pixelBlock)), th = Math.max(1, Math.round(img.height / pixelBlock));
    const tmp = document.createElement('canvas'); tmp.width = tw; tmp.height = th;
    const tc = tmp.getContext('2d')!; tc.imageSmoothingEnabled = true; tc.drawImage(img, 0, 0, tw, th);
    const ctx = c.getContext('2d')!; ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, c.width, c.height); ctx.drawImage(tmp, 0, 0, c.width, c.height);
    pushHistory(); drawOverlayRef.current();
    setShowImport(false); setImportSrc(null); importImgRef.current = null;
  }, [pixelBlock, pushHistory]);

  const getPixel = (e: any): [number, number] => {
    const ov = overlayRef.current; if (!ov) return [-1, -1];
    const r = ov.getBoundingClientRect();
    return [Math.floor((e.clientX - r.left) / scale), Math.floor((e.clientY - r.top) / scale)];
  };

  const handleMouseDown = (e: any) => {
    const [px, py] = getPixel(e); const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext('2d')!;
    if (tool === 'pen' || tool === 'eraser') {
      setPainting(true); paintedRef.current = false;
      if (px < 0 || py < 0 || px >= c.width || py >= c.height) return;
      if (tool === 'eraser') ctx.clearRect(px, py, 1, 1); else { ctx.fillStyle = color; ctx.fillRect(px, py, 1, 1); }
      paintedRef.current = true; drawOverlayRef.current();
    } else if (tool === 'picker') {
      if (px < 0 || py < 0 || px >= c.width || py >= c.height) return;
      const d = ctx.getImageData(px, py, 1, 1).data;
      setColor(`#${[d[0], d[1], d[2]].map((v: number) => v.toString(16).padStart(2, '0')).join('')}`);
    } else if (tool === 'fill') {
      if (px < 0 || py < 0 || px >= c.width || py >= c.height) return;
      floodFill(ctx, px, py, color, c.width, c.height); pushHistory('Fill'); drawOverlayRef.current();
    } else if (tool === 'line' || tool === 'rect') {
      if (px < 0 || py < 0 || px >= c.width || py >= c.height) return;
      dragStartRef.current = { x: px, y: py }; baseSnapRef.current = ctx.getImageData(0, 0, c.width, c.height);
    } else if (tool === 'select') {
      selectionRef.current = null; setSelection(null); dragStartRef.current = { x: px, y: py }; drawOverlayRef.current();
    }
  };

  const handleMouseMove = (e: any) => {
    const [px, py] = getPixel(e); const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext('2d')!;
    if ((tool === 'pen' || tool === 'eraser') && painting) {
      if (px < 0 || py < 0 || px >= c.width || py >= c.height) return;
      if (tool === 'eraser') ctx.clearRect(px, py, 1, 1); else { ctx.fillStyle = color; ctx.fillRect(px, py, 1, 1); }
      paintedRef.current = true; drawOverlayRef.current();
    } else if ((tool === 'line' || tool === 'rect') && dragStartRef.current && baseSnapRef.current) {
      ctx.putImageData(baseSnapRef.current, 0, 0); ctx.fillStyle = color;
      const { x: sx, y: sy } = dragStartRef.current;
      const ex = Math.max(0, Math.min(c.width - 1, px)), ey = Math.max(0, Math.min(c.height - 1, py));
      if (tool === 'line') bresenhamLine(sx, sy, ex, ey, (x, y) => ctx.fillRect(x, y, 1, 1));
      else pixelRectOutline(sx, sy, ex, ey, c.width, c.height, (x, y) => ctx.fillRect(x, y, 1, 1));
      drawOverlayRef.current();
    } else if (tool === 'select' && dragStartRef.current) {
      const { x: sx, y: sy } = dragStartRef.current;
      const ex = Math.max(0, Math.min(c.width - 1, px)), ey = Math.max(0, Math.min(c.height - 1, py));
      drawOverlayRef.current(); drawSelMarqueeRef.current(sx, sy, ex, ey);
    }
  };

  const handleMouseUp = (e: any) => {
    const [px, py] = getPixel(e); const c = canvasRef.current; if (!c) return;
    if (tool === 'pen' || tool === 'eraser') {
      if (paintedRef.current) pushHistory(tool === 'eraser' ? 'Erase' : 'Pen stroke');
      paintedRef.current = false; setPainting(false);
    } else if ((tool === 'line' || tool === 'rect') && dragStartRef.current) {
      pushHistory(tool === 'line' ? 'Line' : 'Rectangle'); dragStartRef.current = null; baseSnapRef.current = null;
    } else if (tool === 'select' && dragStartRef.current) {
      const { x: sx, y: sy } = dragStartRef.current;
      const ex = Math.max(0, Math.min(c.width - 1, px)), ey = Math.max(0, Math.min(c.height - 1, py));
      const sel = { x1: Math.min(sx, ex), y1: Math.min(sy, ey), x2: Math.max(sx, ex), y2: Math.max(sy, ey) };
      selectionRef.current = sel; setSelection(sel); dragStartRef.current = null; drawOverlayRef.current();
    }
  };

  const handleMouseLeave = () => {
    if (tool === 'pen' || tool === 'eraser') {
      if (paintedRef.current) pushHistory();
      paintedRef.current = false; setPainting(false);
    }
  };

  const selFill = useCallback((fillColor: string) => {
    if (!selection) return; const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext('2d')!; ctx.fillStyle = fillColor;
    const w = selection.x2 - selection.x1 + 1, h = selection.y2 - selection.y1 + 1;
    ctx.fillRect(selection.x1, selection.y1, w, h); pushHistory('Fill selection'); drawOverlayRef.current();
  }, [selection, pushHistory]);

  const selClear = useCallback(() => {
    if (!selection) return; const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext('2d')!;
    const w = selection.x2 - selection.x1 + 1, h = selection.y2 - selection.y1 + 1;
    ctx.clearRect(selection.x1, selection.y1, w, h); pushHistory('Erase selection'); drawOverlayRef.current();
  }, [selection, pushHistory]);

  const selReplaceColor = useCallback(() => {
    if (!selection) return; const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext('2d')!;
    const img = ctx.getImageData(selection.x1, selection.y1, selection.x2 - selection.x1 + 1, selection.y2 - selection.y1 + 1);
    const d = img.data;
    const fr = parseInt(replaceFrom.slice(1, 3), 16), fg = parseInt(replaceFrom.slice(3, 5), 16), fb = parseInt(replaceFrom.slice(5, 7), 16);
    const tr = parseInt(replaceTo.slice(1, 3), 16), tg = parseInt(replaceTo.slice(3, 5), 16), tb = parseInt(replaceTo.slice(5, 7), 16);
    for (let i = 0; i < d.length; i += 4) {
      if (d[i] === fr && d[i + 1] === fg && d[i + 2] === fb && d[i + 3] > 0) { d[i] = tr; d[i + 1] = tg; d[i + 2] = tb; d[i + 3] = 255; }
    }
    ctx.putImageData(img, selection.x1, selection.y1); pushHistory('Replace color'); drawOverlayRef.current();
  }, [selection, replaceFrom, replaceTo, pushHistory]);

  const pickFromCanvas = (setter: (c: string) => void) => {
    setTool('picker');
    const once = (e: any) => {
      const ov = overlayRef.current; const c = canvasRef.current; if (!ov || !c) return;
      const r = ov.getBoundingClientRect();
      const px = Math.floor((e.clientX - r.left) / scale), py = Math.floor((e.clientY - r.top) / scale);
      if (px >= 0 && py >= 0 && px < c.width && py < c.height) {
        const d = c.getContext('2d')!.getImageData(px, py, 1, 1).data;
        setter(`#${[d[0], d[1], d[2]].map((v: number) => v.toString(16).padStart(2, '0')).join('')}`);
      }
      setTool('select'); overlayRef.current?.removeEventListener('click', once);
    };
    overlayRef.current?.addEventListener('click', once, { once: true });
  };

  const changeScale = (s: number) => { setScale(s); drawOverlay(s); };
  const BLOCK_PRESETS = [8, 16, 32, 64, 128, 256, 512];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
        {TOOLS.map((t) => (
          <button key={t.id} className={`rp-btn sm${tool === t.id ? ' active' : ''}`}
            onClick={() => { setTool(t.id); if (t.id !== 'select') { selectionRef.current = null; setSelection(null); drawOverlayRef.current(); } }}
          >{t.label}</button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        <input type="color" value={color} onChange={(e) => setColor(e.target.value)} style={{ width: 28, height: 26, padding: 2, background: BG3, border: `1px solid ${BORDER}`, cursor: 'pointer' }} />
        <span style={{ fontSize: 10, color: DIM }}>{color}</span>
        <button className={`rp-btn sm${showImport ? ' active' : ''}`} style={{ marginLeft: 4 }} onClick={() => { setShowImport((v) => !v); setImportSrc(null); importImgRef.current = null; }}>↑ Import</button>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 3 }}>
          {[2, 4, 8, 16].map((s) => <button key={s} className={`rp-btn sm${scale === s ? ' active' : ''}`} onClick={() => changeScale(s)}>{s}x</button>)}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 9, color: DIM, letterSpacing: '2px', textTransform: 'uppercase', flexShrink: 0 }}>Palette</span>
        <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap', flex: 1 }}>
          {palette.map((c, i) => (
            <div key={i} title={c || 'Empty — click active color to save'}
              onClick={() => { if (c) setColor(c); }}
              onContextMenu={(e) => { e.preventDefault(); if (c) { const np = [...palette]; np[i] = ''; setPalette(np); savePaletteStorage(np); } }}
              style={{ width: 16, height: 16, background: c || BG3, border: `1px solid ${c ? c + ' ' : BORDER}`, cursor: c ? 'pointer' : 'default', flexShrink: 0, boxSizing: 'border-box', outline: c === color ? `1px solid ${ACCENT}` : 'none', outlineOffset: 1 }}
            />
          ))}
        </div>
        <button className="rp-btn sm" title="Save current color to palette" onClick={() => {
          const empty = palette.findIndex((c) => !c); const idx = empty >= 0 ? empty : palette.length - 1;
          const np = [...palette]; np[idx] = color; setPalette(np); savePaletteStorage(np);
        }}>+ Save</button>
      </div>

      {showImport && (
        <div style={{ background: BG2, border: `1px solid ${BORDER}`, padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 9, color: DIM, letterSpacing: '2px', textTransform: 'uppercase' }}>Import image as texture</div>
          {!importSrc ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ border: `2px dashed ${BORDER}`, padding: '18px 24px', textAlign: 'center', cursor: 'pointer', color: DIM, fontSize: 11, width: '100%' }}
                onClick={() => importFileRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); (e.currentTarget as any).style.borderColor = ACCENT; }}
                onDragLeave={(e) => { (e.currentTarget as any).style.borderColor = BORDER; }}
                onDrop={(e) => { e.preventDefault(); (e.currentTarget as any).style.borderColor = BORDER; const f = e.dataTransfer.files[0]; if (f) { const r = new FileReader(); r.onload = (ev) => { const src = ev.target?.result as string; setImportSrc(src); const img = new Image(); img.onload = () => { importImgRef.current = img; renderImportPreview(img, pixelBlock); }; img.src = src; }; r.readAsDataURL(f); } }}
              >Drop image here or click to browse</div>
              <input ref={importFileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImportFile} />
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 10, color: TEXT2 }}>Block size (pixelation)</div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {BLOCK_PRESETS.map((b) => <button key={b} className={`rp-btn sm${pixelBlock === b ? ' active' : ''}`} onClick={() => setPixelBlock(b)}>{b}</button>)}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="range" min={8} max={512} step={1} value={pixelBlock} onChange={(e) => setPixelBlock(Number(e.target.value))} style={{ flex: 1, accentColor: ACCENT }} />
                <span style={{ fontSize: 11, color: ACCENT, minWidth: 36, textAlign: 'right' }}>{pixelBlock}px</span>
              </div>
              <div style={{ fontSize: 9, color: DIM, letterSpacing: '1px' }}>Preview</div>
              <div style={{ overflow: 'auto', maxHeight: compact ? 180 : 260, border: `1px solid ${BORDER}`, background: '#04060a', display: 'inline-block' }}>
                <canvas ref={previewRef} style={{ imageRendering: 'pixelated', display: 'block' }} />
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="rp-btn active" onClick={applyImport}>Apply to canvas</button>
                <button className="rp-btn sm" onClick={() => { setImportSrc(null); importImgRef.current = null; }}>← Back</button>
              </div>
            </div>
          )}
        </div>
      )}

      {selection && tool === 'select' && (
        <div style={{ background: BG2, border: `1px solid ${ACCENT2}44`, padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 9, color: ACCENT2, letterSpacing: '2px', textTransform: 'uppercase' }}>Selection</span>
            <span style={{ fontSize: 10, color: DIM }}>{selection.x2 - selection.x1 + 1}×{selection.y2 - selection.y1 + 1}px @ ({selection.x1},{selection.y1})</span>
            <button className="rp-btn sm" style={{ marginLeft: 'auto' }} onClick={() => { selectionRef.current = null; setSelection(null); drawOverlayRef.current(); }}>✕ Deselect</button>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <button className="rp-btn sm" onClick={() => selFill(color)}>Fill with color</button>
            <button className="rp-btn sm danger" onClick={selClear}>Erase</button>
          </div>
          <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 6, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontSize: 9, color: DIM, letterSpacing: '2px', textTransform: 'uppercase' }}>Replace color</div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'center' }}>
                <span style={{ fontSize: 9, color: DIM }}>From</span>
                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  <input type="color" value={replaceFrom} onChange={(e) => setReplaceFrom(e.target.value)} style={{ width: 26, height: 24, padding: 2, background: BG3, border: `1px solid ${BORDER}`, cursor: 'pointer' }} />
                  <button className="rp-btn sm" title="Pick from canvas" onClick={() => pickFromCanvas(setReplaceFrom)}>✦</button>
                </div>
              </div>
              <span style={{ fontSize: 14, color: DIM, marginTop: 12 }}>→</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'center' }}>
                <span style={{ fontSize: 9, color: DIM }}>To</span>
                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  <input type="color" value={replaceTo} onChange={(e) => setReplaceTo(e.target.value)} style={{ width: 26, height: 24, padding: 2, background: BG3, border: `1px solid ${BORDER}`, cursor: 'pointer' }} />
                  <button className="rp-btn sm" title="Pick from canvas" onClick={() => pickFromCanvas(setReplaceTo)}>✦</button>
                </div>
              </div>
              <button className="rp-btn sm apply" style={{ marginTop: 12 }} onClick={selReplaceColor}>Replace</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
        <button className="rp-btn sm" onClick={undo} disabled={!canUndo} title="Undo (Ctrl+Z)" style={{ opacity: canUndo ? 1 : 0.3, cursor: canUndo ? 'pointer' : 'default' }}>← Undo</button>
        <button className="rp-btn sm" onClick={redo} disabled={!canRedo} title="Redo (Ctrl+Shift+Z)" style={{ opacity: canRedo ? 1 : 0.3, cursor: canRedo ? 'pointer' : 'default' }}>Redo →</button>
        <span style={{ fontSize: 9, color: DIM, marginLeft: 2, letterSpacing: '1px' }}>{historyIdxRef.current + 1}/{historyRef.current.length}</span>
        <button className={`rp-btn sm${showHistory ? ' active' : ''}`} style={{ marginLeft: 'auto' }} onClick={() => setShowHistory((v) => !v)} title="History">⏱ History</button>
        <button className={`rp-btn sm${showShortcuts ? ' active' : ''}`} onClick={() => setShowShortcuts((v) => !v)} title="Keyboard shortcuts (?)">? Keys</button>
      </div>

      {showHistory && (
        <div style={{ background: BG2, border: `1px solid ${BORDER}`, maxHeight: 160, overflowY: 'auto', padding: '4px 0' }}>
          <div style={{ fontSize: 9, color: DIM, letterSpacing: '2px', textTransform: 'uppercase', padding: '4px 10px', borderBottom: `1px solid ${BORDER}` }}>Action History ({historyRef.current.length})</div>
          {historyRef.current.map((_, i) => (
            <div key={i} onClick={() => { const c = canvasRef.current; if (!c) return; historyIdxRef.current = i; c.getContext('2d')!.putImageData(historyRef.current[i], 0, 0); drawOverlayRef.current(); syncButtons(); }}
              style={{ padding: '3px 10px', fontSize: 10, cursor: 'pointer', background: historyIdxRef.current === i ? 'rgba(var(--accent-rgb),0.08)' : 'transparent', color: historyIdxRef.current === i ? ACCENT : DIM, borderLeft: historyIdxRef.current === i ? `2px solid ${ACCENT}` : '2px solid transparent' }}>
              {i === 0 ? 'Initial state' : historyLabelsRef.current[i] || `Step ${i}`}
            </div>
          ))}
        </div>
      )}

      {showShortcuts && (
        <div style={{ background: BG2, border: `1px solid ${BORDER}`, padding: '10px 12px' }}>
          <div style={{ fontSize: 9, color: DIM, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 8 }}>Keyboard Shortcuts</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 16px', fontSize: 10 }}>
            {[['B', 'Pen/Brush'], ['E', 'Eraser'], ['F', 'Fill'], ['L', 'Line'], ['R', 'Rectangle'], ['P', 'Color Picker'], ['S', 'Save to pack'], ['Ctrl+Z', 'Undo'], ['Ctrl+Shift+Z', 'Redo'], ['Esc', 'Deselect'], ['?', 'Toggle shortcuts']].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '2px 0' }}>
                <kbd style={{ background: BG3, border: `1px solid ${BORDER}`, padding: '1px 5px', fontSize: 9, color: ACCENT, minWidth: 24, textAlign: 'center', flexShrink: 0 }}>{k}</kbd>
                <span style={{ color: TEXT2 }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <canvas ref={canvasRef} style={{ display: 'none' }} />
      <div style={{ overflow: 'auto', maxHeight: compact ? 'calc(100vh - 280px)' : 'calc(100vh - 360px)', display: 'inline-block', maxWidth: '100%', border: `1px solid ${BORDER}`, background: '#04060a' }}>
        <canvas ref={overlayRef} style={{ imageRendering: 'pixelated', cursor: tool === 'select' ? 'crosshair' : tool === 'picker' ? 'cell' : 'crosshair', display: 'block' }}
          onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseLeave} />
      </div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <button className="rp-btn active" onClick={() => { const c = canvasRef.current; if (c) onSave(c.toDataURL('image/png')); }}>Save to pack</button>
        <span style={{ fontSize: 9, color: DIM, letterSpacing: '1px' }}>W: {overlayRef.current?.width / scale | 0}px · H: {overlayRef.current?.height / scale | 0}px</span>
      </div>
    </div>
  );
}

export function AudioPlayer({ dataUrl, name }: any) {
  const [playing, setPlaying] = useState(false); const [time, setTime] = useState(0); const [dur, setDur] = useState(0);
  const audRef = useRef<any>();
  const toggle = () => { const a = audRef.current; if (!a) return; if (playing) { a.pause(); setPlaying(false); } else { a.play(); setPlaying(true); } };
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 420 }}>
      <audio ref={audRef} src={dataUrl} onTimeUpdate={(e) => setTime((e.target as any).currentTime)} onLoadedMetadata={(e) => setDur((e.target as any).duration)} onEnded={() => setPlaying(false)} />
      <div style={{ background: BG2, border: `1px solid ${BORDER}`, padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ fontSize: 13, color: ACCENT2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>♪ {name}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button className={`rp-btn${playing ? ' active' : ''}`} onClick={toggle} style={{ width: 70 }}>{playing ? '■ Stop' : '▶ Play'}</button>
          <div style={{ flex: 1, height: 4, background: BORDER, cursor: 'pointer', position: 'relative' }} onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); const ratio = (e.clientX - r.left) / r.width; if (audRef.current) { audRef.current.currentTime = ratio * dur; setTime(ratio * dur); } }}>
            <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${dur ? time / dur * 100 : 0}%`, background: ACCENT2 }} />
          </div>
          <span style={{ fontSize: 11, color: DIM, minWidth: 72, textAlign: 'right' }}>{fmt(time)} / {fmt(dur || 0)}</span>
        </div>
      </div>
    </div>
  );
}

export function JsonEditor({ content, onChange }: any) {
  const [errors, setErrors] = useState<any[]>([]);
  const validate = (val: string) => { try { JSON.parse(val); setErrors([]); } catch (e: any) { const msg = e.message; const lm = msg.match(/line (\d+)/i); const cm = msg.match(/column (\d+)/i); setErrors([{ line: lm ? parseInt(lm[1]) : null, col: cm ? parseInt(cm[1]) : null, msg }]); } };
  const handle = (e: any) => { const v = e.target.value; onChange(v); validate(v); };
  const lines = ((content || '').match(/\n/g) || []).length + 1;
  const lineNums = Array.from({ length: lines }, (_, i) => i + 1).join('\n');
  return (
    <div style={{ maxWidth: 760 }}>
      {errors.map((e, i) => <div key={i} className="rp-errline">✕ {e.line ? `Line ${e.line}${e.col ? `, col ${e.col}` : ''}:` : ''} {e.msg}</div>)}
      <div className="rp-json-wrap">
        <div className="rp-linenums">{lineNums}</div>
        <textarea className={`rp-code${errors.length > 0 ? ' has-errors' : ''}`} value={content || ''} onChange={handle} spellCheck={false} />
      </div>
      {errors.length === 0 && content?.trim() && <div style={{ marginTop: 6, fontSize: 11, color: ACCENT }}>✓ Valid JSON</div>}
    </div>
  );
}

export function PackMetaEditor({ content, onChange }: any) {
  let parsed: any = {}; try { parsed = JSON.parse(content); } catch {}
  const desc = parsed?.pack?.description ?? ''; const fmt = parsed?.pack?.pack_format ?? 34;
  const upd = (field: string, val: any) => { const u = { ...parsed, pack: { ...parsed.pack, [field]: val } }; onChange(JSON.stringify(u, null, 2)); };
  return (
    <div style={{ maxWidth: 480 }}>
      <div className="rp-field"><label>Pack format</label><input type="number" value={fmt} onChange={(e) => upd('pack_format', parseInt(e.target.value) || 34)} /></div>
      <div className="rp-field"><label>Description</label><textarea value={desc} onChange={(e) => upd('description', e.target.value)} /></div>
      <div style={{ fontSize: 11, color: DIM }}>34 = 1.21 · 46 = 1.21.4 (item definitions) · 84 = 26.1 · 88 = 26.2. From 1.21.9 packs use min_format/max_format — edit those in the JSON tab.</div>
    </div>
  );
}

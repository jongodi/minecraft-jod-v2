'use client';

import { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { resolveModelGeometry, makeModelLookup } from './engine/model-geometry';
import { entityTemplateFor } from './engine/entity-models';
import { isVanillaTexturePath } from './engine/vanilla-manifest';

// Three.js BoxGeometry face order: +X(east), -X(west), +Y(up), -Y(down), +Z(south), -Z(north)
const FACE_ORDER = ['east', 'west', 'up', 'down', 'south', 'north'];

// A texture ref `ns:foo/bar` → assets/ns/textures/foo/bar.png (bare == minecraft).
function refToPackPath(ref: string): string {
  const i = ref.indexOf(':');
  const ns = i < 0 ? 'minecraft' : ref.slice(0, i);
  const p = (i < 0 ? ref : ref.slice(i + 1)).replace(/^textures\//, '').replace(/\.(png|jpg|jpeg)$/i, '');
  return `assets/${ns}/textures/${p}.png`;
}

// Default foliage tint for tintindex faces (grass/leaves/vines) — a preview tint.
const TINT = new THREE.Color(0x7cbd6b);

export default function ModelViewer3D({
  modelContent,
  fileData,
  texturePaths,
  revision,
  onSelectTexture,
  editable = false,
  entityTexture = null,
  onPaint,
  onPickColor,
  height = 300,
}: {
  modelContent: string;
  fileData: Record<string, string>;
  texturePaths: string[];
  revision: number;
  onSelectTexture?: (path: string) => void;
  editable?: boolean;
  entityTexture?: string | null;
  onPaint?: (path: string, dataUrl: string) => void;
  onPickColor?: (hex: string) => void;
  height?: number;
}) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<'rotate' | 'paint'>(editable ? 'paint' : 'rotate');
  const [color, setColor] = useState('#ffffff');
  const [brush, setBrush] = useState(1);
  const [tool, setTool] = useState<'pen' | 'eraser' | 'pick'>('pen');
  const camRef = useRef({ theta: 0.7, phi: 0.5, radius: 42, auto: !editable });

  // Keep latest paint settings available to the imperative three.js loop.
  const paintRef = useRef({ mode, color, brush, tool });
  paintRef.current = { mode, color, brush, tool };

  // ── Paint undo/redo ──────────────────────────────────────────────────────────
  // One snapshot per texture per stroke, stored as data URLs OUTSIDE the effect
  // (each save bumps `revision`, which rebuilds the scene — the history must
  // survive that). Undo restores the snapshot and persists it through onPaint,
  // so the saved pack state and the canvas stay in sync.
  const histRef = useRef<{ past: Array<{ path: string; data: string }>; future: Array<{ path: string; data: string }> }>({ past: [], future: [] });
  const [, setHistVer] = useState(0);      // re-render for button disabled states
  const bumpHist = () => setHistVer((v) => v + 1);
  const undoFnRef = useRef<() => void>(() => {});
  const redoFnRef = useRef<() => void>(() => {});
  const hover3dRef = useRef(false);

  const ciLookup = new Map<string, string>();
  for (const p of texturePaths) ciLookup.set(p.toLowerCase(), p);
  const resolveTexPath = (ref: string): string | null => {
    const target = refToPackPath(ref);
    if (fileData[target] != null) return target;
    return ciLookup.get(target.toLowerCase()) ?? null;
  };

  // ── Resolve geometry: model parent chain, or an entity template ─────────────
  let root: any = null;
  try { root = JSON.parse(modelContent); } catch {}
  const lookup = makeModelLookup(fileData);
  let geom = root ? resolveModelGeometry(root, lookup) : { elements: null, textures: {}, parentRef: null, isGenerated: false, textureSize: [16, 16] as [number, number] };
  let entityMode: { name: string; texPath: string } | null = null;

  if ((!geom.elements || geom.elements.length === 0)) {
    // No geometry from the model — try an entity template for the selected texture.
    const et = entityTexture ? entityTemplateFor(entityTexture) : null;
    if (et && entityTexture) {
      // Entity template UVs are already authored in the 0-16 model space.
      geom = { elements: et.elements, textures: { t: entityTexture }, parentRef: null, isGenerated: false, textureSize: [16, 16] };
      entityMode = { name: et.name, texPath: entityTexture };
    }
  }
  const elements = geom.elements ?? [];
  const modelTex: Record<string, string> = geom.textures ?? {};

  // UV normalization. Vanilla UVs live in a fixed 0-16 space no matter the texture
  // resolution; Blockbench can instead export them in the texture's pixel space
  // alongside `texture_size`. Detect the latter only when a UV actually exceeds 16,
  // so standard 0-16 models (incl. this pack's) always divide by 16 unchanged.
  const [tsW, tsH] = geom.textureSize ?? [16, 16];
  let maxUv = 0;
  for (const e of elements) {
    if (!e?.faces) continue;
    for (const fn of FACE_ORDER) {
      const uv = e.faces[fn]?.uv;
      if (Array.isArray(uv)) for (const n of uv) if (typeof n === 'number' && n > maxUv) maxUv = n;
    }
  }
  const pixelSpace = maxUv > 16.0001 && (tsW !== 16 || tsH !== 16);
  const uDiv = pixelSpace ? tsW : 16;
  const vDiv = pixelSpace ? tsH : 16;

  // Resolve a texture variable (#ref chain) to a pack path.
  function resolveVarToPath(ref: string, depth = 0): string | null {
    if (depth > 8 || !ref) return null;
    // Entity templates map every face to the single entity texture (a real path).
    if (entityMode && (ref === '#t' || ref === 't')) return entityMode.texPath;
    if (ref.startsWith('#')) {
      const next = modelTex[ref.slice(1)];
      return next ? resolveVarToPath(next, depth + 1) : null;
    }
    if (fileData[ref] != null) return ref; // already a concrete pack path
    return resolveTexPath(ref);
  }

  // Resolve a texture variable to its concrete resource location (no pack check).
  function resolveVarToRef(ref: string, depth = 0): string | null {
    if (depth > 8 || !ref) return null;
    if (ref.startsWith('#')) {
      const next = modelTex[ref.slice(1)];
      return next ? resolveVarToRef(next, depth + 1) : null;
    }
    return ref;
  }

  // Is this ref a vanilla texture the pack just doesn't override (vs. broken)?
  function isVanillaTextureRef(ref: string): boolean {
    const i = ref.indexOf(':');
    if (i >= 0 && ref.slice(0, i) !== 'minecraft') return false;
    return isVanillaTexturePath((i >= 0 ? ref.slice(i + 1) : ref).replace(/^textures\//, ''));
  }

  // Texture slots for the edit strip.
  const texSlots = Object.entries(modelTex)
    .filter(([, v]) => typeof v === 'string' && !(v as string).startsWith('#'))
    .map(([k, v]) => {
      const packPath = entityMode ? (k === 't' ? entityMode.texPath : resolveTexPath(v as string)) : resolveTexPath(v as string);
      return { key: k, value: v as string, packPath, dataUrl: packPath ? (fileData[packPath] ?? null) : null };
    });

  useEffect(() => {
    if (!mountRef.current || elements.length === 0) return;
    const el = mountRef.current;
    const W = el.clientWidth || 420, H = el.clientHeight || 380;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x090c10);
    const grid = new THREE.GridHelper(32, 8, 0x1a1e26, 0x111418);
    grid.position.set(8, -0.01, 8);
    scene.add(grid);
    scene.add(new THREE.AmbientLight(0xffffff, 0.82));
    const sun = new THREE.DirectionalLight(0xffffff, 0.55); sun.position.set(20, 40, 20); scene.add(sun);
    const fill = new THREE.DirectionalLight(0x8899ff, 0.18); fill.position.set(-10, 10, -10); scene.add(fill);

    const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 500);
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W, H);
    el.appendChild(renderer.domElement);

    // ── Per-texture editable canvases (shared across faces) ───────────────────
    // `strip` holds the full frame strip for animated textures: the visible canvas
    // shows (and paints) only frame 0 — how the game maps model UVs — and saves
    // composite the edited frame back into the strip so no frames are lost.
    interface TexEntry { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D; tex: THREE.CanvasTexture; path: string; loaded: boolean; strip?: HTMLCanvasElement }
    const texCache = new Map<string, TexEntry>();
    const emitTimers = new Map<string, any>();
    // First-frame height for an animated texture (mcmeta-driven only, so tall
    // non-animated art like paintings is never cropped).
    function frameHeightFor(path: string, w: number, h: number): number {
      const meta = fileData[path + '.mcmeta'];
      if (!meta || typeof meta !== 'string') return h;
      try {
        const anim = JSON.parse(meta)?.animation;
        if (!anim || typeof anim !== 'object') return h;
        const fh = typeof anim.height === 'number' && anim.height > 0 ? anim.height : w;
        return fh < h ? fh : h;
      } catch { return h; }
    }
    function getTexEntry(path: string): TexEntry {
      const hit = texCache.get(path);
      if (hit) return hit;
      const canvas = document.createElement('canvas');
      canvas.width = 16; canvas.height = 16;
      const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
      const tex = new THREE.CanvasTexture(canvas);
      tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter; tex.colorSpace = THREE.SRGBColorSpace;
      const entry: TexEntry = { canvas, ctx, tex, path, loaded: false };
      texCache.set(path, entry);
      const url = fileData[path];
      if (url) {
        const img = new Image();
        img.onload = () => {
          const w = img.naturalWidth || 16, h = img.naturalHeight || 16;
          const fh = frameHeightFor(path, w, h);
          const resized = w !== canvas.width || fh !== canvas.height;
          canvas.width = w; canvas.height = fh;
          ctx.imageSmoothingEnabled = false; ctx.clearRect(0, 0, w, fh);
          ctx.drawImage(img, 0, 0, w, fh, 0, 0, w, fh);
          if (fh !== h) {
            const strip = document.createElement('canvas');
            strip.width = w; strip.height = h;
            const sctx = strip.getContext('2d')!;
            sctx.imageSmoothingEnabled = false; sctx.drawImage(img, 0, 0);
            entry.strip = strip;
          }
          entry.loaded = true;
          // A canvas resize needs a full GPU re-upload, or three.js keeps the old
          // (blank) dimensions and the surface samples as transparent.
          if (resized) tex.dispose();
          tex.needsUpdate = true;
        };
        img.src = url;
      }
      return entry;
    }
    function emitPaint(path: string) {
      if (!onPaint) return;
      clearTimeout(emitTimers.get(path));
      emitTimers.set(path, setTimeout(() => {
        const e = texCache.get(path); if (!e) return;
        let out = e.canvas;
        if (e.strip) {
          const sctx = e.strip.getContext('2d')!;
          sctx.imageSmoothingEnabled = false;
          sctx.clearRect(0, 0, e.canvas.width, e.canvas.height);
          sctx.drawImage(e.canvas, 0, 0);
          out = e.strip;
        }
        onPaint(path, out.toDataURL('image/png'));
      }, 260));
    }

    const MISSING = new THREE.MeshLambertMaterial({ color: 0xee44ee, transparent: true, opacity: 0.75 });
    const EMPTY = new THREE.MeshLambertMaterial({ color: 0x111318, transparent: true, opacity: 0.12 });
    // A face whose texture is a vanilla asset the pack simply doesn't override —
    // neutral wood-grey, not the magenta "broken reference" alarm.
    const VANILLA = new THREE.MeshLambertMaterial({ color: 0x8a8378 });
    function makeMat(face: any): THREE.MeshLambertMaterial {
      if (!face?.texture) return EMPTY;
      const path = resolveVarToPath(face.texture);
      if (!path || fileData[path] == null) {
        const ref = resolveVarToRef(face.texture);
        return ref && isVanillaTextureRef(ref) ? VANILLA : MISSING;
      }
      const entry = getTexEntry(path);
      const mat = new THREE.MeshLambertMaterial({ map: entry.tex, transparent: true, alphaTest: 0.02 });
      if (typeof face.tintindex === 'number' && face.tintindex >= 0) mat.color = TINT.clone();
      mat.userData = { texPath: path };
      return mat;
    }

    const group = new THREE.Group();
    scene.add(group);
    const meshes: THREE.Mesh[] = [];

    for (const e of elements) {
      const [fx, fy, fz] = e.from as number[];
      const [tx, ty, tz] = e.to as number[];
      const [w, h, d] = [tx - fx, ty - fy, tz - fz];
      // Zero-thickness elements are real geometry (cross-plants, crops, chains
      // are flat planes) — only inverted or fully-degenerate boxes are skipped.
      if (w < 0 || h < 0 || d < 0) continue;
      if ([w, h, d].filter((v) => v === 0).length >= 2) continue;
      const geo = new THREE.BoxGeometry(w, h, d);
      const uvA = geo.attributes.uv as THREE.BufferAttribute;
      FACE_ORDER.forEach((fn, fi) => {
        const face = e.faces?.[fn];
        // Default UVs derived from element geometry when a face omits uv.
        const defUv = defaultFaceUv(fn, fx, fy, fz, tx, ty, tz);
        const [mu1, mv1, mu2, mv2]: number[] = face?.uv ?? defUv;
        const u1 = mu1 / uDiv, u2 = mu2 / uDiv, v1 = 1 - mv2 / vDiv, v2 = 1 - mv1 / vDiv;
        let pts: [number, number][] = [[u1, v2], [u2, v2], [u1, v1], [u2, v1]];
        const rot = (((face?.rotation ?? 0) / 90) % 4 + 4) % 4;
        for (let r = 0; r < rot; r++) { const [tl, tr, bl, br] = pts; pts = [bl, tl, br, tr]; }
        const b = fi * 4;
        pts.forEach(([u, v], i) => uvA.setXY(b + i, u, v));
      });
      uvA.needsUpdate = true;
      const mesh = new THREE.Mesh(geo, FACE_ORDER.map((fn) => makeMat(e.faces?.[fn])));
      const cx = (fx + tx) / 2, cy = (fy + ty) / 2, cz = (fz + tz) / 2;
      const er = elementRotation(e.rotation);
      if (er) {
        const { origin, rx, ry, rz } = er;
        const pivot = new THREE.Group();
        pivot.position.set(origin[0], origin[1], origin[2]);
        mesh.position.set(cx - origin[0], cy - origin[1], cz - origin[2]);
        // Minecraft and three.js share handedness (right-handed, +X east/+Y up/+Z
        // south) under this direct coordinate mapping, so degrees map straight
        // through with no axis flip.
        pivot.rotation.set(
          THREE.MathUtils.degToRad(rx), THREE.MathUtils.degToRad(ry), THREE.MathUtils.degToRad(rz));
        // Vanilla `rescale` stretches the element so its rotated span still fills
        // the block — how crossed plants reach corner to corner.
        if (er.rescale && er.axis && er.angle) {
          const f = 1 / Math.cos(THREE.MathUtils.degToRad(Math.min(Math.abs(er.angle), 45)));
          if (er.axis === 'x') pivot.scale.set(1, f, f);
          else if (er.axis === 'y') pivot.scale.set(f, 1, f);
          else pivot.scale.set(f, f, 1);
        }
        pivot.add(mesh); group.add(pivot);
      } else {
        mesh.position.set(cx, cy, cz); group.add(mesh);
      }
      meshes.push(mesh);
    }

    // ── Camera (preserved across rebuilds) ────────────────────────────────────
    const cam = camRef.current;
    const C = new THREE.Vector3(8, 8, 8);
    function moveCam() {
      camera.position.set(
        C.x + cam.radius * Math.cos(cam.phi) * Math.sin(cam.theta),
        C.y + cam.radius * Math.sin(cam.phi),
        C.z + cam.radius * Math.cos(cam.phi) * Math.cos(cam.theta));
      camera.lookAt(C);
    }
    moveCam();

    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    function paintAt(clientX: number, clientY: number) {
      const r = renderer.domElement.getBoundingClientRect();
      ndc.x = ((clientX - r.left) / r.width) * 2 - 1;
      ndc.y = -((clientY - r.top) / r.height) * 2 + 1;
      raycaster.setFromCamera(ndc, camera);
      const hits = raycaster.intersectObjects(meshes, false);
      if (!hits.length) return;
      const hit = hits[0];
      const hitMesh = hit.object as THREE.Mesh;
      const mat = Array.isArray(hitMesh.material)
        ? hitMesh.material[(hit.face as any)?.materialIndex ?? 0]
        : hitMesh.material;
      const path = (mat as any)?.userData?.texPath as string | undefined;
      if (!path || !hit.uv) return;
      const entry = texCache.get(path); if (!entry) return;
      const { canvas, ctx, tex } = entry;
      const px = Math.floor(hit.uv.x * canvas.width);
      const py = Math.floor((1 - hit.uv.y) * canvas.height);
      const { color: col, brush: bs, tool: tl } = paintRef.current;
      if (tl === 'pick') {
        const d = ctx.getImageData(Math.max(0, Math.min(canvas.width - 1, px)), Math.max(0, Math.min(canvas.height - 1, py)), 1, 1).data;
        const hex = `#${[d[0], d[1], d[2]].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
        setColor(hex); onPickColor?.(hex); return;
      }
      // First time this stroke touches this texture: snapshot it for undo.
      if (!strokeTouched.has(path)) {
        strokeTouched.add(path);
        histRef.current.past.push({ path, data: canvas.toDataURL('image/png') });
        if (histRef.current.past.length > 50) histRef.current.past.shift();
        histRef.current.future.length = 0;
        bumpHist();
      }
      const half = Math.floor(bs / 2);
      for (let dx = -half; dx <= bs - 1 - half; dx++) for (let dy = -half; dy <= bs - 1 - half; dy++) {
        const x = px + dx, y = py + dy;
        if (x < 0 || y < 0 || x >= canvas.width || y >= canvas.height) continue;
        if (tl === 'eraser') ctx.clearRect(x, y, 1, 1);
        else { ctx.fillStyle = col; ctx.fillRect(x, y, 1, 1); }
      }
      tex.needsUpdate = true;
      emitPaint(path);
    }

    // ── Undo/redo (per-stroke snapshots; persists through onPaint so the saved
    // pack state, this canvas, and the 2D painter all agree) ───────────────────
    const strokeTouched = new Set<string>();
    function applySnapshot(path: string, dataUrl: string) {
      // A pending debounced save for this path would overwrite the revert.
      clearTimeout(emitTimers.get(path));
      const entry = texCache.get(path);
      if (entry) {
        const img = new Image();
        img.onload = () => {
          entry.ctx.imageSmoothingEnabled = false;
          entry.ctx.clearRect(0, 0, entry.canvas.width, entry.canvas.height);
          entry.ctx.drawImage(img, 0, 0);
          entry.tex.needsUpdate = true;
        };
        img.src = dataUrl;
      }
      onPaint?.(path, dataUrl);
    }
    // The live canvas is fresher than fileData while a save is still debounced.
    const currentState = (path: string): string | undefined =>
      texCache.get(path)?.canvas.toDataURL('image/png') ?? fileData[path];
    const doUndo = () => {
      const op = histRef.current.past.pop();
      if (!op) return;
      const cur = currentState(op.path);
      if (cur) histRef.current.future.push({ path: op.path, data: cur });
      applySnapshot(op.path, op.data);
      bumpHist();
    };
    const doRedo = () => {
      const op = histRef.current.future.pop();
      if (!op) return;
      const cur = currentState(op.path);
      if (cur) histRef.current.past.push({ path: op.path, data: cur });
      applySnapshot(op.path, op.data);
      bumpHist();
    };
    undoFnRef.current = doUndo;
    redoFnRef.current = doRedo;

    // Ctrl/Cmd+Z over the 3D view — capture phase, so the 2D painter's global
    // shortcut doesn't also fire while the cursor is on the model.
    const onEnter = () => { hover3dRef.current = true; };
    const onLeave = () => { hover3dRef.current = false; };
    const onKey = (e: KeyboardEvent) => {
      if (!editable || !hover3dRef.current) return;
      if (!(e.ctrlKey || e.metaKey)) return;
      const k = e.key.toLowerCase();
      if (k === 'z' && !e.shiftKey) { e.preventDefault(); e.stopPropagation(); doUndo(); }
      else if (k === 'y' || (k === 'z' && e.shiftKey)) { e.preventDefault(); e.stopPropagation(); doRedo(); }
    };
    el.addEventListener('mouseenter', onEnter);
    el.addEventListener('mouseleave', onLeave);
    window.addEventListener('keydown', onKey, true);

    let dragging = false, painting = false, px = 0, py = 0;
    const onDown = (ev: MouseEvent) => {
      if (editable && paintRef.current.mode === 'paint') {
        strokeTouched.clear();
        painting = true; cam.auto = false; paintAt(ev.clientX, ev.clientY);
      } else {
        dragging = true; px = ev.clientX; py = ev.clientY; cam.auto = false; renderer.domElement.style.cursor = 'grabbing';
      }
    };
    const onMove = (ev: MouseEvent) => {
      if (painting) { paintAt(ev.clientX, ev.clientY); return; }
      if (!dragging) return;
      cam.theta -= (ev.clientX - px) * 0.008;
      cam.phi = Math.max(-1.4, Math.min(1.4, cam.phi + (ev.clientY - py) * 0.008));
      px = ev.clientX; py = ev.clientY; moveCam();
    };
    const onUp = () => { dragging = false; painting = false; renderer.domElement.style.cursor = editable && paintRef.current.mode === 'paint' ? 'crosshair' : 'grab'; };
    const onWheel = (ev: WheelEvent) => { ev.preventDefault(); cam.radius = Math.max(12, Math.min(100, cam.radius + ev.deltaY * 0.04)); moveCam(); };

    renderer.domElement.style.cursor = editable && paintRef.current.mode === 'paint' ? 'crosshair' : 'grab';
    renderer.domElement.addEventListener('mousedown', onDown);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    renderer.domElement.addEventListener('wheel', onWheel, { passive: false });

    let raf = 0;
    const tick = () => { raf = requestAnimationFrame(tick); if (cam.auto) { cam.theta += 0.005; moveCam(); } renderer.render(scene, camera); };
    tick();
    const obs = new ResizeObserver(() => { const w2 = el.clientWidth, h2 = el.clientHeight; if (w2 && h2) { camera.aspect = w2 / h2; camera.updateProjectionMatrix(); renderer.setSize(w2, h2); } });
    obs.observe(el);

    return () => {
      cancelAnimationFrame(raf); obs.disconnect();
      emitTimers.forEach((t) => clearTimeout(t));
      renderer.domElement.removeEventListener('mousedown', onDown);
      window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp);
      window.removeEventListener('keydown', onKey, true);
      el.removeEventListener('mouseenter', onEnter); el.removeEventListener('mouseleave', onLeave);
      renderer.domElement.removeEventListener('wheel', onWheel);
      renderer.dispose(); texCache.forEach((e) => e.tex.dispose());
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelContent, entityTexture, revision]);

  const DIM = 'var(--ink-faint)', BORDER = 'var(--hair)', ACCENT = 'var(--accent)', TEXT2 = '#8b93a7';

  if (elements.length === 0) {
    const isItem = geom.isGenerated;
    const firstTex = texSlots.find((s) => s.dataUrl)?.dataUrl ?? null;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 180, color: DIM, gap: 8, fontSize: 12, border: `1px solid ${BORDER}`, borderRadius: 8, background: '#090c10' }}>
          <span style={{ fontSize: 24 }}>{isItem ? '◈' : '⬡'}</span>
          <div style={{ textAlign: 'center', lineHeight: 1.6 }}>
            {isItem ? '2D item sprite — edit it in the painter' : 'No geometry (parent/entity model not resolved)'}
          </div>
        </div>
        {isItem && firstTex && <img src={firstTex} style={{ imageRendering: 'pixelated', border: `1px solid ${BORDER}`, width: 64, height: 64, objectFit: 'contain', background: '#070910' }} alt="item" />}
      </div>
    );
  }

  return (
    <div>
      {editable && (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
          <button className={`rp-btn sm${mode === 'paint' ? ' active' : ''}`} onClick={() => setMode('paint')}>✎ Paint</button>
          <button className={`rp-btn sm${mode === 'rotate' ? ' active' : ''}`} onClick={() => setMode('rotate')}>⟳ Rotate</button>
          <span style={{ width: 1, height: 18, background: BORDER, margin: '0 3px' }} />
          {(['pen', 'eraser', 'pick'] as const).map((t) => (
            <button key={t} className={`rp-btn sm${tool === t ? ' active' : ''}`} onClick={() => { setTool(t); setMode('paint'); }}>{t === 'pen' ? '✏' : t === 'eraser' ? '◻' : '✦'}</button>
          ))}
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} style={{ width: 26, height: 24, padding: 2, background: 'var(--bg-card)', border: `1px solid ${BORDER}`, cursor: 'pointer' }} />
          {[1, 2, 3].map((b) => <button key={b} className={`rp-btn sm${brush === b ? ' active' : ''}`} onClick={() => setBrush(b)}>{b}px</button>)}
          <span style={{ width: 1, height: 18, background: BORDER, margin: '0 3px' }} />
          <button className="rp-btn sm" title="Undo (Ctrl+Z)" disabled={histRef.current.past.length === 0} onClick={() => undoFnRef.current()}>↶</button>
          <button className="rp-btn sm" title="Redo (Ctrl+Shift+Z)" disabled={histRef.current.future.length === 0} onClick={() => redoFnRef.current()}>↷</button>
        </div>
      )}
      <div style={{ position: 'relative', width: '100%', height, border: `1px solid ${BORDER}`, borderRadius: 8, overflow: 'hidden' }}>
        <div ref={mountRef} style={{ width: '100%', height: '100%' }} />
        <div style={{ position: 'absolute', top: 8, left: 8, fontSize: 9, color: '#556', letterSpacing: '1px', background: 'rgba(9,12,16,0.7)', padding: '2px 6px', borderRadius: 4 }}>
          {editable && mode === 'paint' ? 'CLICK/DRAG TO PAINT · CTRL+Z UNDO · ⟳ TO ROTATE' : 'DRAG TO ROTATE · SCROLL TO ZOOM'}
        </div>
        {entityMode && <div style={{ position: 'absolute', top: 8, right: 8, fontSize: 9, color: 'var(--sev-warning)', letterSpacing: '1px', background: 'rgba(9,12,16,0.7)', padding: '2px 6px', borderRadius: 4 }}>{entityMode.name.toUpperCase()} · APPROX</div>}
      </div>

      {texSlots.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: 9, color: DIM, letterSpacing: '3px', textTransform: 'uppercase', marginBottom: 8 }}>Textures in this model</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {texSlots.map(({ key, value, dataUrl, packPath }) => (
              <div key={key} onClick={() => packPath && onSelectTexture?.(packPath)}
                title={`${key}: ${value}${packPath ? '\nClick to edit texture' : '\n(not found in pack)'}`}
                style={{ cursor: packPath ? 'pointer' : 'default', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, background: '#0d0f12', border: `1px solid ${packPath ? BORDER : '#3a1a1a'}`, borderRadius: 6, padding: '6px 8px', width: 60 }}>
                {dataUrl ? <img src={dataUrl} style={{ width: 30, height: 30, imageRendering: 'pixelated', objectFit: 'contain' }} alt={key} />
                  : <div style={{ width: 30, height: 30, background: '#1a0a0a', border: '1px solid #3a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: '#f87171' }}>✕</div>}
                <div style={{ fontSize: 8, color: dataUrl ? TEXT2 : '#f87171', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 52 }}>#{key}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Normalize an element `rotation` into euler degrees + origin, accepting both the
// vanilla single-axis form `{ axis, angle, origin, rescale? }` and the Blockbench
// free-rotation form `{ x, y, z, origin }`. Returns null when there is no rotation.
function elementRotation(rot: any): { origin: number[]; rx: number; ry: number; rz: number; axis?: string; angle?: number; rescale?: boolean } | null {
  if (!rot || typeof rot !== 'object') return null;
  const origin = Array.isArray(rot.origin) ? rot.origin : [8, 8, 8];
  let rx = 0, ry = 0, rz = 0;
  let axis: string | undefined, angle: number | undefined;
  if (typeof rot.axis === 'string') {
    const a = typeof rot.angle === 'number' ? rot.angle : 0;
    axis = rot.axis; angle = a;
    if (rot.axis === 'x') rx = a; else if (rot.axis === 'y') ry = a; else if (rot.axis === 'z') rz = a;
  } else {
    if (typeof rot.x === 'number') rx = rot.x;
    if (typeof rot.y === 'number') ry = rot.y;
    if (typeof rot.z === 'number') rz = rot.z;
  }
  if (rx === 0 && ry === 0 && rz === 0) return null;
  return { origin, rx, ry, rz, axis, angle, rescale: rot.rescale === true };
}

// Default UV for a face when the model omits `uv`, derived from element bounds.
function defaultFaceUv(fn: string, fx: number, fy: number, fz: number, tx: number, ty: number, tz: number): number[] {
  switch (fn) {
    case 'up': return [fx, fz, tx, tz];
    case 'down': return [fx, fz, tx, tz];
    case 'north': return [16 - tx, 16 - ty, 16 - fx, 16 - fy];
    case 'south': return [fx, 16 - ty, tx, 16 - fy];
    case 'west': return [fz, 16 - ty, tz, 16 - fy];
    case 'east': return [16 - tz, 16 - ty, 16 - fz, 16 - fy];
    default: return [0, 0, 16, 16];
  }
}

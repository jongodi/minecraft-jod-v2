'use client';

import { useRef, useEffect } from 'react';
import * as THREE from 'three';

// Three.js BoxGeometry face order: +X(east), -X(west), +Y(up), -Y(down), +Z(south), -Z(north)
const FACE_ORDER = ['east','west','up','down','south','north'];

function normPath(p: string) {
  return p.replace(/^minecraft:/,'').replace(/^assets\/[^/]+\/textures\//,'').replace(/\.(png|jpg|jpeg)$/i,'').toLowerCase();
}

export default function ModelViewer3D({
  modelContent,
  fileData,
  texturePaths,
  revision,
  onSelectTexture,
}: {
  modelContent: string;
  fileData: Record<string,string>;
  texturePaths: string[];
  revision: number;
  onSelectTexture?: (path: string) => void;
}) {
  const mountRef = useRef<HTMLDivElement>(null);

  let model: any = null;
  try { model = JSON.parse(modelContent); } catch {}
  const elements: any[] = model?.elements ?? [];
  const modelTex: Record<string,string> = model?.textures ?? {};

  // Build normalized pack texture lookup
  const texLookup = new Map<string,string>();
  for (const p of texturePaths) {
    const n = normPath(p);
    texLookup.set(n, p);
    if (n.startsWith('textures/')) texLookup.set(n.slice(9), p);
    else texLookup.set('textures/'+n, p);
  }

  function resolveRef(ref: string, depth = 0): string | null {
    if (depth > 6 || !ref) return null;
    if (ref.startsWith('#')) {
      const next = modelTex[ref.slice(1)];
      return next ? resolveRef(next, depth+1) : null;
    }
    const n = normPath(ref);
    const path = texLookup.get(n) ?? texLookup.get('textures/'+n) ?? null;
    return path ? (fileData[path] ?? null) : null;
  }

  // Texture slots for the "edit" strip below the viewer
  const texSlots: {key: string; value: string; dataUrl: string | null; packPath: string | null}[] = 
    Object.entries(modelTex)
      .filter(([, v]) => typeof v === 'string' && !v.startsWith('#'))
      .map(([k, v]) => {
        const dataUrl = resolveRef(v);
        const n = normPath(v);
        const packPath = texLookup.get(n) ?? texLookup.get('textures/'+n) ?? null;
        return { key: k, value: v, dataUrl, packPath };
      });

  useEffect(() => {
    if (!mountRef.current || elements.length === 0) return;
    const el = mountRef.current;
    const W = el.clientWidth || 420;
    const H = el.clientHeight || 380;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x090c10);

    const grid = new THREE.GridHelper(32, 8, 0x1a1e26, 0x111418);
    grid.position.set(8, -0.01, 8);
    scene.add(grid);

    scene.add(new THREE.AmbientLight(0xffffff, 0.75));
    const sun = new THREE.DirectionalLight(0xffffff, 0.6);
    sun.position.set(20, 40, 20);
    scene.add(sun);
    const fill = new THREE.DirectionalLight(0x8899ff, 0.2);
    fill.position.set(-10, 10, -10);
    scene.add(fill);

    const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 500);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W, H);
    el.appendChild(renderer.domElement);

    // Texture cache
    const cache = new Map<string, THREE.Texture>();
    function getTex(ref: string): THREE.Texture | null {
      const url = resolveRef(ref);
      if (!url) return null;
      if (cache.has(url)) return cache.get(url)!;
      const img = new Image();
      img.src = url;
      const t = new THREE.Texture(img);
      t.magFilter = THREE.NearestFilter;
      t.minFilter = THREE.NearestFilter;
      img.onload = () => { t.needsUpdate = true; };
      cache.set(url, t);
      return t;
    }

    function makeMat(face: any): THREE.MeshLambertMaterial {
      if (!face?.texture) return new THREE.MeshLambertMaterial({ color: 0x111318, transparent: true, opacity: 0.15 });
      const t = getTex(face.texture);
      if (!t) return new THREE.MeshLambertMaterial({ color: 0xee44ee, transparent: true, opacity: 0.75 });
      return new THREE.MeshLambertMaterial({ map: t, transparent: true, alphaTest: 0.05 });
    }

    const group = new THREE.Group();
    scene.add(group);

    for (const e of elements) {
      const [fx, fy, fz] = e.from as number[];
      const [tx, ty, tz] = e.to as number[];
      const [w, h, d] = [tx-fx, ty-fy, tz-fz];
      if (w<=0 || h<=0 || d<=0) continue;

      const geo = new THREE.BoxGeometry(w, h, d);
      const uvA = geo.attributes.uv as THREE.BufferAttribute;

      FACE_ORDER.forEach((fn, fi) => {
        const face = e.faces?.[fn];
        if (!face) return;
        const [mu1, mv1, mu2, mv2]: number[] = face.uv ?? [0,0,16,16];
        // MC UV: origin top-left, 0-16. Three.js UV: origin bottom-left, 0-1.
        const u1=mu1/16, u2=mu2/16, v1=1-mv2/16, v2=1-mv1/16;
        // BoxGeometry UV order per face: vertex0=(u1,v2)TL, vertex1=(u2,v2)TR, vertex2=(u1,v1)BL, vertex3=(u2,v1)BR
        let pts: [number,number][] = [[u1,v2],[u2,v2],[u1,v1],[u2,v1]];
        const rot = ((face.rotation ?? 0) / 90) % 4;
        for (let r = 0; r < rot; r++) {
          const [tl, tr, bl, br] = pts;
          pts = [bl, tl, br, tr]; // 90° CW UV rotation
        }
        const b = fi * 4;
        pts.forEach(([u,v], i) => uvA.setXY(b+i, u, v));
      });
      uvA.needsUpdate = true;

      const mesh = new THREE.Mesh(geo, FACE_ORDER.map(fn => makeMat(e.faces?.[fn])));

      if (e.rotation) {
        const { origin, axis, angle } = e.rotation as any;
        const pivot = new THREE.Group();
        pivot.position.set(origin[0], origin[1], origin[2]);
        mesh.position.set((fx+tx)/2-origin[0], (fy+ty)/2-origin[1], (fz+tz)/2-origin[2]);
        const rad = THREE.MathUtils.degToRad(angle);
        if (axis==='x') pivot.rotation.x = rad;
        else if (axis==='y') pivot.rotation.y = -rad;
        else if (axis==='z') pivot.rotation.z = rad;
        pivot.add(mesh); group.add(pivot);
      } else {
        mesh.position.set((fx+tx)/2, (fy+ty)/2, (fz+tz)/2);
        group.add(mesh);
      }
    }

    // Orbit controls
    let dragging=false, px=0, py=0;
    let theta=0.7, phi=0.5, radius=42;
    let autoRotate=true;
    const C = new THREE.Vector3(8, 8, 8);

    function moveCam() {
      camera.position.set(
        C.x + radius*Math.cos(phi)*Math.sin(theta),
        C.y + radius*Math.sin(phi),
        C.z + radius*Math.cos(phi)*Math.cos(theta)
      );
      camera.lookAt(C);
    }
    moveCam();

    const onDown = (e: MouseEvent) => { dragging=true; px=e.clientX; py=e.clientY; autoRotate=false; renderer.domElement.style.cursor='grabbing'; };
    const onMove = (e: MouseEvent) => {
      if (!dragging) return;
      theta -= (e.clientX-px)*0.008;
      phi = Math.max(-1.4, Math.min(1.4, phi+(e.clientY-py)*0.008));
      px=e.clientX; py=e.clientY;
      moveCam();
    };
    const onUp = () => { dragging=false; renderer.domElement.style.cursor='grab'; };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      radius = Math.max(12, Math.min(100, radius+e.deltaY*0.04));
      moveCam();
    };

    renderer.domElement.style.cursor = 'grab';
    renderer.domElement.addEventListener('mousedown', onDown);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    renderer.domElement.addEventListener('wheel', onWheel, { passive: false });

    let raf: number;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      if (autoRotate) { theta+=0.005; moveCam(); }
      renderer.render(scene, camera);
    };
    tick();

    const obs = new ResizeObserver(() => {
      const w2=el.clientWidth, h2=el.clientHeight;
      camera.aspect=w2/h2; camera.updateProjectionMatrix(); renderer.setSize(w2,h2);
    });
    obs.observe(el);

    return () => {
      cancelAnimationFrame(raf);
      obs.disconnect();
      renderer.domElement.removeEventListener('mousedown', onDown);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      renderer.domElement.removeEventListener('wheel', onWheel);
      renderer.dispose();
      cache.forEach(t => t.dispose());
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelContent, revision]);

  const BG="#0d0f12"; const BORDER="#2a3040"; const DIM="#4a5568"; const TEXT2="#94a3b8"; const ACCENT="#4ade80"; const ACCENT2="#22d3ee"; const WARN="#f59e0b";

  if (elements.length === 0) {
    const isItem = modelContent.includes('item/generated') || modelContent.includes('item/handheld');
    const firstTex = Object.values(modelTex).find((v: any) => typeof v === 'string' && !v.startsWith('#'));
    const firstTexDataUrl = firstTex ? resolveRef(firstTex as string) : null;
    return (
      <div style={{display:'flex',flexDirection:'column',gap:12}}>
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
          height:180,color:DIM,gap:8,fontSize:12,border:`1px solid ${BORDER}`,background:BG}}>
          <span style={{fontSize:24}}>{isItem ? '◈' : '⬡'}</span>
          <div style={{textAlign:'center',lineHeight:1.6}}>
            {isItem ? '2D item sprite — no block geometry' : 'No element data (parent model or entity)'}
            <br/><span style={{fontSize:10,color:'#333',letterSpacing:'1px'}}>
              {isItem ? 'ITEM SPRITE' : 'INHERITED / ENTITY MODEL'}
            </span>
          </div>
        </div>
        {isItem && firstTexDataUrl && (
          <div style={{display:'flex',gap:12,alignItems:'flex-start'}}>
            <img src={firstTexDataUrl} style={{imageRendering:'pixelated',border:`1px solid ${BORDER}`,width:64,height:64,objectFit:'contain',background:'#070910'}} alt="item"/>
            <div style={{fontSize:11,color:TEXT2}}>Item texture — use the ✏ Paint tab to edit</div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div style={{position:'relative',width:'100%',height:380,border:`1px solid ${BORDER}`}}>
        <div ref={mountRef} style={{width:'100%',height:'100%'}}/>
        <div style={{position:'absolute',top:8,left:8,fontSize:9,color:'#333',letterSpacing:'1px',
          background:'rgba(9,12,16,0.7)',padding:'2px 6px'}}>
          DRAG TO ROTATE · SCROLL TO ZOOM
        </div>
        <div style={{position:'absolute',top:8,right:8,fontSize:9,color:'#333',letterSpacing:'1px',
          background:'rgba(9,12,16,0.7)',padding:'2px 6px'}}>
          {elements.length} ELEMENT{elements.length!==1?'S':''}
        </div>
      </div>

      {texSlots.length > 0 && (
        <div style={{marginTop:10}}>
          <div style={{fontSize:9,color:DIM,letterSpacing:'3px',textTransform:'uppercase',marginBottom:8}}>
            TEXTURES IN THIS MODEL
          </div>
          <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
            {texSlots.map(({key, value, dataUrl, packPath}) => (
              <div key={key}
                onClick={() => packPath && onSelectTexture?.(packPath)}
                title={`${key}: ${value}${packPath ? '\nClick to edit texture' : '\n(not found in pack)'}`}
                style={{
                  cursor: packPath ? 'pointer' : 'default',
                  display:'flex',flexDirection:'column',alignItems:'center',gap:4,
                  background:'#0d0f12',border:`1px solid ${packPath ? BORDER : '#3a1a1a'}`,
                  padding:'6px 8px',width:64,transition:'border-color 0.15s',
                }}
                onMouseEnter={e => packPath && ((e.currentTarget as HTMLElement).style.borderColor = ACCENT)}
                onMouseLeave={e => packPath && ((e.currentTarget as HTMLElement).style.borderColor = BORDER)}
              >
                {dataUrl ? (
                  <img src={dataUrl} style={{width:32,height:32,imageRendering:'pixelated',objectFit:'contain'}} alt={key}/>
                ) : (
                  <div style={{width:32,height:32,background:'#1a0a0a',border:`1px solid #3a1a1a`,
                    display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,color:'#f87171'}}>✕</div>
                )}
                <div style={{fontSize:8,color:dataUrl?TEXT2:'#f87171',letterSpacing:'0.5px',
                  textAlign:'center',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:56}}>
                  #{key}
                </div>
              </div>
            ))}
          </div>
          {texSlots.some(s => s.packPath) && (
            <div style={{fontSize:9,color:'#4a5568',marginTop:6,letterSpacing:'0.5px'}}>
              Click a texture to paint it in the panel →
            </div>
          )}
        </div>
      )}
    </div>
  );
}

'use client';

import Link from 'next/link';
import { useState, useRef, useCallback, useMemo, memo, useEffect } from "react";
import JSZip from "jszip";
import dynamic from 'next/dynamic';

const ModelViewer3D = dynamic(() => import('./model-viewer-3d'), { ssr: false,
  loading: () => <div style={{height:380,display:'flex',alignItems:'center',justifyContent:'center',color:'#4a5568',fontSize:12,border:'1px solid #2a3040',background:'#0d0f12'}}>Loading 3D viewer…</div>
});

const BG="#0d0f12",BG2="#13161b",BG3="#1a1e26",BORDER="#2a3040";
const ACCENT="#4ade80",ACCENT2="#22d3ee",DIM="#4a5568",TEXT="#e2e8f0",TEXT2="#94a3b8",WARN="#f59e0b",ERR="#f87171";
const PX=`font-family:'Courier New',monospace`;
const VANILLA_PREFIXES=["block/","item/","entity/","gui/","environment/","font/","map/","misc/","mob_effect/","painting/","particle/","colormap/","effect/","models/","textures/","sounds/"];
function isLikelyVanilla(p:string){return VANILLA_PREFIXES.some(v=>p.toLowerCase().includes(v));}

const css=`
*{box-sizing:border-box;margin:0;padding:0}
::-webkit-scrollbar{width:6px;height:6px}
::-webkit-scrollbar-track{background:${BG}}
::-webkit-scrollbar-thumb{background:${BORDER};border-radius:2px}
.root{display:flex;flex-direction:column;height:100vh;min-height:600px;background:${BG};${PX};font-size:13px;color:${TEXT};overflow:hidden;position:relative}
.topbar{display:flex;align-items:center;gap:10px;padding:8px 12px;background:${BG2};border-bottom:2px solid ${BORDER};flex-shrink:0}
.logo{color:${ACCENT};font-size:15px;font-weight:700;letter-spacing:2px}.logo span{color:${ACCENT2}}
.btn{background:${BG3};border:1px solid ${BORDER};color:${TEXT};padding:5px 12px;cursor:pointer;font-family:inherit;font-size:12px;letter-spacing:1px;text-transform:uppercase;transition:border-color 0.2s,color 0.2s}
.btn:hover{border-color:${ACCENT};color:${ACCENT}}.btn.active{border-color:${ACCENT};color:${ACCENT};background:#0a1a0a}
.btn.sm{padding:2px 8px;font-size:10px;letter-spacing:0.5px}
.btn.danger:hover{border-color:${ERR};color:${ERR}}
.btn.fixbtn:hover{border-color:${WARN};color:${WARN};background:${WARN}0d}
.btn.apply:hover{border-color:${ACCENT};background:${ACCENT}0d}
.navtabs{display:flex;background:${BG2};border-bottom:2px solid ${BORDER};flex-shrink:0;padding:0 12px}
.navtab{padding:9px 18px;cursor:pointer;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:${DIM};border-bottom:2px solid transparent;margin-bottom:-2px;transition:color 0.2s;display:flex;align-items:center;gap:6px}
.navtab:hover{color:${TEXT2}}.navtab.active{color:${ACCENT};border-bottom-color:${ACCENT}}
.navtab .cnt{background:${ERR}22;color:${ERR};border:1px solid ${ERR}44;padding:0 5px;font-size:9px;letter-spacing:0;border-radius:2px}
.tab-content{flex:1;overflow:hidden;display:flex;flex-direction:column}
.scroll-area{flex:1;overflow-y:auto;padding:20px 24px}
.stat-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:10px;margin-bottom:28px}
.stat-card{background:${BG2};border:1px solid ${BORDER};padding:16px}
.stat-num{font-size:26px;font-weight:700;line-height:1;margin-bottom:4px}
.stat-label{font-size:9px;color:${DIM};letter-spacing:2px;text-transform:uppercase}
.stat-card.c-err .stat-num{color:${ERR}}.stat-card.c-warn .stat-num{color:${WARN}}
.stat-card.c-ok .stat-num{color:${ACCENT}}.stat-card.c-info .stat-num{color:${ACCENT2}}
.sh{font-size:9px;color:${DIM};letter-spacing:3px;text-transform:uppercase;margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid ${BORDER};display:flex;align-items:center;gap:8px}
.sh .cnt{color:${TEXT2};font-size:10px;letter-spacing:0;background:${BG3};padding:1px 6px;border:1px solid ${BORDER}}
.filter-row{display:flex;gap:6px;flex-wrap:wrap;align-items:center;padding:12px 20px;border-bottom:1px solid ${BORDER};flex-shrink:0}
.search{background:${BG3};border:1px solid ${BORDER};color:${TEXT};padding:5px 10px;font-family:inherit;font-size:11px;outline:none;min-width:160px;flex:1;max-width:260px}
.search:focus{border-color:${ACCENT2}}
.tex-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(90px,1fr));gap:6px}
.tex-card{background:${BG2};border:1px solid ${BORDER};cursor:pointer;overflow:hidden;transition:border-color 0.15s,transform 0.15s}
.tex-card:hover{transform:translateY(-2px)}
.tex-card.linked{border-color:${ACCENT}55}.tex-card.vanilla{border-color:${ACCENT2}55}.tex-card.unlinked{border-color:${WARN}55}
.tex-card:hover.linked{border-color:${ACCENT}}.tex-card:hover.vanilla{border-color:${ACCENT2}}.tex-card:hover.unlinked{border-color:${WARN}}
.tex-thumb{width:100%;aspect-ratio:1;display:flex;align-items:center;justify-content:center;background:#070910;padding:6px}
.tex-thumb img{max-width:100%;max-height:100%;image-rendering:pixelated;object-fit:contain}
.tex-info{padding:5px 6px;border-top:1px solid ${BORDER}66}
.tex-name{font-size:9px;color:${TEXT2};white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tex-st{font-size:8px;margin-top:2px;letter-spacing:1px;text-transform:uppercase}
.tex-st.linked{color:${ACCENT}}.tex-st.vanilla{color:${ACCENT2}}.tex-st.unlinked{color:${WARN}}
.model-list{display:flex;flex-direction:column;gap:4px}
.mc{background:${BG2};border:1px solid ${BORDER}}.mc.has-issues{border-color:${ERR}44}
.mc-head{padding:9px 12px;display:flex;align-items:center;gap:8px;cursor:pointer;user-select:none}
.mc-head:hover{background:${BG3}}
.mc-name{flex:1;font-size:11px;color:${TEXT2};overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.mc-badge{font-size:9px;padding:2px 6px;border:1px solid;letter-spacing:1px;flex-shrink:0}
.mc-badge.ok{border-color:${ACCENT}44;color:${ACCENT}}.mc-badge.err{border-color:${ERR}44;color:${ERR}}.mc-badge.none{border-color:${BORDER};color:${DIM}}
.mc-refs{border-top:1px solid ${BORDER};padding:8px 12px;display:flex;flex-direction:column;gap:3px}
.ref-row{display:grid;grid-template-columns:80px 1fr 30px;align-items:start;gap:8px;padding:5px 8px;background:${BG3}}
.ref-key{font-size:9px;color:${DIM};letter-spacing:1px;padding-top:3px}
.ref-main{display:flex;flex-direction:column;gap:4px;min-width:0}
.ref-val{font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ref-val.found{color:${ACCENT}}.ref-val.vanilla{color:${ACCENT2}}.ref-val.broken{color:${ERR}}
.ref-hint{font-size:9px;color:${DIM};letter-spacing:0.5px}
.ref-hint.found{color:${ACCENT}88}.ref-hint.vanilla{color:${ACCENT2}88}.ref-hint.broken{color:${ERR}88}
.ref-preview{width:30px;height:30px;background:#070910;border:1px solid ${BORDER};image-rendering:pixelated;object-fit:contain}
.ref-nopreview{width:30px;height:30px;background:#070910;border:1px solid ${BORDER};display:flex;align-items:center;justify-content:center;font-size:10px;color:${DIM}}
.fix-wrap{display:flex;gap:4px;align-items:center;flex-wrap:wrap;background:#150c0c;padding:5px 6px;margin-top:2px}
.fix-sel{background:${BG};border:1px solid ${WARN}44;color:${TEXT};padding:3px 6px;font-family:inherit;font-size:10px;outline:none;flex:1;min-width:0}
.fix-sel:focus{border-color:${WARN}}
.fix-inp{background:${BG};border:1px solid ${BORDER};color:${TEXT};padding:3px 6px;font-family:inherit;font-size:10px;outline:none;width:140px}
.fix-inp:focus{border-color:${WARN}}
.fix-or{font-size:9px;color:${DIM};flex-shrink:0}
.issue-list{display:flex;flex-direction:column;gap:4px}
.issue-item{background:${BG2};border:1px solid ${ERR}33;padding:10px 14px;display:flex;gap:12px}
.issue-meta{flex:1;min-width:0;display:flex;flex-direction:column;gap:4px}
.issue-model{font-size:9px;color:${DIM};letter-spacing:1px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.issue-key{font-size:10px;color:${TEXT2}}
.issue-ref{font-size:12px;color:${ERR};overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.editor-layout{flex:1;display:flex;overflow:hidden}
.sidebar{width:220px;min-width:180px;background:${BG2};border-right:2px solid ${BORDER};display:flex;flex-direction:column;overflow:hidden}
.sidebar-title{padding:8px 10px;font-size:10px;color:${DIM};letter-spacing:2px;text-transform:uppercase;border-bottom:1px solid ${BORDER};flex-shrink:0}
.tree{flex:1;overflow-y:auto;padding:4px 0}
.tree-node{padding:3px 8px 3px calc(8px + var(--depth)*14px);cursor:pointer;display:flex;align-items:center;gap:6px;color:${TEXT2};font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tree-node:hover{background:${BG3};color:${TEXT}}
.tree-node.selected{background:#0a1a0a;color:${ACCENT};border-left:2px solid ${ACCENT}}
.center{flex:1;display:flex;flex-direction:column;overflow:hidden}
.tab-bar{display:flex;background:${BG2};border-bottom:2px solid ${BORDER};flex-shrink:0;overflow-x:auto}
.tab{padding:6px 14px;cursor:pointer;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:${DIM};border-right:1px solid ${BORDER};white-space:nowrap;flex-shrink:0}
.tab:hover{color:${TEXT2}}.tab.active{color:${ACCENT};background:${BG};border-bottom:2px solid ${ACCENT}}
.editor-area{flex:1;overflow:auto;padding:16px}
.drop-zone{border:2px dashed ${BORDER};padding:40px;text-align:center;color:${DIM};cursor:pointer;transition:border-color 0.2s}
.drop-zone:hover,.drop-zone.drag{border-color:${ACCENT};color:${TEXT}}
.field{margin-bottom:14px}.field label{display:block;font-size:10px;color:${DIM};letter-spacing:1px;text-transform:uppercase;margin-bottom:4px}
.field input,.field textarea{width:100%;background:${BG3};border:1px solid ${BORDER};color:${TEXT};padding:6px 8px;font-family:inherit;font-size:12px;outline:none}
.field input:focus,.field textarea:focus{border-color:${ACCENT}}.field textarea{resize:vertical;min-height:80px}
.err-line{background:#2a1010;color:${ERR};font-size:11px;padding:3px 8px;border-left:2px solid ${ERR};margin-bottom:2px;white-space:pre-wrap;word-break:break-all}
.json-editor-wrap{position:relative;width:100%}
.line-nums{position:absolute;left:0;top:0;width:36px;padding:10px 4px;font-size:11px;line-height:1.5;color:${DIM};text-align:right;user-select:none;pointer-events:none;white-space:pre}
textarea.code{background:${BG};border:1px solid ${BORDER};color:${ACCENT2};font-size:11px;padding:10px 10px 10px 44px;width:100%;min-height:300px;resize:vertical;outline:none;font-family:'Courier New',monospace;line-height:1.5;tab-size:2}
textarea.code:focus{border-color:${ACCENT2}}textarea.code.has-errors{border-color:${ERR}}
.status-bar{background:${BG2};border-top:1px solid ${BORDER};padding:4px 12px;font-size:11px;color:${DIM};flex-shrink:0;display:flex;gap:16px;flex-wrap:wrap}
.status-bar b{color:${ACCENT}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes fadein{from{opacity:0}to{opacity:1}}
.spinner{width:26px;height:26px;border:2px solid ${BORDER};border-top-color:${ACCENT};border-radius:50%;animation:spin 0.65s linear infinite}
.loading-overlay{position:absolute;inset:0;background:rgba(13,15,18,0.82);display:flex;align-items:center;justify-content:center;z-index:200;backdrop-filter:blur(3px);animation:fadein 0.12s ease}
.loading-box{display:flex;flex-direction:column;align-items:center;gap:14px;background:${BG2};border:1px solid ${BORDER};padding:28px 36px}
.loading-label{font-size:10px;color:${ACCENT};letter-spacing:3px;text-transform:uppercase}
.loading-sub{font-size:9px;color:${DIM};letter-spacing:1px}`;

// ── Pack analysis ──────────────────────────────────────────────────────────────
function normTexPath(p:string):string{
  return p.replace(/^minecraft:/,'').replace(/^assets\/[^/]+\/textures\//,'').replace(/\.(png|jpg|jpeg)$/i,'').toLowerCase();
}

// Fast O(n) similarity — no Set allocation, used for bulk Fix All suggestions
function quickSim(a:string,b:string):number{
  if(!a||!b)return 0; if(a===b)return 1;
  const la=a.toLowerCase(),lb=b.toLowerCase();
  if(la===lb)return 1;
  if(la.includes(lb)||lb.includes(la))return 0.8;
  return 0;
}

// Precise bigram similarity — only used for single-item lookups (findBestMatch)
function strSim(a:string,b:string):number{
  if(a===b)return 1; if(!a.length||!b.length)return 0;
  const la=a.toLowerCase(),lb=b.toLowerCase();
  if(la.includes(lb)||lb.includes(la))return 0.8;
  const bg=(s:string)=>{const r=new Set<string>();for(let i=0;i<s.length-1;i++)r.add(s.slice(i,i+2));return r;};
  const ba=bg(la),bb=bg(lb);let inter=0;ba.forEach(g=>{if(bb.has(g))inter++;});
  const un=ba.size+bb.size-inter;return un===0?0:inter/un;
}

// Uses quickSim — safe to call in bulk (no Set allocations)
function getTopMatches(brokenRef:string,textures:string[],limit=24):string[]{
  const ref=normTexPath(brokenRef);const refName=ref.split('/').pop()??'';
  const scored:{n:string,s:number}[]=[];
  for(const t of textures){
    const n=normTexPath(t);
    const s=Math.max(quickSim(refName,n.split('/').pop()??''),quickSim(ref,n));
    if(s>0)scored.push({n,s});
  }
  scored.sort((a,b)=>b.s-a.s);
  return scored.slice(0,limit).map(x=>x.n);
}

// Uses precise strSim — only call for a single item at a time
function findBestMatch(brokenRef:string,textures:string[]):string|null{
  const refName=brokenRef.split('/').pop()??brokenRef;
  let best:string|null=null,bestScore=0.28;
  for(const t of textures){
    const tn=normTexPath(t),tname=tn.split('/').pop()??'';
    const score=Math.max(strSim(refName,tname),strSim(normTexPath(brokenRef),tn));
    if(score>bestScore){bestScore=score;best=tn;}
  }
  return best;
}

// Yield helper — lets browser paint/process events between chunks
const yieldToMain=()=>new Promise<void>(r=>setTimeout(r,0));

async function analyzepackAsync(filePaths:string[],fileData:Record<string,string>){
  const textures=filePaths.filter(f=>/\.(png|jpg|jpeg)$/i.test(f));
  const models=filePaths.filter(f=>f.endsWith('.json')&&!f.includes('pack.mcmeta'));

  const texNorm=new Map<string,string>();
  for(const t of textures){
    const n=normTexPath(t);texNorm.set(n,t);
    if(n.startsWith('textures/'))texNorm.set(n.slice(9),t);
  }
  const resolveRef=(v:string):string|null=>{const n=normTexPath(v);return texNorm.get(n)??texNorm.get('textures/'+n)??null;};

  const modelData:Record<string,{refs:{key:string,value:string,status:string,resolvedPath:string|null}[],broken:number}>={};
  // Process in chunks of 40, yielding between chunks so the UI never freezes
  const CHUNK=40;
  for(let i=0;i<models.length;i+=CHUNK){
    for(const mp of models.slice(i,i+CHUNK)){
      const content=fileData[mp];
      if(!content){modelData[mp]={refs:[],broken:0};continue;}
      try{
        const json=JSON.parse(content);
        const texMap=json?.textures??{};
        const refs:any[]=[];
        for(const[key,value] of Object.entries(texMap)){
          if(typeof value!=='string'||value.startsWith('#'))continue;
          const resolvedPath=resolveRef(value);
          const status=resolvedPath?'found':isLikelyVanilla(value)?'vanilla':'broken';
          refs.push({key,value,status,resolvedPath});
        }
        modelData[mp]={refs,broken:refs.filter(r=>r.status==='broken').length};
      }catch{modelData[mp]={refs:[],broken:0};}
    }
    if(i+CHUNK<models.length)await yieldToMain();
  }

  const textureLinkedBy:Record<string,string[]>={};
  for(const[mp,{refs}] of Object.entries(modelData)){
    for(const r of refs){
      if(r.resolvedPath){
        if(!textureLinkedBy[r.resolvedPath])textureLinkedBy[r.resolvedPath]=[];
        textureLinkedBy[r.resolvedPath].push(mp);
      }
    }
  }
  const textureStatus:Record<string,'linked'|'vanilla'|'unlinked'>={};
  for(const t of textures)textureStatus[t]=(textureLinkedBy[t]?.length>0)?'linked':isLikelyVanilla(t)?'vanilla':'unlinked';
  const issues:any[]=[];
  for(const[mp,{refs}] of Object.entries(modelData))for(const r of refs.filter(x=>x.status==='broken'))issues.push({modelPath:mp,...r});
  return{textures,models,modelData,textureLinkedBy,textureStatus,issues};
}

// ── Tree helpers ───────────────────────────────────────────────────────────────
function buildTree(paths:string[]){
  const root:any={};
  for(const path of paths){
    const parts=path.split('/');let node=root;
    for(let i=0;i<parts.length;i++){
      const p=parts[i];
      if(!node[p])node[p]=i===parts.length-1?null:{};
      if(i<parts.length-1)node=node[p];
    }
  }
  return root;
}

const TreeNode=memo(function TreeNode({name,node,path,depth,selected,onSelect,onRename}:any){
  const[open,setOpen]=useState(depth<2);
  const[editing,setEditing]=useState(false);
  const[editName,setEditName]=useState(name);
  const isDir=node!==null&&typeof node==='object';
  const full=path?`${path}/${name}`:name;
  const ext=name.split('.').pop().toLowerCase();
  const icon=isDir?(open?'▼':'►'):ext==='png'?'▪':ext==='json'?'{}':ext==='mcmeta'?'⚙':ext==='ogg'?'♪':'·';
  if(isDir)return(
    <div>
      <div className="tree-node" style={{"--depth":depth} as any} onClick={()=>setOpen(o=>!o)}>
        <span style={{color:DIM,fontSize:11,flexShrink:0}}>{icon}</span>
        <span style={{color:TEXT2}}>{name}</span>
      </div>
      {open&&Object.entries(node).sort(([,a],[,b]:any)=>(typeof a==='object'&&a!==null?-1:0)-(typeof b==='object'&&b!==null?-1:0)).map(([k,v])=>(
        <TreeNode key={k} name={k} node={v} path={full} depth={depth+1} selected={selected} onSelect={onSelect} onRename={onRename}/>
      ))}
    </div>
  );
  if(editing){
    return(
      <div className="tree-node" style={{"--depth":depth} as any}>
        <input
          autoFocus
          value={editName}
          onChange={e=>setEditName(e.target.value)}
          onBlur={()=>{
            const newName=editName.trim();
            if(newName&&newName!==name)onRename?.(full,path?`${path}/${newName}`:newName);
            setEditing(false);
          }}
          onKeyDown={e=>{
            if(e.key==='Enter'){e.currentTarget.blur();}
            if(e.key==='Escape'){setEditName(name);setEditing(false);}
          }}
          style={{background:BG3,border:`1px solid ${ACCENT}`,color:TEXT,fontFamily:'inherit',fontSize:12,padding:'1px 4px',outline:'none',width:'calc(100% - 20px)',flex:1}}
          onClick={e=>e.stopPropagation()}
        />
      </div>
    );
  }
  return(
    <div className={`tree-node${selected===full?' selected':''}`} style={{"--depth":depth} as any}
      onClick={()=>onSelect(full)}
      onDoubleClick={e=>{e.stopPropagation();setEditName(name);setEditing(true);}}
      title="Double-click to rename"
    >
      <span style={{color:ext==='png'?ACCENT2:ext==='ogg'?'#a78bfa':ext==='json'?WARN:DIM,fontSize:11,flexShrink:0}}>{icon}</span>
      <span>{name}</span>
    </div>
  );
});

// ── PixelPainter helpers (pure, outside component) ────────────────────────────
function bresenhamLine(x0:number,y0:number,x1:number,y1:number,cb:(x:number,y:number)=>void){
  const dx=Math.abs(x1-x0),dy=Math.abs(y1-y0);
  const sx=x0<x1?1:-1,sy=y0<y1?1:-1;let err=dx-dy;
  for(;;){cb(x0,y0);if(x0===x1&&y0===y1)break;const e2=2*err;if(e2>-dy){err-=dy;x0+=sx;}if(e2<dx){err+=dx;y0+=sy;}}
}
function pixelRectOutline(x0:number,y0:number,x1:number,y1:number,cw:number,ch:number,cb:(x:number,y:number)=>void){
  const lx=Math.max(0,Math.min(x0,x1)),rx=Math.min(cw-1,Math.max(x0,x1));
  const ty=Math.max(0,Math.min(y0,y1)),by=Math.min(ch-1,Math.max(y0,y1));
  for(let x=lx;x<=rx;x++){cb(x,ty);if(by!==ty)cb(x,by);}
  for(let y=ty+1;y<by;y++){cb(lx,y);if(rx!==lx)cb(rx,y);}
}
function floodFill(ctx:CanvasRenderingContext2D,sx:number,sy:number,fillHex:string,cw:number,ch:number){
  const img=ctx.getImageData(0,0,cw,ch);const d=img.data;
  const idx=(x:number,y:number)=>(y*cw+x)*4;
  const si=idx(sx,sy);const[tr,tg,tb,ta]=[d[si],d[si+1],d[si+2],d[si+3]];
  const fr=parseInt(fillHex.slice(1,3),16),fg=parseInt(fillHex.slice(3,5),16),fb=parseInt(fillHex.slice(5,7),16);
  if(tr===fr&&tg===fg&&tb===fb&&ta===255)return;
  const stack:number[][]=[[sx,sy]];
  while(stack.length){
    const[x,y]=stack.pop()!;if(x<0||x>=cw||y<0||y>=ch)continue;
    const i=idx(x,y);if(d[i]!==tr||d[i+1]!==tg||d[i+2]!==tb||d[i+3]!==ta)continue;
    d[i]=fr;d[i+1]=fg;d[i+2]=fb;d[i+3]=255;
    stack.push([x+1,y],[x-1,y],[x,y+1],[x,y-1]);
  }
  ctx.putImageData(img,0,0);
}

// ── PixelPainter ───────────────────────────────────────────────────────────────
const TOOLS=[
  {id:"pen",label:"✏ Pen"},
  {id:"line",label:"╱ Line"},
  {id:"rect",label:"□ Rect"},
  {id:"fill",label:"◉ Fill"},
  {id:"eraser",label:"◻ Erase"},
  {id:"picker",label:"✦ Pick"},
  {id:"select",label:"▣ Select"},
];
const PALETTE_KEY='jod_rp_palette';
const PALETTE_SIZE=16;
function loadPalette():string[]{
  try{const s=localStorage.getItem(PALETTE_KEY);if(s)return JSON.parse(s);}catch{}
  return Array(PALETTE_SIZE).fill('');
}
function savePaletteStorage(p:string[]){try{localStorage.setItem(PALETTE_KEY,JSON.stringify(p));}catch{}}

function PixelPainter({dataUrl,onSave,compact}:any){
  const canvasRef=useRef<any>();const overlayRef=useRef<any>();
  const[scale,setScale]=useState(8);const[color,setColor]=useState("#4ade80");
  const[tool,setTool]=useState("pen");const[painting,setPainting]=useState(false);
  const[palette,setPalette]=useState<string[]>(()=>loadPalette());
  const[showHistory,setShowHistory]=useState(false);
  const[showShortcuts,setShowShortcuts]=useState(false);
  const historyLabelsRef=useRef<string[]>([]);

  // Undo/redo
  const historyRef=useRef<ImageData[]>([]);
  const historyIdxRef=useRef<number>(-1);
  const[canUndo,setCanUndo]=useState(false);
  const[canRedo,setCanRedo]=useState(false);
  const paintedRef=useRef(false);

  // Image import
  const[showImport,setShowImport]=useState(false);
  const[importSrc,setImportSrc]=useState<string|null>(null);
  const[pixelBlock,setPixelBlock]=useState(16);
  const importFileRef=useRef<any>();
  const importImgRef=useRef<HTMLImageElement|null>(null);
  const previewRef=useRef<any>();

  // Line / rect / select drag state
  const dragStartRef=useRef<{x:number,y:number}|null>(null);
  const baseSnapRef=useRef<ImageData|null>(null); // canvas snapshot before preview drag
  const[selection,setSelection]=useState<{x1:number,y1:number,x2:number,y2:number}|null>(null);
  const selectionRef=useRef<{x1:number,y1:number,x2:number,y2:number}|null>(null);
  const[replaceFrom,setReplaceFrom]=useState("#000000");
  const[replaceTo,setReplaceTo]=useState("#4ade80");

  // drawOverlay + drawSelMarquee in refs so undo/redo always use current scale
  const drawOverlayRef=useRef<(s?:number)=>void>(()=>{});
  const drawSelMarqueeRef=useRef<(x1:number,y1:number,x2:number,y2:number,s?:number)=>void>(()=>{});

  const drawOverlay=useCallback((s=scale)=>{
    const c=canvasRef.current;const ov=overlayRef.current;if(!c||!ov)return;
    ov.width=c.width*s;ov.height=c.height*s;
    const ctx=ov.getContext("2d")!;ctx.imageSmoothingEnabled=false;ctx.drawImage(c,0,0,c.width*s,c.height*s);
    ctx.strokeStyle="rgba(255,255,255,0.08)";
    for(let x=0;x<=c.width;x++){ctx.beginPath();ctx.moveTo(x*s,0);ctx.lineTo(x*s,ov.height);ctx.stroke();}
    for(let y=0;y<=c.height;y++){ctx.beginPath();ctx.moveTo(0,y*s);ctx.lineTo(ov.width,y*s);ctx.stroke();}
    // re-draw selection marquee if one exists
    if(selectionRef.current){
      const{x1,y1,x2,y2}=selectionRef.current;
      drawSelMarqueeRef.current(x1,y1,x2,y2,s);
    }
  },[scale]);
  drawOverlayRef.current=drawOverlay;

  const drawSelMarquee=useCallback((x1:number,y1:number,x2:number,y2:number,s=scale)=>{
    const ov=overlayRef.current;if(!ov)return;
    const ctx=ov.getContext("2d")!;
    const lx=Math.min(x1,x2)*s,ty=Math.min(y1,y2)*s;
    const rw=(Math.abs(x2-x1)+1)*s,bh=(Math.abs(y2-y1)+1)*s;
    ctx.save();ctx.strokeStyle=ACCENT2;ctx.lineWidth=1;ctx.setLineDash([3,3]);
    ctx.strokeRect(lx+0.5,ty+0.5,rw,bh);
    ctx.strokeStyle="rgba(0,0,0,0.5)";ctx.lineDashOffset=3;ctx.strokeRect(lx+0.5,ty+0.5,rw,bh);
    ctx.restore();
  },[scale]);
  drawSelMarqueeRef.current=drawSelMarquee;

  const syncButtons=useCallback(()=>{
    setCanUndo(historyIdxRef.current>0);
    setCanRedo(historyIdxRef.current<historyRef.current.length-1);
  },[]);

  const pushHistory=useCallback((label='Edit')=>{
    const c=canvasRef.current;if(!c)return;
    const snap=c.getContext("2d")!.getImageData(0,0,c.width,c.height);
    historyRef.current=historyRef.current.slice(0,historyIdxRef.current+1);
    historyLabelsRef.current=historyLabelsRef.current.slice(0,historyIdxRef.current+1);
    historyRef.current.push(snap);
    historyLabelsRef.current.push(label);
    historyIdxRef.current=historyRef.current.length-1;
    syncButtons();
  },[syncButtons]);

  const undo=useCallback(()=>{
    if(historyIdxRef.current<=0)return;
    historyIdxRef.current--;
    const c=canvasRef.current;if(!c)return;
    c.getContext("2d")!.putImageData(historyRef.current[historyIdxRef.current],0,0);
    drawOverlayRef.current();syncButtons();
  },[syncButtons]);

  const redo=useCallback(()=>{
    if(historyIdxRef.current>=historyRef.current.length-1)return;
    historyIdxRef.current++;
    const c=canvasRef.current;if(!c)return;
    c.getContext("2d")!.putImageData(historyRef.current[historyIdxRef.current],0,0);
    drawOverlayRef.current();syncButtons();
  },[syncButtons]);

  useEffect(()=>{
    const img=new Image();
    img.onload=()=>{
      const c=canvasRef.current;if(!c)return;
      c.width=img.width;c.height=img.height;
      const ctx=c.getContext("2d")!;ctx.imageSmoothingEnabled=false;ctx.drawImage(img,0,0);
      historyRef.current=[ctx.getImageData(0,0,c.width,c.height)];
      historyIdxRef.current=0;setCanUndo(false);setCanRedo(false);
      const maxPx=compact?260:400;
      const auto=Math.max(1,Math.min(32,Math.floor(maxPx/Math.max(img.width,img.height))));
      setScale(auto);drawOverlay(auto);
    };img.src=dataUrl;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[dataUrl]);

  useEffect(()=>{
    const h=(e:KeyboardEvent)=>{
      // Ignore if typing in an input/textarea
      const tag=(e.target as HTMLElement).tagName;
      if(tag==='INPUT'||tag==='TEXTAREA')return;
      if((e.ctrlKey||e.metaKey)&&e.key==='z'&&!e.shiftKey){e.preventDefault();undo();}
      if((e.ctrlKey||e.metaKey)&&(e.key==='y'||(e.key==='z'&&e.shiftKey))){e.preventDefault();redo();}
      if(e.key==='Escape'){selectionRef.current=null;setSelection(null);drawOverlayRef.current();}
      // Tool hotkeys
      const k=e.key.toLowerCase();
      if(!e.ctrlKey&&!e.metaKey&&!e.altKey){
        if(k==='b'){setTool('pen');selectionRef.current=null;setSelection(null);}
        if(k==='e'){setTool('eraser');selectionRef.current=null;setSelection(null);}
        if(k==='f'){setTool('fill');selectionRef.current=null;setSelection(null);}
        if(k==='l'){setTool('line');selectionRef.current=null;setSelection(null);}
        if(k==='r'){setTool('rect');selectionRef.current=null;setSelection(null);}
        if(k==='p'){setTool('picker');selectionRef.current=null;setSelection(null);}
        if(k==='s'&&!e.shiftKey){e.preventDefault();const c=canvasRef.current;if(c)onSave(c.toDataURL("image/png"));}
        if(k==='?'||k=='/'){setShowShortcuts(v=>!v);}
      }
    };
    window.addEventListener('keydown',h);return()=>window.removeEventListener('keydown',h);
  },[undo,redo,onSave]);

  // ── Import helpers ──────────────────────────────────────────────────────────
  const renderImportPreview=useCallback((img:HTMLImageElement,block:number)=>{
    const pv=previewRef.current;if(!pv)return;
    const tw=Math.max(1,Math.round(img.width/block)),th=Math.max(1,Math.round(img.height/block));
    const tmp=document.createElement('canvas');tmp.width=tw;tmp.height=th;
    const tc=tmp.getContext("2d")!;tc.imageSmoothingEnabled=true;tc.drawImage(img,0,0,tw,th);
    const maxPv=compact?220:320;
    const ds=Math.max(1,Math.floor(maxPv/Math.max(tw,th)));
    pv.width=tw*ds;pv.height=th*ds;
    const pc=pv.getContext("2d")!;pc.imageSmoothingEnabled=false;pc.drawImage(tmp,0,0,tw*ds,th*ds);
  },[compact]);

  useEffect(()=>{
    if(importSrc&&importImgRef.current)renderImportPreview(importImgRef.current,pixelBlock);
  },[importSrc,pixelBlock,renderImportPreview]);

  const handleImportFile=(e:any)=>{
    const f=e.target.files?.[0];if(!f)return;
    const reader=new FileReader();
    reader.onload=(ev)=>{
      const src=ev.target?.result as string;setImportSrc(src);
      const img=new Image();img.onload=()=>{importImgRef.current=img;renderImportPreview(img,pixelBlock);};img.src=src;
    };reader.readAsDataURL(f);
  };

  const applyImport=useCallback(()=>{
    const img=importImgRef.current;const c=canvasRef.current;if(!img||!c)return;
    const tw=Math.max(1,Math.round(img.width/pixelBlock)),th=Math.max(1,Math.round(img.height/pixelBlock));
    const tmp=document.createElement('canvas');tmp.width=tw;tmp.height=th;
    const tc=tmp.getContext("2d")!;tc.imageSmoothingEnabled=true;tc.drawImage(img,0,0,tw,th);
    const ctx=c.getContext("2d")!;ctx.imageSmoothingEnabled=false;
    ctx.clearRect(0,0,c.width,c.height);ctx.drawImage(tmp,0,0,c.width,c.height);
    pushHistory();drawOverlayRef.current();
    setShowImport(false);setImportSrc(null);importImgRef.current=null;
  },[pixelBlock,pushHistory]);

  // ── Pixel coords helper ─────────────────────────────────────────────────────
  const getPixel=(e:any):[number,number]=>{
    const ov=overlayRef.current;if(!ov)return[-1,-1];
    const r=ov.getBoundingClientRect();
    return[Math.floor((e.clientX-r.left)/scale),Math.floor((e.clientY-r.top)/scale)];
  };

  // ── Mouse handlers ──────────────────────────────────────────────────────────
  const handleMouseDown=(e:any)=>{
    const[px,py]=getPixel(e);
    const c=canvasRef.current;if(!c)return;
    const ctx=c.getContext("2d")!;
    if(tool==="pen"||tool==="eraser"){
      setPainting(true);paintedRef.current=false;
      if(px<0||py<0||px>=c.width||py>=c.height)return;
      if(tool==="eraser")ctx.clearRect(px,py,1,1);
      else{ctx.fillStyle=color;ctx.fillRect(px,py,1,1);}
      paintedRef.current=true;drawOverlayRef.current();
    } else if(tool==="picker"){
      if(px<0||py<0||px>=c.width||py>=c.height)return;
      const d=ctx.getImageData(px,py,1,1).data;
      setColor(`#${[d[0],d[1],d[2]].map((v:number)=>v.toString(16).padStart(2,"0")).join("")}`);
    } else if(tool==="fill"){
      if(px<0||py<0||px>=c.width||py>=c.height)return;
      floodFill(ctx,px,py,color,c.width,c.height);
      pushHistory('Fill');drawOverlayRef.current();
    } else if(tool==="line"||tool==="rect"){
      if(px<0||py<0||px>=c.width||py>=c.height)return;
      dragStartRef.current={x:px,y:py};
      baseSnapRef.current=ctx.getImageData(0,0,c.width,c.height);
    } else if(tool==="select"){
      selectionRef.current=null;setSelection(null);
      dragStartRef.current={x:px,y:py};
      drawOverlayRef.current();
    }
  };

  const handleMouseMove=(e:any)=>{
    const[px,py]=getPixel(e);
    const c=canvasRef.current;if(!c)return;
    const ctx=c.getContext("2d")!;
    if((tool==="pen"||tool==="eraser")&&painting){
      if(px<0||py<0||px>=c.width||py>=c.height)return;
      if(tool==="eraser")ctx.clearRect(px,py,1,1);
      else{ctx.fillStyle=color;ctx.fillRect(px,py,1,1);}
      paintedRef.current=true;drawOverlayRef.current();
    } else if((tool==="line"||tool==="rect")&&dragStartRef.current&&baseSnapRef.current){
      ctx.putImageData(baseSnapRef.current,0,0);
      ctx.fillStyle=color;
      const{x:sx,y:sy}=dragStartRef.current;
      const ex=Math.max(0,Math.min(c.width-1,px)),ey=Math.max(0,Math.min(c.height-1,py));
      if(tool==="line")
        bresenhamLine(sx,sy,ex,ey,(x,y)=>ctx.fillRect(x,y,1,1));
      else
        pixelRectOutline(sx,sy,ex,ey,c.width,c.height,(x,y)=>ctx.fillRect(x,y,1,1));
      drawOverlayRef.current();
    } else if(tool==="select"&&dragStartRef.current){
      const{x:sx,y:sy}=dragStartRef.current;
      const ex=Math.max(0,Math.min(c.width-1,px)),ey=Math.max(0,Math.min(c.height-1,py));
      drawOverlayRef.current();
      drawSelMarqueeRef.current(sx,sy,ex,ey);
    }
  };

  const handleMouseUp=(e:any)=>{
    const[px,py]=getPixel(e);
    const c=canvasRef.current;if(!c)return;
    if(tool==="pen"||tool==="eraser"){
      if(paintedRef.current)pushHistory(tool==="eraser"?"Erase":"Pen stroke");
      paintedRef.current=false;setPainting(false);
    } else if((tool==="line"||tool==="rect")&&dragStartRef.current){
      pushHistory(tool==="line"?"Line":"Rectangle");dragStartRef.current=null;baseSnapRef.current=null;
    } else if(tool==="select"&&dragStartRef.current){
      const{x:sx,y:sy}=dragStartRef.current;
      const ex=Math.max(0,Math.min(c.width-1,px)),ey=Math.max(0,Math.min(c.height-1,py));
      const sel={x1:Math.min(sx,ex),y1:Math.min(sy,ey),x2:Math.max(sx,ex),y2:Math.max(sy,ey)};
      selectionRef.current=sel;setSelection(sel);
      dragStartRef.current=null;
      drawOverlayRef.current();
    }
  };

  const handleMouseLeave=()=>{
    if(tool==="pen"||tool==="eraser"){
      if(paintedRef.current)pushHistory();
      paintedRef.current=false;setPainting(false);
    }
  };

  // ── Selection actions ───────────────────────────────────────────────────────
  const selFill=useCallback((fillColor:string)=>{
    if(!selection)return;const c=canvasRef.current;if(!c)return;
    const ctx=c.getContext("2d")!;ctx.fillStyle=fillColor;
    const w=selection.x2-selection.x1+1,h=selection.y2-selection.y1+1;
    ctx.fillRect(selection.x1,selection.y1,w,h);
    pushHistory('Fill selection');drawOverlayRef.current();
  },[selection,pushHistory]);

  const selClear=useCallback(()=>{
    if(!selection)return;const c=canvasRef.current;if(!c)return;
    const ctx=c.getContext("2d")!;
    const w=selection.x2-selection.x1+1,h=selection.y2-selection.y1+1;
    ctx.clearRect(selection.x1,selection.y1,w,h);
    pushHistory('Erase selection');drawOverlayRef.current();
  },[selection,pushHistory]);

  const selReplaceColor=useCallback(()=>{
    if(!selection)return;const c=canvasRef.current;if(!c)return;
    const ctx=c.getContext("2d")!;
    const img=ctx.getImageData(selection.x1,selection.y1,selection.x2-selection.x1+1,selection.y2-selection.y1+1);
    const d=img.data;
    const fr=parseInt(replaceFrom.slice(1,3),16),fg=parseInt(replaceFrom.slice(3,5),16),fb=parseInt(replaceFrom.slice(5,7),16);
    const tr=parseInt(replaceTo.slice(1,3),16),tg=parseInt(replaceTo.slice(3,5),16),tb=parseInt(replaceTo.slice(5,7),16);
    for(let i=0;i<d.length;i+=4){
      if(d[i]===fr&&d[i+1]===fg&&d[i+2]===fb&&d[i+3]>0){d[i]=tr;d[i+1]=tg;d[i+2]=tb;d[i+3]=255;}
    }
    ctx.putImageData(img,selection.x1,selection.y1);
    pushHistory('Replace color');drawOverlayRef.current();
  },[selection,replaceFrom,replaceTo,pushHistory]);

  const pickFromCanvas=(setter:(c:string)=>void)=>{
    // temporarily switch to picker; on next click pick the color then restore
    setTool("picker");
    const once=(e:any)=>{
      const ov=overlayRef.current;const c=canvasRef.current;if(!ov||!c)return;
      const r=ov.getBoundingClientRect();
      const px=Math.floor((e.clientX-r.left)/scale),py=Math.floor((e.clientY-r.top)/scale);
      if(px>=0&&py>=0&&px<c.width&&py<c.height){
        const d=c.getContext("2d")!.getImageData(px,py,1,1).data;
        setter(`#${[d[0],d[1],d[2]].map((v:number)=>v.toString(16).padStart(2,"0")).join("")}`);
      }
      setTool("select");
      overlayRef.current?.removeEventListener("click",once);
    };
    overlayRef.current?.addEventListener("click",once,{once:true});
  };

  const changeScale=(s:number)=>{setScale(s);drawOverlay(s);};
  const BLOCK_PRESETS=[8,16,32,64,128,256,512];

  return(
    <div style={{display:"flex",flexDirection:"column",gap:8}}>
      {/* Tool row */}
      <div style={{display:"flex",gap:4,flexWrap:"wrap",alignItems:"center"}}>
        {TOOLS.map(t=>(
          <button key={t.id} className={`btn sm${tool===t.id?" active":""}`}
            onClick={()=>{setTool(t.id);if(t.id!=="select"){selectionRef.current=null;setSelection(null);drawOverlayRef.current();}}}
          >{t.label}</button>
        ))}
      </div>

      {/* Color + import row */}
      <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
        <input type="color" value={color} onChange={e=>setColor(e.target.value)} style={{width:28,height:26,padding:2,background:BG3,border:`1px solid ${BORDER}`,cursor:"pointer"}}/>
        <span style={{fontSize:10,color:DIM}}>{color}</span>
        <button className={`btn sm${showImport?" active":""}`} style={{marginLeft:4}} onClick={()=>{setShowImport(v=>!v);setImportSrc(null);importImgRef.current=null;}}>↑ Import</button>
        <div style={{marginLeft:"auto",display:"flex",gap:3}}>
          {[2,4,8,16].map(s=><button key={s} className={`btn sm${scale===s?" active":""}`} onClick={()=>changeScale(s)}>{s}x</button>)}
        </div>
      </div>

      {/* Color palette swatches */}
      <div style={{display:'flex',alignItems:'center',gap:4,flexWrap:'wrap'}}>
        <span style={{fontSize:9,color:DIM,letterSpacing:'2px',textTransform:'uppercase',flexShrink:0}}>Palette</span>
        <div style={{display:'flex',gap:2,flexWrap:'wrap',flex:1}}>
          {palette.map((c,i)=>(
            <div key={i}
              title={c||'Empty — click active color to save'}
              onClick={()=>{if(c)setColor(c);}}
              onContextMenu={e=>{e.preventDefault();if(c){const np=[...palette];np[i]='';setPalette(np);savePaletteStorage(np);}}}
              style={{
                width:16,height:16,background:c||BG3,border:`1px solid ${c?c+' ':BORDER}`,cursor:c?'pointer':'default',
                flexShrink:0,boxSizing:'border-box',
                outline:c===color?`1px solid ${ACCENT}`:'none',outlineOffset:1,
              }}
            />
          ))}
        </div>
        <button className="btn sm" title="Save current color to palette" onClick={()=>{
          const empty=palette.findIndex(c=>!c);
          const idx=empty>=0?empty:palette.length-1;
          const np=[...palette];np[idx]=color;
          setPalette(np);savePaletteStorage(np);
        }}>+ Save</button>
      </div>

      {/* Import panel */}
      {showImport&&(
        <div style={{background:BG2,border:`1px solid ${BORDER}`,padding:10,display:"flex",flexDirection:"column",gap:8}}>
          <div style={{fontSize:9,color:DIM,letterSpacing:'2px',textTransform:'uppercase'}}>Import image as texture</div>
          {!importSrc?(
            <div style={{display:'flex',flexDirection:'column',gap:6}}>
              <div style={{border:`2px dashed ${BORDER}`,padding:'18px 24px',textAlign:'center',cursor:'pointer',color:DIM,fontSize:11,width:'100%'}}
                onClick={()=>importFileRef.current?.click()}
                onDragOver={e=>{e.preventDefault();(e.currentTarget as any).style.borderColor=ACCENT;}}
                onDragLeave={e=>{(e.currentTarget as any).style.borderColor=BORDER;}}
                onDrop={e=>{e.preventDefault();(e.currentTarget as any).style.borderColor=BORDER;const f=e.dataTransfer.files[0];if(f){const r=new FileReader();r.onload=ev=>{const src=ev.target?.result as string;setImportSrc(src);const img=new Image();img.onload=()=>{importImgRef.current=img;renderImportPreview(img,pixelBlock);};img.src=src;};r.readAsDataURL(f);}}}
              >Drop image here or click to browse</div>
              <input ref={importFileRef} type="file" accept="image/*" style={{display:'none'}} onChange={handleImportFile}/>
            </div>
          ):(
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              <div style={{fontSize:10,color:TEXT2}}>Block size (pixelation)</div>
              <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
                {BLOCK_PRESETS.map(b=><button key={b} className={`btn sm${pixelBlock===b?" active":""}`} onClick={()=>setPixelBlock(b)}>{b}</button>)}
              </div>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <input type="range" min={8} max={512} step={1} value={pixelBlock} onChange={e=>setPixelBlock(Number(e.target.value))} style={{flex:1,accentColor:ACCENT}}/>
                <span style={{fontSize:11,color:ACCENT,minWidth:36,textAlign:'right'}}>{pixelBlock}px</span>
              </div>
              <div style={{fontSize:9,color:DIM,letterSpacing:'1px'}}>Preview</div>
              <div style={{overflow:'auto',maxHeight:compact?180:260,border:`1px solid ${BORDER}`,background:'#070910',display:'inline-block'}}>
                <canvas ref={previewRef} style={{imageRendering:'pixelated',display:'block'}}/>
              </div>
              <div style={{display:'flex',gap:6}}>
                <button className="btn active" onClick={applyImport}>Apply to canvas</button>
                <button className="btn sm" onClick={()=>{setImportSrc(null);importImgRef.current=null;}}>← Back</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Selection panel */}
      {selection&&tool==="select"&&(
        <div style={{background:BG2,border:`1px solid ${ACCENT2}44`,padding:10,display:'flex',flexDirection:'column',gap:8}}>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <span style={{fontSize:9,color:ACCENT2,letterSpacing:'2px',textTransform:'uppercase'}}>Selection</span>
            <span style={{fontSize:10,color:DIM}}>{selection.x2-selection.x1+1}×{selection.y2-selection.y1+1}px @ ({selection.x1},{selection.y1})</span>
            <button className="btn sm" style={{marginLeft:'auto'}} onClick={()=>{selectionRef.current=null;setSelection(null);drawOverlayRef.current();}}>✕ Deselect</button>
          </div>
          <div style={{display:'flex',gap:6,flexWrap:'wrap',alignItems:'center'}}>
            <button className="btn sm" onClick={()=>selFill(color)}>Fill with color</button>
            <button className="btn sm danger" onClick={selClear}>Erase</button>
          </div>
          <div style={{borderTop:`1px solid ${BORDER}`,paddingTop:6,display:'flex',flexDirection:'column',gap:6}}>
            <div style={{fontSize:9,color:DIM,letterSpacing:'2px',textTransform:'uppercase'}}>Replace color</div>
            <div style={{display:'flex',gap:6,alignItems:'center',flexWrap:'wrap'}}>
              <div style={{display:'flex',flexDirection:'column',gap:3,alignItems:'center'}}>
                <span style={{fontSize:9,color:DIM}}>From</span>
                <div style={{display:'flex',gap:4,alignItems:'center'}}>
                  <input type="color" value={replaceFrom} onChange={e=>setReplaceFrom(e.target.value)} style={{width:26,height:24,padding:2,background:BG3,border:`1px solid ${BORDER}`,cursor:'pointer'}}/>
                  <button className="btn sm" title="Pick from canvas" onClick={()=>pickFromCanvas(setReplaceFrom)}>✦</button>
                </div>
              </div>
              <span style={{fontSize:14,color:DIM,marginTop:12}}>→</span>
              <div style={{display:'flex',flexDirection:'column',gap:3,alignItems:'center'}}>
                <span style={{fontSize:9,color:DIM}}>To</span>
                <div style={{display:'flex',gap:4,alignItems:'center'}}>
                  <input type="color" value={replaceTo} onChange={e=>setReplaceTo(e.target.value)} style={{width:26,height:24,padding:2,background:BG3,border:`1px solid ${BORDER}`,cursor:'pointer'}}/>
                  <button className="btn sm" title="Pick from canvas" onClick={()=>pickFromCanvas(setReplaceTo)}>✦</button>
                </div>
              </div>
              <button className="btn sm apply" style={{marginTop:12}} onClick={selReplaceColor}>Replace</button>
            </div>
          </div>
        </div>
      )}

      {/* Undo/redo + history panel */}
      <div style={{display:"flex",gap:4,alignItems:"center",flexWrap:'wrap'}}>
        <button className="btn sm" onClick={undo} disabled={!canUndo} title="Undo (Ctrl+Z)" style={{opacity:canUndo?1:0.3,cursor:canUndo?'pointer':'default'}}>← Undo</button>
        <button className="btn sm" onClick={redo} disabled={!canRedo} title="Redo (Ctrl+Shift+Z)" style={{opacity:canRedo?1:0.3,cursor:canRedo?'pointer':'default'}}>Redo →</button>
        <span style={{fontSize:9,color:DIM,marginLeft:2,letterSpacing:'1px'}}>{historyIdxRef.current+1}/{historyRef.current.length}</span>
        <button className={`btn sm${showHistory?' active':''}`} style={{marginLeft:'auto'}} onClick={()=>setShowHistory(v=>!v)} title="History">⏱ History</button>
        <button className={`btn sm${showShortcuts?' active':''}`} onClick={()=>setShowShortcuts(v=>!v)} title="Keyboard shortcuts (?)">? Keys</button>
      </div>

      {/* History panel */}
      {showHistory&&(
        <div style={{background:BG2,border:`1px solid ${BORDER}`,maxHeight:160,overflowY:'auto',padding:'4px 0'}}>
          <div style={{fontSize:9,color:DIM,letterSpacing:'2px',textTransform:'uppercase',padding:'4px 10px',borderBottom:`1px solid ${BORDER}`}}>
            Action History ({historyRef.current.length})
          </div>
          {historyRef.current.map((_,i)=>(
            <div key={i}
              onClick={()=>{
                const c=canvasRef.current;if(!c)return;
                historyIdxRef.current=i;
                c.getContext("2d")!.putImageData(historyRef.current[i],0,0);
                drawOverlayRef.current();syncButtons();
              }}
              style={{
                padding:'3px 10px',fontSize:10,cursor:'pointer',
                background:historyIdxRef.current===i?'#0a1a0a':'transparent',
                color:historyIdxRef.current===i?ACCENT:DIM,
                borderLeft:historyIdxRef.current===i?`2px solid ${ACCENT}`:'2px solid transparent',
              }}
            >
              {i===0?'Initial state':historyLabelsRef.current[i]||`Step ${i}`}
            </div>
          ))}
        </div>
      )}

      {/* Keyboard shortcuts panel */}
      {showShortcuts&&(
        <div style={{background:BG2,border:`1px solid ${BORDER}`,padding:'10px 12px'}}>
          <div style={{fontSize:9,color:DIM,letterSpacing:'2px',textTransform:'uppercase',marginBottom:8}}>Keyboard Shortcuts</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'2px 16px',fontSize:10}}>
            {[
              ['B','Pen/Brush'],['E','Eraser'],['F','Fill'],['L','Line'],
              ['R','Rectangle'],['P','Color Picker'],['S','Save to pack'],
              ['Ctrl+Z','Undo'],['Ctrl+Shift+Z','Redo'],['Esc','Deselect'],['?','Toggle shortcuts'],
            ].map(([k,v])=>(
              <div key={k} style={{display:'flex',gap:8,alignItems:'center',padding:'2px 0'}}>
                <kbd style={{background:BG3,border:`1px solid ${BORDER}`,padding:'1px 5px',fontSize:9,color:ACCENT,minWidth:24,textAlign:'center',flexShrink:0}}>{k}</kbd>
                <span style={{color:TEXT2}}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <canvas ref={canvasRef} style={{display:"none"}}/>
      <div style={{overflow:"auto",maxHeight:compact?"calc(100vh - 280px)":"calc(100vh - 360px)",display:"inline-block",maxWidth:"100%",border:`1px solid ${BORDER}`,background:"#070910"}}>
        <canvas ref={overlayRef} style={{imageRendering:"pixelated",cursor:tool==="select"?"crosshair":tool==="picker"?"cell":"crosshair",display:"block"}}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
        />
      </div>
      <div style={{display:"flex",gap:6,alignItems:"center"}}>
        <button className="btn active" onClick={()=>{const c=canvasRef.current;if(c)onSave(c.toDataURL("image/png"));}}>Save to pack</button>
        <span style={{fontSize:9,color:DIM,letterSpacing:'1px'}}>W: {overlayRef.current?.width/scale|0}px · H: {overlayRef.current?.height/scale|0}px</span>
      </div>
    </div>
  );
}

// ── AudioPlayer ────────────────────────────────────────────────────────────────
function AudioPlayer({dataUrl,name}:any){
  const[playing,setPlaying]=useState(false);const[time,setTime]=useState(0);const[dur,setDur]=useState(0);
  const audRef=useRef<any>();
  const toggle=()=>{const a=audRef.current;if(!a)return;if(playing){a.pause();setPlaying(false);}else{a.play();setPlaying(true);}};
  const fmt=(s:number)=>`${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,"0")}`;
  return(
    <div style={{display:"flex",flexDirection:"column",gap:16,maxWidth:420}}>
      <audio ref={audRef} src={dataUrl} onTimeUpdate={e=>setTime((e.target as any).currentTime)} onLoadedMetadata={e=>setDur((e.target as any).duration)} onEnded={()=>setPlaying(false)}/>
      <div style={{background:BG2,border:`1px solid ${BORDER}`,padding:20,display:"flex",flexDirection:"column",gap:12}}>
        <div style={{fontSize:13,color:ACCENT2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>♪ {name}</div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <button className={`btn${playing?" active":""}`} onClick={toggle} style={{width:70}}>{playing?"■ Stop":"▶ Play"}</button>
          <div style={{flex:1,height:4,background:BORDER,cursor:"pointer",position:"relative"}} onClick={e=>{const r=e.currentTarget.getBoundingClientRect();const ratio=(e.clientX-r.left)/r.width;if(audRef.current){audRef.current.currentTime=ratio*dur;setTime(ratio*dur);}}}>
            <div style={{position:"absolute",left:0,top:0,height:"100%",width:`${dur?time/dur*100:0}%`,background:ACCENT2}}/>
          </div>
          <span style={{fontSize:11,color:DIM,minWidth:72,textAlign:"right"}}>{fmt(time)} / {fmt(dur||0)}</span>
        </div>
      </div>
    </div>
  );
}

// ── JsonEditor ─────────────────────────────────────────────────────────────────
function JsonEditor({content,onChange}:any){
  const[errors,setErrors]=useState<any[]>([]);
  const validate=(val:string)=>{try{JSON.parse(val);setErrors([]);}catch(e:any){const msg=e.message;const lm=msg.match(/line (\d+)/i);const cm=msg.match(/column (\d+)/i);setErrors([{line:lm?parseInt(lm[1]):null,col:cm?parseInt(cm[1]):null,msg}]);}};
  const handle=(e:any)=>{const v=e.target.value;onChange(v);validate(v);};
  const lines=((content||"").match(/\n/g)||[]).length+1;
  const lineNums=Array.from({length:lines},(_,i)=>i+1).join("\n");
  return(
    <div style={{maxWidth:700}}>
      {errors.map((e,i)=><div key={i} className="err-line">✕ {e.line?`Line ${e.line}${e.col?`, col ${e.col}`:""}:`:"" } {e.msg}</div>)}
      <div className="json-editor-wrap">
        <div className="line-nums">{lineNums}</div>
        <textarea className={`code${errors.length>0?" has-errors":""}`} value={content||""} onChange={handle} spellCheck={false}/>
      </div>
      {errors.length===0&&content?.trim()&&<div style={{marginTop:6,fontSize:11,color:ACCENT}}>✓ Valid JSON</div>}
    </div>
  );
}

// ── PackMetaEditor ─────────────────────────────────────────────────────────────
function PackMetaEditor({content,onChange}:any){
  let parsed:any={};try{parsed=JSON.parse(content);}catch{}
  const desc=parsed?.pack?.description??"";const fmt=parsed?.pack?.pack_format??34;
  const upd=(field:string,val:any)=>{const u={...parsed,pack:{...parsed.pack,[field]:val}};onChange(JSON.stringify(u,null,2));};
  return(
    <div style={{maxWidth:480}}>
      <div className="field"><label>Pack format</label><input type="number" value={fmt} onChange={e=>upd("pack_format",parseInt(e.target.value)||34)}/></div>
      <div className="field"><label>Description</label><textarea value={desc} onChange={e=>upd("description",e.target.value)}/></div>
      <div style={{fontSize:11,color:DIM}}>Format 34 = 1.20.3–1.20.4 · 46 = 1.21+</div>
    </div>
  );
}

// ── OverviewTab ────────────────────────────────────────────────────────────────
function OverviewTab({analysis,fileCount,setMainTab}:any){
  const{textures,models,issues,textureStatus,modelData}=analysis;
  const linked=textures.filter((t:string)=>textureStatus[t]==='linked').length;
  const vanilla=textures.filter((t:string)=>textureStatus[t]==='vanilla').length;
  const unlinked=textures.filter((t:string)=>textureStatus[t]==='unlinked').length;
  const modelsWithIssues=models.filter((m:string)=>modelData[m]?.broken>0).length;
  return(
    <div className="scroll-area">
      <div className="stat-grid">
        <div className="stat-card c-info"><div className="stat-num">{fileCount}</div><div className="stat-label">Total files</div></div>
        <div className="stat-card c-info"><div className="stat-num">{textures.length}</div><div className="stat-label">Textures</div></div>
        <div className="stat-card c-info"><div className="stat-num">{models.length}</div><div className="stat-label">Models</div></div>
        <div className={`stat-card ${issues.length>0?'c-err':'c-ok'}`}><div className="stat-num">{issues.length}</div><div className="stat-label">Broken refs</div></div>
        <div className="stat-card c-ok"><div className="stat-num">{linked}</div><div className="stat-label">Linked textures</div></div>
        <div className="stat-card c-info"><div className="stat-num">{vanilla}</div><div className="stat-label">Vanilla textures</div></div>
        <div className={`stat-card ${unlinked>0?'c-warn':'c-ok'}`}><div className="stat-num">{unlinked}</div><div className="stat-label">Unlinked textures</div></div>
      </div>

      {issues.length>0&&(
        <div style={{marginBottom:24}}>
          <div className="sh">Broken references <span className="cnt">{issues.length}</span></div>
          <p style={{color:TEXT2,fontSize:12,marginBottom:12,lineHeight:1.6}}>
            {modelsWithIssues} model{modelsWithIssues!==1?'s':''} reference textures that don't exist in this pack and don't match vanilla naming. These will appear as missing (magenta) textures in-game.
          </p>
          <div style={{display:'flex',gap:8}}>
            <button className="btn" style={{borderColor:ERR+'66',color:ERR}} onClick={()=>setMainTab('issues')}>View all issues →</button>
            <button className="btn" onClick={()=>setMainTab('models')}>View in models →</button>
          </div>
        </div>
      )}

      {unlinked>0&&(
        <div style={{marginBottom:24}}>
          <div className="sh">Unlinked textures <span className="cnt">{unlinked}</span></div>
          <p style={{color:TEXT2,fontSize:12,marginBottom:12,lineHeight:1.6}}>
            These textures exist in the pack but are not referenced by any model and don't follow vanilla naming — they may be unused.
          </p>
          <button className="btn" onClick={()=>setMainTab('textures')}>View textures →</button>
        </div>
      )}

      {issues.length===0&&unlinked===0&&models.length>0&&(
        <div style={{display:'flex',alignItems:'center',gap:10,color:ACCENT,padding:'16px 0'}}>
          <span style={{fontSize:22}}>✓</span>
          <div>
            <div style={{fontSize:13,fontWeight:600}}>Pack looks clean</div>
            <div style={{fontSize:11,color:DIM,marginTop:2}}>All texture references resolve correctly</div>
          </div>
        </div>
      )}

      {models.length===0&&textures.length>0&&(
        <div style={{color:DIM,fontSize:12,padding:'16px 0'}}>No model JSON files found — only showing texture analysis.</div>
      )}
    </div>
  );
}

// ── TextureGrid ────────────────────────────────────────────────────────────────
function TextureGrid({analysis,fileData,onOpenInEditor,onDeleteTextures}:any){
  const{textures,textureStatus,textureLinkedBy}=analysis;
  const[filter,setFilter]=useState('all');
  const[search,setSearch]=useState('');
  const[selected,setSelected]=useState<Set<string>>(()=>new Set());
  const[lastClicked,setLastClicked]=useState<string|null>(null);
  const[selectMode,setSelectMode]=useState(false);

  const counts=useMemo(()=>({
    all:textures.length,
    linked:textures.filter((t:string)=>textureStatus[t]==='linked').length,
    vanilla:textures.filter((t:string)=>textureStatus[t]==='vanilla').length,
    unlinked:textures.filter((t:string)=>textureStatus[t]==='unlinked').length,
  }),[textures,textureStatus]);

  const filtered=useMemo(()=>{
    let list:string[]=textures;
    if(filter!=='all')list=list.filter((t:string)=>textureStatus[t]===filter);
    if(search.trim())list=list.filter((t:string)=>t.toLowerCase().includes(search.toLowerCase()));
    return list;
  },[textures,textureStatus,filter,search]);

  const LABELS:{[k:string]:string}={linked:'Linked by model',vanilla:'Vanilla name — uses MC default',unlinked:'Not linked to any model'};

  function toggleSelect(path:string,e:React.MouseEvent){
    if(e.shiftKey&&lastClicked){
      const fromIdx=filtered.indexOf(lastClicked),toIdx=filtered.indexOf(path);
      const lo=Math.min(fromIdx,toIdx),hi=Math.max(fromIdx,toIdx);
      setSelected(s=>{const n=new Set(s);for(let i=lo;i<=hi;i++)n.add(filtered[i]);return n;});
    }else{
      setSelected(s=>{const n=new Set(s);if(n.has(path))n.delete(path);else n.add(path);return n;});
    }
    setLastClicked(path);
  }

  function deleteUnlinked(){
    const unlinkedPaths=textures.filter((t:string)=>textureStatus[t]==='unlinked');
    if(!unlinkedPaths.length)return;
    if(!confirm(`Delete ${unlinkedPaths.length} unlinked texture${unlinkedPaths.length!==1?'s':''}? This cannot be undone.`))return;
    onDeleteTextures?.(unlinkedPaths);
  }

  function deleteSelected(){
    if(!selected.size)return;
    if(!confirm(`Delete ${selected.size} selected texture${selected.size!==1?'s':''}?`))return;
    onDeleteTextures?.(Array.from(selected));
    setSelected(new Set());
  }

  return(
    <div style={{display:'flex',flexDirection:'column',height:'100%',overflow:'hidden'}}>
      <div className="filter-row">
        {(['all','linked','vanilla','unlinked'] as string[]).map(f=>(
          <button key={f} className={`btn sm${filter===f?' active':''}`} onClick={()=>setFilter(f)}
            style={f==='unlinked'&&counts.unlinked>0&&filter!==f?{borderColor:WARN+'44',color:WARN}:{}}>
            {f.toUpperCase()} ({counts[f as keyof typeof counts]})
          </button>
        ))}
        <input className="search" placeholder="Search textures…" value={search} onChange={e=>setSearch(e.target.value)}/>
        <button className={`btn sm${selectMode?' active':''}`} onClick={()=>{setSelectMode(v=>!v);setSelected(new Set());}}>☑ Select</button>
        {counts.unlinked>0&&(
          <button className="btn sm danger" style={{borderColor:WARN+'44',color:WARN}} onClick={deleteUnlinked}
            title={`Delete all ${counts.unlinked} unlinked textures`}>
            Del unlinked ({counts.unlinked})
          </button>
        )}
      </div>

      {/* Batch action bar */}
      {selectMode&&selected.size>0&&(
        <div style={{padding:'6px 12px',background:'#0a100a',borderBottom:`1px solid ${ACCENT}33`,display:'flex',gap:8,alignItems:'center',flexShrink:0}}>
          <span style={{fontSize:10,color:ACCENT,letterSpacing:'1px'}}>{selected.size} selected</span>
          <button className="btn sm danger" style={{borderColor:ERR+'44',color:ERR}} onClick={deleteSelected}>Delete selected</button>
          <button className="btn sm" onClick={()=>{
            selected.forEach(path=>{
              const a=document.createElement('a');a.href=fileData[path];
              a.download=path.split('/').pop()||'texture.png';a.click();
            });
          }}>Export selected</button>
          <button className="btn sm" style={{marginLeft:'auto'}} onClick={()=>setSelected(new Set())}>Clear selection</button>
        </div>
      )}

      <div className="scroll-area">
        {filtered.length===0?(
          <div className="empty-state">No textures match the current filter</div>
        ):(
          <div className="tex-grid">
            {filtered.map((path:string)=>{
              const st=textureStatus[path];
              const linkedBy=textureLinkedBy[path];
              const isSel=selected.has(path);
              return(
                <div key={path} className={`tex-card ${st}`}
                  onClick={e=>{
                    if(selectMode){toggleSelect(path,e);}
                    else onOpenInEditor(path);
                  }}
                  style={isSel?{outline:`2px solid ${ACCENT}`,outlineOffset:-2}:{}}
                  title={`${path}\n${LABELS[st]}${linkedBy?.length?`\nUsed by: ${linkedBy.map((m:string)=>m.split('/').pop()).join(', ')}`:''}${selectMode?'\nClick to select, Shift+click for range':''}`}>
                  {selectMode&&(
                    <div style={{position:'absolute',top:4,left:4,width:12,height:12,background:isSel?ACCENT:BG3,border:`1px solid ${BORDER}`,zIndex:2,pointerEvents:'none'}}/>
                  )}
                  <div className="tex-thumb">
                    <img src={fileData[path]} alt={path.split('/').pop()}/>
                  </div>
                  <div className="tex-info">
                    <div className="tex-name">{path.split('/').pop()}</div>
                    <div className={`tex-st ${st}`}>{st}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── ModelRefRow ────────────────────────────────────────────────────────────────
function ModelRefRow({refData,fileData,textures,onApplyFix}:any){
  const{key,value,status,resolvedPath}=refData;
  const[fixing,setFixing]=useState(false);
  const[fixVal,setFixVal]=useState('');
  // Only compute top matches when the fix UI is opened
  const topMatches=useMemo(()=>fixing?getTopMatches(value,textures):[],[fixing,value,textures]);
  const dlId=useMemo(()=>'dl-'+key.replace(/\W/g,''),[key]);
  const hintMap:any={found:'✓ found in pack',vanilla:'✓ vanilla — uses MC default',broken:'✕ not found anywhere'};
  const openFix=useCallback(()=>{setFixVal(findBestMatch(value,textures)??'');setFixing(true);},[value,textures]);
  return(
    <div>
      <div className="ref-row">
        <div className="ref-key">{key}</div>
        <div className="ref-main">
          <div className={`ref-val ${status==='found'?'found':status==='vanilla'?'vanilla':'broken'}`}>{value}</div>
          <div className={`ref-hint ${status==='found'?'found':status==='vanilla'?'vanilla':'broken'}`}>{hintMap[status]}</div>
          {status==='broken'&&!fixing&&(
            <button className="btn sm fixbtn" style={{borderColor:WARN+'44',color:WARN,alignSelf:'flex-start',marginTop:2}} onClick={openFix}>Fix reference</button>
          )}
          {fixing&&(
            <div className="fix-wrap">
              <input className="fix-inp" list={dlId} value={fixVal} onChange={e=>setFixVal(e.target.value)} placeholder="block/stone" style={{flex:1,minWidth:80}}/>
              <datalist id={dlId}>{topMatches.map((n:string)=><option key={n} value={n}/>)}</datalist>
              <button className="btn sm apply" style={{borderColor:ACCENT+'44',color:ACCENT}} onClick={()=>{if(fixVal.trim())onApplyFix(key,fixVal.trim());setFixing(false);}}>Apply</button>
              <button className="btn sm" onClick={()=>setFixing(false)}>✕</button>
            </div>
          )}
        </div>
        {resolvedPath?(
          <img className="ref-preview" src={fileData[resolvedPath]} alt=""/>
        ):(
          <div className="ref-nopreview">{status==='vanilla'?'↗':'?'}</div>
        )}
      </div>
    </div>
  );
}

// ── ModelsView ─────────────────────────────────────────────────────────────────
function ModelsView({analysis,fileData,onApplyFix,onOpenInEditor}:any){
  const{models,modelData}=analysis;
  const[filter,setFilter]=useState('all');
  const[search,setSearch]=useState('');
  const[expanded,setExpanded]=useState<Set<string>>(()=>new Set());

  const issueCount=models.filter((m:string)=>modelData[m]?.broken>0).length;

  const filtered=useMemo(()=>{
    let list:string[]=models;
    if(filter==='issues')list=list.filter((m:string)=>modelData[m]?.broken>0);
    if(filter==='ok')list=list.filter((m:string)=>modelData[m]?.broken===0);
    if(search.trim())list=list.filter((m:string)=>m.toLowerCase().includes(search.toLowerCase()));
    return list;
  },[models,modelData,filter,search]);

  const toggle=(mp:string)=>setExpanded(s=>{const n=new Set(s);if(n.has(mp))n.delete(mp);else n.add(mp);return n;});

  return(
    <div style={{display:'flex',flexDirection:'column',height:'100%',overflow:'hidden'}}>
      <div className="filter-row">
        <button className={`btn sm${filter==='all'?' active':''}`} onClick={()=>setFilter('all')}>ALL ({models.length})</button>
        <button className={`btn sm${filter==='issues'?' active':''}`} onClick={()=>setFilter('issues')}
          style={issueCount>0&&filter!=='issues'?{borderColor:ERR+'44',color:ERR}:{}}>
          HAS ISSUES ({issueCount})
        </button>
        <button className={`btn sm${filter==='ok'?' active':''}`} onClick={()=>setFilter('ok')}>OK ({models.length-issueCount})</button>
        <input className="search" placeholder="Search models…" value={search} onChange={e=>setSearch(e.target.value)}/>
      </div>
      <div className="scroll-area">
        {filtered.length===0?<div className="empty-state">No models match the filter</div>:(
          <div className="model-list">
            {filtered.map((mp:string)=>{
              const{refs,broken}=modelData[mp]??{refs:[],broken:0};
              const isOpen=expanded.has(mp);
              return(
                <div key={mp} className={`mc${broken>0?' has-issues':''}`}>
                  <div className="mc-head" onClick={()=>toggle(mp)}>
                    <span style={{color:DIM,fontSize:10,flexShrink:0}}>{isOpen?'▼':'►'}</span>
                    <span className="mc-name" title={mp}>{mp.split('/').slice(-2).join('/')}</span>
                    {broken>0?<span className="mc-badge err">{broken} broken</span>:refs.length>0?<span className="mc-badge ok">✓ OK</span>:<span className="mc-badge none">no refs</span>}
                    <button className="btn sm" style={{flexShrink:0}} onClick={e=>{e.stopPropagation();onOpenInEditor(mp);}}>Edit</button>
                  </div>
                  {isOpen&&(
                    <div className="mc-refs">
                      {refs.length===0?<div style={{fontSize:11,color:DIM,padding:'4px 0'}}>No texture references in this model</div>:
                        refs.map((r:any)=>(
                          <ModelRefRow key={r.key} refData={r} fileData={fileData} textures={analysis.textures} onApplyFix={(k:string,v:string)=>onApplyFix(mp,k,v)}/>
                        ))
                      }
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── IssuesView ─────────────────────────────────────────────────────────────────
function IssuesView({analysis,fileData,onApplyFix,onApplyAllFixes,onOpenInEditor}:any){
  const{issues,textures}=analysis;
  const[fixState,setFixState]=useState<Record<string,string>>({});
  const[showFixAll,setShowFixAll]=useState(false);

  // Async suggestion computation — never blocks the main thread
  const[suggReady,setSuggReady]=useState(false);
  const[suggestions,setSuggestions]=useState<Record<string,string>>({});
  const[allTopMatches,setAllTopMatches]=useState<Record<string,string[]>>({});

  useEffect(()=>{
    if(!showFixAll){setSuggReady(false);setSuggestions({});setAllTopMatches({});return;}
    setSuggReady(false);setSuggestions({});setAllTopMatches({});
    let cancelled=false;
    (async()=>{
      const sugg:Record<string,string>={};const atm:Record<string,string[]>={};
      for(let i=0;i<issues.length;i++){
        if(cancelled)return;
        const issue=issues[i];
        const id=`${issue.modelPath}::${issue.key}`;
        const top=getTopMatches(issue.value,textures,16);
        atm[id]=top;sugg[id]=top[0]??'';
        if((i+1)%20===0)await yieldToMain(); // yield every 20 issues — ~1-2ms per chunk
      }
      if(!cancelled){setSuggestions(sugg);setAllTopMatches(atm);setSuggReady(true);}
    })();
    return()=>{cancelled=true;};
  },[showFixAll,issues,textures]);

  const[fixAllVals,setFixAllVals]=useState<Record<string,string>>({});
  const effectiveFAVals=showFixAll?{...suggestions,...fixAllVals}:{};

  if(issues.length===0)return(
    <div className="scroll-area">
      <div style={{display:'flex',alignItems:'center',gap:12,color:ACCENT,padding:'20px 0'}}>
        <span style={{fontSize:28}}>✓</span>
        <div>
          <div style={{fontSize:14,fontWeight:600}}>No broken references</div>
          <div style={{fontSize:11,color:DIM,marginTop:4}}>All texture references in your models resolve correctly</div>
        </div>
      </div>
    </div>
  );

  const modelCount=new Set(issues.map((i:any)=>i.modelPath)).size;
  const autoFixCount=Object.values({...suggestions,...fixAllVals}).filter(Boolean).length;

  return(
    <div style={{display:'flex',flexDirection:'column',height:'100%',overflow:'hidden'}}>
      {/* Header */}
      <div style={{padding:'10px 20px',borderBottom:`1px solid ${BORDER}`,flexShrink:0,display:'flex',gap:12,alignItems:'center',flexWrap:'wrap'}}>
        <span style={{fontSize:10,color:ERR,letterSpacing:2,textTransform:'uppercase'}}>{issues.length} broken ref{issues.length!==1?'s':''}</span>
        <span style={{fontSize:10,color:DIM}}>across {modelCount} model{modelCount!==1?'s':''}</span>
        <div style={{marginLeft:'auto',display:'flex',gap:6}}>
          {!showFixAll?(
            <button className="btn sm" style={{borderColor:ACCENT+'44',color:ACCENT}}
              onClick={()=>{setShowFixAll(true);setFixAllVals({});}}>
              ⚡ Auto-fix all ({issues.length})
            </button>
          ):(
            <>
              <button className="btn sm apply" style={{borderColor:ACCENT+'44',color:ACCENT,opacity:suggReady?1:0.5}}
                disabled={!suggReady}
                onClick={()=>{
                  onApplyAllFixes(effectiveFAVals);
                  setShowFixAll(false);setFixAllVals({});
                }}>
                {suggReady?`Apply ${autoFixCount} fix${autoFixCount!==1?'es':''}` : 'Computing…'}
              </button>
              <button className="btn sm" onClick={()=>{setShowFixAll(false);setFixAllVals({});}}>Cancel</button>
            </>
          )}
        </div>
      </div>

      {/* Fix All review panel */}
      {showFixAll&&(
        <div style={{background:'#0a1208',borderBottom:`2px solid ${ACCENT}33`,padding:'12px 20px',flexShrink:0,maxHeight:280,overflowY:'auto'}}>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
            <div style={{fontSize:9,color:ACCENT,letterSpacing:'3px',textTransform:'uppercase'}}>
              {suggReady?'Review auto-suggestions — confirm or change each replacement':'Computing suggestions…'}
            </div>
            {!suggReady&&<div className="spinner" style={{width:12,height:12,borderWidth:1.5,flexShrink:0}}/>}
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:4}}>
            {issues.map((issue:any,i:number)=>{
              const id=`${issue.modelPath}::${issue.key}`;
              const val=effectiveFAVals[id]??'';
              const dlId=`fa-dl-${i}`;
              const topM=allTopMatches[id]??[];
              return(
                <div key={id} style={{display:'grid',gridTemplateColumns:'1fr 16px 1fr',gap:8,alignItems:'center',fontSize:11,background:'#0d1510',padding:'5px 8px'}}>
                  <div style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                    <span style={{color:DIM,fontSize:9}}>{issue.modelPath.split('/').pop()} › </span>
                    <span style={{color:ERR}}>{issue.value}</span>
                  </div>
                  <span style={{color:DIM,fontSize:10,textAlign:'center'}}>→</span>
                  <div style={{display:'flex',gap:4,alignItems:'center',minWidth:0}}>
                    <input className="fix-inp" list={dlId} value={val}
                      onChange={e=>setFixAllVals(s=>({...s,[id]:e.target.value}))}
                      placeholder="leave empty to skip"
                      style={{flex:1,minWidth:0,width:'100%'}}/>
                    <datalist id={dlId}>{topM.map((n:string)=><option key={n} value={n}/>)}</datalist>
                    {val&&<button className="btn sm" style={{flexShrink:0,padding:'2px 5px'}} onClick={()=>setFixAllVals(s=>({...s,[id]:''}))}>✕</button>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Individual issues list */}
      <div className="scroll-area">
        <div className="issue-list">
          {issues.map((issue:any)=>{
            const id=`${issue.modelPath}::${issue.key}`;
            const isFixing=id in fixState;
            const fixVal=fixState[id]??issue.value;
            // Show auto-suggested value badge in fix-all mode
            const autoSuggested=effectiveFAVals[id];
            return(
              <div key={id} className="issue-item" style={showFixAll&&autoSuggested?{borderColor:ACCENT+'44',background:'#0a100a'}:{}}>
                <div className="ref-nopreview" style={{width:32,height:32,flexShrink:0,marginTop:2,fontSize:14,color:showFixAll&&autoSuggested?ACCENT:ERR}}>
                  {showFixAll&&autoSuggested?'✓':'✕'}
                </div>
                <div className="issue-meta">
                  <div className="issue-model">{issue.modelPath.split('/').slice(-3).join('/')}</div>
                  <div className="issue-key">key: <span style={{color:TEXT}}>{issue.key}</span></div>
                  <div className="issue-ref">{issue.value}</div>
                  {showFixAll&&autoSuggested&&(
                    <div style={{fontSize:10,color:ACCENT,marginTop:2}}>→ {autoSuggested}</div>
                  )}
                  {!showFixAll&&(!isFixing?(
                    <div style={{display:'flex',gap:6,marginTop:4}}>
                      <button className="btn sm fixbtn" style={{borderColor:WARN+'44',color:WARN}} onClick={()=>setFixState(s=>({...s,[id]:findBestMatch(issue.value,textures)??''}))}>Fix reference</button>
                      <button className="btn sm" onClick={()=>onOpenInEditor(issue.modelPath)}>Edit model</button>
                    </div>
                  ):(
                    <div className="fix-wrap" style={{marginTop:6}}>
                      <input className="fix-inp" list={`ifl-${id.replace(/[^a-z0-9]/gi,'s')}`} value={fixVal}
                        onChange={e=>setFixState(s=>({...s,[id]:e.target.value}))}
                        placeholder="block/stone" style={{flex:1,minWidth:80}}/>
                      <datalist id={`ifl-${id.replace(/[^a-z0-9]/gi,'s')}`}>
                        {getTopMatches(issue.value,textures,20).map((n:string)=><option key={n} value={n}/>)}
                      </datalist>
                      <button className="btn sm apply" style={{borderColor:ACCENT+'44',color:ACCENT}} onClick={()=>{
                        const val=fixState[id];
                        if(val?.trim())onApplyFix(issue.modelPath,issue.key,val.trim());
                        setFixState(s=>{const n={...s};delete n[id];return n;});
                      }}>Apply</button>
                      <button className="btn sm" onClick={()=>setFixState(s=>{const n={...s};delete n[id];return n;})}>✕</button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── PackDiffView ───────────────────────────────────────────────────────────────
function PackDiffView({fileDataA,filePathsA}:any){
  const[fileDataB,setFileDataB]=useState<Record<string,string>>({});
  const[filePathsB,setFilePathsB]=useState<string[]>([]);
  const[loadingB,setLoadingB]=useState(false);
  const[nameB,setNameB]=useState('');
  const fileInputRef2=useRef<any>();

  const loadZipB=async(file:File)=>{
    setLoadingB(true);setNameB(file.name);
    const JSZipLib=await import('jszip');
    const zip=await JSZipLib.default.loadAsync(file);
    const newData:Record<string,string>={};const promises:Promise<void>[]=[];
    zip.forEach((relPath:string,zipEntry:any)=>{
      if(zipEntry.dir)return;
      const ext=relPath.split('.').pop()!.toLowerCase();
      if(['png','jpg','jpeg'].includes(ext)){
        promises.push(zipEntry.async('base64').then((b64:string)=>{newData[relPath]=`data:image/${ext};base64,${b64}`;}));
      }else if(['json','mcmeta','txt'].includes(ext)){
        promises.push(zipEntry.async('string').then((s:string)=>{newData[relPath]=s;}));
      }
    });
    await Promise.all(promises);
    setFileDataB(newData);setFilePathsB(Object.keys(newData));setLoadingB(false);
  };

  const setA=new Set(filePathsA);
  const setB=new Set(filePathsB);
  const added=filePathsB.filter((p:string)=>!setA.has(p));
  const removed=filePathsA.filter((p:string)=>!setB.has(p));
  const common=filePathsA.filter((p:string)=>setB.has(p));
  const modified=common.filter((p:string)=>fileDataA[p]!==fileDataB[p]);

  return(
    <div style={{display:'flex',flexDirection:'column',height:'100%',overflow:'hidden'}}>
      {filePathsB.length===0?(
        <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',padding:32}}>
          <div style={{textAlign:'center',display:'flex',flexDirection:'column',gap:12,maxWidth:380}}>
            <div style={{fontSize:9,color:DIM,letterSpacing:'3px',textTransform:'uppercase'}}>Pack A: {filePathsA.length} files loaded</div>
            <div style={{fontSize:14,color:TEXT,marginBottom:4}}>Load a comparison pack (Pack B)</div>
            <div style={{fontSize:11,color:DIM,marginBottom:12}}>Compare the currently loaded pack against another version to see what changed.</div>
            <input ref={fileInputRef2} type="file" accept=".zip" style={{display:'none'}} onChange={e=>{const f=e.target.files?.[0];if(f)loadZipB(f);}}/>
            <button className="btn" onClick={()=>fileInputRef2.current?.click()}>{loadingB?'Loading…':'Browse Pack B .zip'}</button>
          </div>
        </div>
      ):(
        <div className="scroll-area">
          <div style={{display:'flex',gap:24,marginBottom:20,flexWrap:'wrap'}}>
            <div style={{fontSize:9,color:DIM,letterSpacing:'2px'}}>PACK A: {filePathsA.length} files</div>
            <div style={{fontSize:9,color:DIM,letterSpacing:'2px'}}>PACK B: {nameB} — {filePathsB.length} files</div>
            <button className="btn sm" style={{marginLeft:'auto'}} onClick={()=>{setFileDataB({});setFilePathsB([]);setNameB('');}}>✕ Reset B</button>
          </div>

          {/* Summary */}
          <div style={{display:'flex',gap:8,marginBottom:20,flexWrap:'wrap'}}>
            <div style={{background:ACCENT+'18',border:`1px solid ${ACCENT}44`,padding:'6px 12px',fontSize:10,color:ACCENT}}>{added.length} ADDED</div>
            <div style={{background:ERR+'18',border:`1px solid ${ERR}44`,padding:'6px 12px',fontSize:10,color:ERR}}>{removed.length} REMOVED</div>
            <div style={{background:WARN+'18',border:`1px solid ${WARN}44`,padding:'6px 12px',fontSize:10,color:WARN}}>{modified.length} MODIFIED</div>
            <div style={{background:BG3,border:`1px solid ${BORDER}`,padding:'6px 12px',fontSize:10,color:DIM}}>{common.length-modified.length} UNCHANGED</div>
          </div>

          {added.length>0&&(<>
            <div className="sh" style={{color:ACCENT}}>ADDED in Pack B <span className="cnt">{added.length}</span></div>
            {added.map((p:string)=>(
              <div key={p} style={{display:'flex',alignItems:'center',gap:8,padding:'3px 0',borderBottom:`1px solid ${BORDER}22`}}>
                <span style={{fontSize:10,color:ACCENT}}>+</span>
                <span style={{fontSize:11,color:TEXT2,flex:1}}>{p}</span>
                {/\.(png|jpg|jpeg)$/i.test(p)&&<img src={fileDataB[p]} style={{width:24,height:24,imageRendering:'pixelated',background:'#070910',border:`1px solid ${BORDER}`}} alt=""/>}
              </div>
            ))}
          </>)}

          {removed.length>0&&(<>
            <div className="sh" style={{color:ERR,marginTop:16}}>REMOVED from Pack A <span className="cnt">{removed.length}</span></div>
            {removed.map((p:string)=>(
              <div key={p} style={{display:'flex',alignItems:'center',gap:8,padding:'3px 0',borderBottom:`1px solid ${BORDER}22`}}>
                <span style={{fontSize:10,color:ERR}}>−</span>
                <span style={{fontSize:11,color:TEXT2,flex:1}}>{p}</span>
                {/\.(png|jpg|jpeg)$/i.test(p)&&<img src={fileDataA[p]} style={{width:24,height:24,imageRendering:'pixelated',background:'#070910',border:`1px solid ${BORDER}`,opacity:0.5}} alt=""/>}
              </div>
            ))}
          </>)}

          {modified.length>0&&(<>
            <div className="sh" style={{color:WARN,marginTop:16}}>MODIFIED <span className="cnt">{modified.length}</span></div>
            {modified.map((p:string)=>{
              const isImg=/\.(png|jpg|jpeg)$/i.test(p);
              return(
                <div key={p} style={{marginBottom:8,borderBottom:`1px solid ${BORDER}22`,paddingBottom:8}}>
                  <div style={{fontSize:11,color:WARN,marginBottom:4}}>{p}</div>
                  {isImg?(
                    <div style={{display:'flex',gap:8,alignItems:'center'}}>
                      <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:2}}>
                        <span style={{fontSize:8,color:DIM,letterSpacing:'1px'}}>PACK A</span>
                        <img src={fileDataA[p]} style={{width:48,height:48,imageRendering:'pixelated',background:'#070910',border:`1px solid ${BORDER}`}} alt=""/>
                      </div>
                      <span style={{color:DIM,fontSize:16}}>→</span>
                      <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:2}}>
                        <span style={{fontSize:8,color:DIM,letterSpacing:'1px'}}>PACK B</span>
                        <img src={fileDataB[p]} style={{width:48,height:48,imageRendering:'pixelated',background:'#070910',border:`1px solid ${BORDER}`}} alt=""/>
                      </div>
                    </div>
                  ):(
                    <div style={{fontSize:10,color:DIM,fontFamily:'monospace'}}>Content changed (JSON/text)</div>
                  )}
                </div>
              );
            })}
          </>)}
        </div>
      )}
    </div>
  );
}

// ── Main App ───────────────────────────────────────────────────────────────────
export default function App(){
  const fileDataRef=useRef<Record<string,string>>({});
  const[filePaths,setFilePaths]=useState<string[]>([]);
  const[selected,setSelected]=useState<string|null>(null);
  const[selectedContent,setSelectedContent]=useState<string|null>(null);
  const[editorTab,setEditorTab]=useState("preview");
  const[dragging,setDragging]=useState(false);
  const[status,setStatus]=useState("No pack loaded");
  const[mainTab,setMainTab]=useState('overview');
  const[revision,setRevision]=useState(0);
  const[painting3dTex,setPainting3dTex]=useState<string|null>(null);
  type Analysis=Awaited<ReturnType<typeof analyzepackAsync>>;
  const[analysis,setAnalysis]=useState<Analysis|null>(null);
  const[isAnalyzing,setIsAnalyzing]=useState(false);
  const[loadingMsg,setLoadingMsg]=useState('');
  const fileInputRef=useRef<any>();

  const fileCount=useMemo(()=>filePaths.length,[filePaths]);
  const textureCount=useMemo(()=>filePaths.filter(f=>/\.(png|jpg|jpeg)$/i.test(f)).length,[filePaths]);
  const audioCount=useMemo(()=>filePaths.filter(f=>f.endsWith('.ogg')||f.endsWith('.mp3')).length,[filePaths]);
  const tree=useMemo(()=>buildTree(filePaths),[filePaths]);

  // Non-blocking async analysis — yields to browser between chunks
  useEffect(()=>{
    if(filePaths.length===0){setAnalysis(null);setIsAnalyzing(false);return;}
    setIsAnalyzing(true);setLoadingMsg('Analysing pack…');
    let cancelled=false;
    analyzepackAsync(filePaths,fileDataRef.current).then(result=>{
      if(!cancelled){setAnalysis(result);setIsAnalyzing(false);setLoadingMsg('');}
    });
    return()=>{cancelled=true;};
  },[filePaths,revision]);

  const loadZip=async(file:File)=>{
    setIsAnalyzing(true);setLoadingMsg('Loading zip…');
    setStatus("Loading…");
    try{
      const zip=await JSZip.loadAsync(file);
      const newData:Record<string,string>={};const promises:Promise<void>[]=[];
      zip.forEach((relPath:string,zipEntry:any)=>{
        if(zipEntry.dir)return;
        const ext=relPath.split('.').pop()!.toLowerCase();
        if(['png','jpg','jpeg'].includes(ext)){
          promises.push(zipEntry.async('base64').then((b64:string)=>{newData[relPath]=`data:image/${ext};base64,${b64}`;}));
        }else if(ext==='ogg'||ext==='mp3'||ext==='wav'){
          promises.push(zipEntry.async('base64').then((b64:string)=>{newData[relPath]=`data:audio/${ext};base64,${b64}`;}));
        }else if(['json','mcmeta','txt','md'].includes(ext)||relPath.includes('pack')){
          promises.push(zipEntry.async('string').then((s:string)=>{newData[relPath]=s;}));
        }
      });
      await Promise.all(promises);
      fileDataRef.current=newData;
      setFilePaths(Object.keys(newData));
      setRevision(0);
      setStatus(`Loaded ${Object.keys(newData).length} files from ${file.name}`);
      setSelected(null);setSelectedContent(null);setMainTab('overview');
    }catch(e:any){setStatus('Error loading zip: '+e.message);}
  };

  const handleDrop=useCallback((e:any)=>{e.preventDefault();setDragging(false);const f=e.dataTransfer.files[0];if(f&&f.name.endsWith('.zip'))loadZip(f);},[]);
  const handleFileChange=(e:any)=>{const f=e.target.files[0];if(f)loadZip(f);};

  const openInEditor=useCallback((path:string)=>{
    setSelected(path);
    setPainting3dTex(null);
    setSelectedContent(fileDataRef.current[path]);
    const ext=path.split('.').pop()!.toLowerCase();
    if(['png','jpg','jpeg'].includes(ext))setEditorTab('preview');
    else if(['ogg','mp3','wav'].includes(ext))setEditorTab('audio');
    else if(path.includes('pack.mcmeta'))setEditorTab('meta');
    else setEditorTab('editor');
    setMainTab('editor');
  },[]);

  const updateContent=useCallback((val:string)=>{
    if(!selected)return;
    fileDataRef.current[selected]=val;
    setSelectedContent(val);
  },[selected]);

  const saveTexture=useCallback((dataUrl:string)=>{
    if(!selected)return;
    fileDataRef.current[selected]=dataUrl;
    setSelectedContent(dataUrl);
    setStatus(`Saved edits to ${selected.split('/').pop()}`);
  },[selected]);

  const applyFix=useCallback((modelPath:string,refKey:string,newValue:string)=>{
    const content=fileDataRef.current[modelPath];
    if(!content)return;
    try{
      const json=JSON.parse(content);
      if(json.textures)json.textures[refKey]=newValue;
      const updated=JSON.stringify(json,null,2);
      fileDataRef.current[modelPath]=updated;
      if(selected===modelPath)setSelectedContent(updated);
      setRevision(r=>r+1);
      setStatus(`Fixed: "${refKey}" → "${newValue}" in ${modelPath.split('/').pop()}`);
    }catch(e:any){setStatus('Fix failed: '+e.message);}
  },[selected]);

  const applyAllFixes=useCallback((fixMap:Record<string,string>)=>{
    setIsAnalyzing(true);setLoadingMsg('Applying fixes…');
    // Use requestAnimationFrame to ensure the overlay actually paints before we block
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      // Group fixes by model — one JSON.parse per model instead of one per ref
      const byModel:Record<string,Array<{key:string,val:string}>>={};
      for(const[id,newValue] of Object.entries(fixMap)){
        if(!newValue.trim())continue;
        const sep=id.indexOf('::');if(sep<0)continue;
        const mp=id.slice(0,sep),key=id.slice(sep+2);
        if(!fileDataRef.current[mp])continue;
        (byModel[mp]||(byModel[mp]=[])).push({key,val:newValue});
      }
      let count=0;const modified=new Set<string>();
      for(const[mp,fixes] of Object.entries(byModel)){
        try{
          const json=JSON.parse(fileDataRef.current[mp]);
          if(json.textures){
            for(const{key,val} of fixes){json.textures[key]=val;count++;}
            fileDataRef.current[mp]=JSON.stringify(json,null,2);
            modified.add(mp);
          }
        }catch{}
      }
      if(selected&&modified.has(selected))setSelectedContent(fileDataRef.current[selected]);
      setStatus(`Applied ${count} fix${count!==1?'es':''} across ${modified.size} model${modified.size!==1?'s':''}`);
      setLoadingMsg('Re-analysing…');
      setRevision(r=>r+1);
    }));
  },[selected]);

  const clearAll=useCallback(()=>{
    fileDataRef.current={};setFilePaths([]);setSelected(null);setSelectedContent(null);setStatus('No pack loaded');setRevision(0);
  },[]);

  const deleteTextures=useCallback((paths:string[])=>{
    for(const p of paths)delete fileDataRef.current[p];
    const updatedPaths=Object.keys(fileDataRef.current);
    setFilePaths(updatedPaths);
    if(selected&&paths.includes(selected)){setSelected(null);setSelectedContent(null);}
    setRevision(r=>r+1);
    setStatus(`Deleted ${paths.length} texture${paths.length!==1?'s':''}`);
  },[selected]);

  // Rename a file: update key in fileDataRef, update all JSON model texture refs
  const renameFile=useCallback((oldPath:string,newPath:string)=>{
    if(!oldPath||!newPath||oldPath===newPath)return;
    const data=fileDataRef.current;
    if(!data[oldPath])return;
    // Move the data
    data[newPath]=data[oldPath];
    delete data[oldPath];
    // Update model JSON references that point to this texture
    const oldNorm=oldPath.replace(/^.*?textures\//,'').replace(/\.(png|jpg|jpeg)$/i,'').toLowerCase();
    const newNorm=newPath.replace(/^.*?textures\//,'').replace(/\.(png|jpg|jpeg)$/i,'').toLowerCase();
    if(oldNorm!==newNorm){
      for(const p of Object.keys(data)){
        if(!p.endsWith('.json'))continue;
        try{
          const json=JSON.parse(data[p]);
          let changed=false;
          if(json.textures){
            for(const k of Object.keys(json.textures)){
              const v:string=json.textures[k];
              const vn=v.replace(/^minecraft:/,'').toLowerCase();
              if(vn===oldNorm||vn==='textures/'+oldNorm){json.textures[k]=newNorm;changed=true;}
            }
            if(changed)data[p]=JSON.stringify(json,null,2);
          }
        }catch{}
      }
    }
    const updatedPaths=Object.keys(data);
    setFilePaths(updatedPaths);
    if(selected===oldPath){setSelected(newPath);setSelectedContent(data[newPath]);}
    setRevision(r=>r+1);
    setStatus(`Renamed: ${oldPath.split('/').pop()} → ${newPath.split('/').pop()}`);
  },[selected]);

  const exportZip=async()=>{
    try{
      const zip=new JSZip();
      for(const[path,content] of Object.entries(fileDataRef.current)){
        if(typeof content==='string'&&content.startsWith('data:')){
          zip.file(path,content.split(',')[1],{base64:true});
        }else{zip.file(path,content);}
      }
      const blob=await zip.generateAsync({type:'blob'});
      const url=URL.createObjectURL(blob);
      const a=document.createElement('a');a.href=url;a.download='resource_pack.zip';a.click();
      URL.revokeObjectURL(url);setStatus('Exported resource_pack.zip');
    }catch(e:any){setStatus('Export error: '+e.message);}
  };

  const ext=selected?selected.split('.').pop()!.toLowerCase():'';
  const isImage=['png','jpg','jpeg'].includes(ext);
  const isAudio=['ogg','mp3','wav'].includes(ext);
  const isMeta=!!selected?.includes('pack.mcmeta');
  const isJson=ext==='json'&&!isMeta;
  const issueCount=analysis?.issues?.length??0;

  const NAV_TABS=[
    {id:'overview',label:'Overview'},
    {id:'textures',label:'Textures'},
    {id:'models',label:'Models',badge:issueCount},
    {id:'issues',label:'Issues',badge:issueCount},
    {id:'editor',label:'Editor'},
    {id:'diff',label:'Diff'},
  ];

  return(
    <>
      <style>{css}</style>
      <div className="root">
        {isAnalyzing&&(
          <div className="loading-overlay">
            <div className="loading-box">
              <div className="spinner"/>
              <div className="loading-label">{loadingMsg||'Processing…'}</div>
              <div className="loading-sub">Please wait</div>
            </div>
          </div>
        )}
        <div className="topbar">
          <Link href="/" style={{textDecoration:'none'}}><button className="btn">← HOME</button></Link>
          <div className="logo">JOD<span>craft</span> · Pack Editor</div>
          <div style={{flex:1}}/>
          {fileCount>0&&<>
            <button className="btn" onClick={exportZip}>Export .zip</button>
            <button className="btn danger" onClick={clearAll}>Clear</button>
          </>}
          <button className="btn" onClick={()=>fileInputRef.current.click()}>{fileCount>0?'Load new':'Open .zip'}</button>
          <input ref={fileInputRef} type="file" accept=".zip" style={{display:'none'}} onChange={handleFileChange}/>
        </div>

        {fileCount>0&&(
          <div className="navtabs">
            {NAV_TABS.map(({id,label,badge})=>(
              <div key={id} className={`navtab${mainTab===id?' active':''}`} onClick={()=>setMainTab(id)}>
                {label}
                {badge!=null&&badge>0&&<span className="cnt">{badge}</span>}
              </div>
            ))}
          </div>
        )}

        <div className="tab-content">
          {fileCount===0?(
            <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',padding:32}}
              onDrop={handleDrop} onDragOver={(e:any)=>{e.preventDefault();setDragging(true);}} onDragLeave={()=>setDragging(false)}>
              <div className={`drop-zone${dragging?' drag':''}`} style={{width:'100%',maxWidth:480}} onClick={()=>fileInputRef.current.click()}>
                <div style={{fontSize:36,marginBottom:16}}>▦</div>
                <div style={{fontSize:14,marginBottom:8,color:TEXT}}>Drop your resource pack .zip here</div>
                <div style={{fontSize:11,marginBottom:20,color:DIM}}>or click to browse</div>
                <button className="btn">Browse file</button>
              </div>
            </div>
          ):analysis?(
            <>
              {mainTab==='overview'&&<OverviewTab analysis={analysis} fileCount={fileCount} setMainTab={setMainTab}/>}
              {mainTab==='textures'&&<TextureGrid analysis={analysis} fileData={fileDataRef.current} onOpenInEditor={openInEditor} onDeleteTextures={deleteTextures}/>}
              {mainTab==='models'&&<ModelsView analysis={analysis} fileData={fileDataRef.current} onApplyFix={applyFix} onOpenInEditor={openInEditor}/>}
              {mainTab==='issues'&&<IssuesView analysis={analysis} fileData={fileDataRef.current} onApplyFix={applyFix} onApplyAllFixes={applyAllFixes} onOpenInEditor={openInEditor}/>}
              {mainTab==='diff'&&<PackDiffView fileDataA={fileDataRef.current} filePathsA={filePaths}/>}
              {mainTab==='editor'&&(
                <div className="editor-layout">
                  <div className="sidebar">
                    <div className="sidebar-title">Pack files</div>
                    <div className="tree">
                      <div style={{padding:'2px 8px 4px',fontSize:9,color:DIM,letterSpacing:'1px'}}>double-click to rename</div>
                      {Object.entries(tree).sort(([,a],[,b]:any)=>(typeof a==='object'&&a!==null?-1:0)-(typeof b==='object'&&b!==null?-1:0)).map(([k,v])=>(
                        <TreeNode key={k} name={k} node={v} path="" depth={0} selected={selected} onSelect={openInEditor} onRename={renameFile}/>
                      ))}
                    </div>
                  </div>
                  <div className="center">
                    {!selected?(
                      <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',color:DIM,flexDirection:'column',gap:8}}>
                        <div style={{fontSize:28}}>▦</div><div>Select a file from the tree</div>
                      </div>
                    ):(
                      <>
                        <div className="tab-bar">
                          {isImage&&<div className={`tab${editorTab==='preview'?' active':''}`} onClick={()=>setEditorTab('preview')}>Preview</div>}
                          {isImage&&<div className={`tab${editorTab==='paint'?' active':''}`} onClick={()=>setEditorTab('paint')}>✏ Paint</div>}
                          {isAudio&&<div className={`tab${editorTab==='audio'?' active':''}`} onClick={()=>setEditorTab('audio')}>♪ Audio</div>}
                          {isMeta&&<div className={`tab${editorTab==='meta'?' active':''}`} onClick={()=>setEditorTab('meta')}>Form</div>}
                          {(isJson||isMeta)&&<div className={`tab${editorTab==='editor'?' active':''}`} onClick={()=>setEditorTab('editor')}>JSON</div>}
                          {isJson&&<div className={`tab${editorTab==='3d'?' active':''}`} onClick={()=>setEditorTab('3d')}>◈ 3D View</div>}
                          {!isImage&&!isAudio&&!isJson&&!isMeta&&<div className={`tab${editorTab==='editor'?' active':''}`} onClick={()=>setEditorTab('editor')}>Raw</div>}
                          <div style={{padding:'6px 10px',fontSize:11,color:DIM,marginLeft:'auto',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{selected.split('/').slice(-2).join('/')}</div>
                        </div>
                        {editorTab==='3d'&&isJson?(
                          // 3D split layout — no editor-area padding, fills remaining height
                          <div style={{flex:1,display:'flex',overflow:'hidden',minHeight:0}}>
                            {/* Left: 3D viewer + texture slots */}
                            <div style={{flex:1,minWidth:0,overflow:'auto',padding:'12px 16px'}}>
                              <ModelViewer3D
                                modelContent={selectedContent??''}
                                fileData={fileDataRef.current}
                                texturePaths={filePaths.filter(p=>/\.(png|jpg|jpeg)$/i.test(p))}
                                revision={revision}
                                onSelectTexture={setPainting3dTex}
                              />
                            </div>
                            {/* Right: texture painter panel (or hint) */}
                            {painting3dTex?(
                              <div style={{width:290,borderLeft:`2px solid ${BORDER}`,display:'flex',flexDirection:'column',flexShrink:0,overflow:'hidden'}}>
                                {/* Panel header */}
                                <div style={{padding:'8px 12px',background:BG2,borderBottom:`1px solid ${BORDER}`,display:'flex',alignItems:'center',gap:8,flexShrink:0}}>
                                  <img src={fileDataRef.current[painting3dTex]} style={{width:22,height:22,imageRendering:'pixelated',objectFit:'contain',background:'#070910',border:`1px solid ${BORDER}`,flexShrink:0}} alt=""/>
                                  <span style={{flex:1,fontSize:10,color:ACCENT2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                                    ✏ {painting3dTex.split('/').pop()}
                                  </span>
                                  <button className="btn sm" onClick={()=>setPainting3dTex(null)}>✕</button>
                                </div>
                                {/* Painter */}
                                <div style={{flex:1,overflow:'auto',padding:'12px',minHeight:0}}>
                                  <PixelPainter
                                    compact={true}
                                    dataUrl={fileDataRef.current[painting3dTex]}
                                    onSave={(dataUrl:string)=>{
                                      fileDataRef.current[painting3dTex]=dataUrl;
                                      setRevision(r=>r+1);
                                      setStatus(`Saved edits to ${painting3dTex.split('/').pop()}`);
                                    }}
                                  />
                                </div>
                              </div>
                            ):(
                              <div style={{width:200,display:'flex',alignItems:'center',justifyContent:'center',color:DIM,fontSize:11,padding:20,textAlign:'center',flexShrink:0,borderLeft:`1px solid ${BORDER}`}}>
                                <div>
                                  <div style={{fontSize:28,marginBottom:8,color:BORDER}}>◈</div>
                                  Click a texture below the 3D view to paint it
                                </div>
                              </div>
                            )}
                          </div>
                        ):(
                          <div className="editor-area">
                            {editorTab==='preview'&&isImage&&<div><img src={selectedContent!} style={{imageRendering:'pixelated',border:`1px solid ${BORDER}`,maxWidth:'100%'}} alt={selected}/><div style={{marginTop:8,fontSize:11,color:DIM}}>Switch to ✏ Paint to edit pixels</div></div>}
                            {editorTab==='paint'&&isImage&&<PixelPainter dataUrl={selectedContent} onSave={saveTexture}/>}
                            {editorTab==='audio'&&isAudio&&<AudioPlayer dataUrl={selectedContent} name={selected.split('/').pop()}/>}
                            {editorTab==='meta'&&isMeta&&<PackMetaEditor content={selectedContent} onChange={updateContent}/>}
                            {editorTab==='editor'&&(isJson||isMeta)&&<JsonEditor content={selectedContent} onChange={updateContent}/>}
                            {editorTab==='editor'&&!isJson&&!isMeta&&!isImage&&!isAudio&&<textarea className="code" value={selectedContent||''} onChange={e=>updateContent(e.target.value)} spellCheck={false}/>}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
            </>
          ):null}
        </div>

        <div className="status-bar">
          <span>{status}</span>
          {fileCount>0&&<>
            <span><b>{fileCount}</b> files</span>
            <span><b>{textureCount}</b> textures</span>
            {audioCount>0&&<span><b>{audioCount}</b> sounds</span>}
            {issueCount>0&&<span style={{color:ERR}}><b>{issueCount}</b> broken refs</span>}
          </>}
        </div>
      </div>
    </>
  );
}

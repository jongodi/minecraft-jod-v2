'use client';

import Link from 'next/link';
import { useState, useRef, useEffect, useCallback } from "react";
import JSZip from "jszip";

const VANILLA_PREFIXES = ["block/","item/","entity/","gui/","environment/","font/","map/","misc/","mob_effect/","painting/","particle/","colormap/","effect/","models/","textures/","sounds/"];
function isLikelyVanilla(path) { return VANILLA_PREFIXES.some(p => path.toLowerCase().includes(p)); }

const BG="#0d0f12",BG2="#13161b",BG3="#1a1e26",BORDER="#2a3040",ACCENT="#4ade80",ACCENT2="#22d3ee",DIM="#4a5568",TEXT="#e2e8f0",TEXT2="#94a3b8",WARN="#f59e0b",ERR="#f87171";
const PX=`font-family:'Courier New',monospace`;

const css=`
*{box-sizing:border-box;margin:0;padding:0}
::-webkit-scrollbar{width:6px;height:6px}
::-webkit-scrollbar-track{background:${BG}}
::-webkit-scrollbar-thumb{background:${BORDER};border-radius:2px}
.root{display:flex;flex-direction:column;height:100vh;min-height:600px;background:${BG};${PX};font-size:13px;color:${TEXT}}
.topbar{display:flex;align-items:center;gap:10px;padding:8px 12px;background:${BG2};border-bottom:2px solid ${BORDER};flex-shrink:0}
.logo{color:${ACCENT};font-size:15px;font-weight:700;letter-spacing:2px}
.logo span{color:${ACCENT2}}
.btn{background:${BG3};border:1px solid ${BORDER};color:${TEXT};padding:5px 12px;cursor:pointer;font-family:inherit;font-size:12px;letter-spacing:1px;text-transform:uppercase}
.btn:hover{border-color:${ACCENT};color:${ACCENT}}
.btn.active{border-color:${ACCENT};color:${ACCENT};background:#0a1a0a}
.btn.danger:hover{border-color:${ERR};color:${ERR}}
.main{display:flex;flex:1;overflow:hidden;position:relative}
.sidebar{width:220px;min-width:180px;background:${BG2};border-right:2px solid ${BORDER};display:flex;flex-direction:column;overflow:hidden}
.sidebar-title{padding:8px 10px;font-size:10px;color:${DIM};letter-spacing:2px;text-transform:uppercase;border-bottom:1px solid ${BORDER};flex-shrink:0}
.tree{flex:1;overflow-y:auto;padding:4px 0}
.tree-node{padding:3px 8px 3px calc(8px + var(--depth)*14px);cursor:pointer;display:flex;align-items:center;gap:6px;color:${TEXT2};font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tree-node:hover{background:${BG3};color:${TEXT}}
.tree-node.selected{background:#0a1a0a;color:${ACCENT};border-left:2px solid ${ACCENT}}
.center{flex:1;display:flex;flex-direction:column;overflow:hidden}
.tab-bar{display:flex;background:${BG2};border-bottom:2px solid ${BORDER};flex-shrink:0;overflow-x:auto}
.tab{padding:6px 14px;cursor:pointer;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:${DIM};border-right:1px solid ${BORDER};white-space:nowrap;flex-shrink:0}
.tab:hover{color:${TEXT2}}
.tab.active{color:${ACCENT};background:${BG};border-bottom:2px solid ${ACCENT}}
.editor-area{flex:1;overflow:auto;padding:16px}
.drawer{position:absolute;right:0;top:0;bottom:0;width:340px;background:${BG2};border-left:2px solid ${BORDER};display:flex;flex-direction:column;z-index:10;transform:translateX(100%);transition:transform 0.2s}
.drawer.open{transform:translateX(0)}
.drawer-title{padding:10px 12px;font-size:10px;color:${DIM};letter-spacing:2px;text-transform:uppercase;border-bottom:1px solid ${BORDER};display:flex;justify-content:space-between;align-items:center;flex-shrink:0}
.status-bar{background:${BG2};border-top:1px solid ${BORDER};padding:4px 12px;font-size:11px;color:${DIM};flex-shrink:0;display:flex;gap:16px;flex-wrap:wrap}
.status-bar b{color:${ACCENT}}
.badge{display:inline-block;padding:1px 6px;font-size:10px;border:1px solid;letter-spacing:1px}
.badge.vanilla{border-color:${ACCENT2};color:${ACCENT2}}
.badge.linked{border-color:${ACCENT};color:${ACCENT}}
.badge.unverified{border-color:${WARN};color:${WARN}}
.field{margin-bottom:14px}
.field label{display:block;font-size:10px;color:${DIM};letter-spacing:1px;text-transform:uppercase;margin-bottom:4px}
.field input,.field textarea{width:100%;background:${BG3};border:1px solid ${BORDER};color:${TEXT};padding:6px 8px;font-family:inherit;font-size:12px;outline:none}
.field input:focus,.field textarea:focus{border-color:${ACCENT}}
.field textarea{resize:vertical;min-height:80px}
.drop-zone{border:2px dashed ${BORDER};padding:40px;text-align:center;color:${DIM};cursor:pointer;transition:border-color 0.2s}
.drop-zone:hover,.drop-zone.drag{border-color:${ACCENT};color:${TEXT}}
.node-item{padding:8px 10px;border-bottom:1px solid ${BORDER};display:flex;flex-direction:column;gap:4px}
.node-item:hover{background:${BG3}}
.node-path{font-size:11px;color:${TEXT2};overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.node-refs{font-size:10px;color:${DIM}}
.section-head{font-size:10px;color:${DIM};letter-spacing:2px;text-transform:uppercase;padding:8px 10px 4px;border-bottom:1px solid ${BORDER}}
.err-line{background:#2a1010;color:${ERR};font-size:11px;padding:3px 8px;border-left:2px solid ${ERR};margin-bottom:2px;white-space:pre-wrap;word-break:break-all}
.json-editor-wrap{position:relative;width:100%}
.line-nums{position:absolute;left:0;top:0;width:36px;padding:10px 4px;font-size:11px;line-height:1.5;color:${DIM};text-align:right;user-select:none;pointer-events:none;white-space:pre}
textarea.code{background:${BG};border:1px solid ${BORDER};color:${ACCENT2};font-size:11px;padding:10px 10px 10px 44px;width:100%;min-height:300px;resize:vertical;outline:none;font-family:'Courier New',monospace;line-height:1.5;tab-size:2}
textarea.code:focus{border-color:${ACCENT2}}
textarea.code.has-errors{border-color:${ERR}}
`;

function buildTree(files) {
  const root={};
  for(const path of Object.keys(files)){
    const parts=path.split("/");let node=root;
    for(let i=0;i<parts.length;i++){
      const p=parts[i];
      if(!node[p])node[p]=i===parts.length-1?null:{};
      if(i<parts.length-1)node=node[p];
    }
  }
  return root;
}

function TreeNode({name,node,path,depth,selected,onSelect}){
  const[open,setOpen]=useState(depth<2);
  const isDir=node!==null&&typeof node==="object";
  const full=path?`${path}/${name}`:name;
  const ext=name.split(".").pop().toLowerCase();
  const icon=isDir?(open?"▼":"►"):ext==="png"?"▪":ext==="json"?"{}":ext==="mcmeta"?"⚙":ext==="ogg"?"♪":"·";
  if(isDir)return(
    <div>
      <div className="tree-node" style={{"--depth":depth}} onClick={()=>setOpen(o=>!o)}>
        <span style={{color:DIM,fontSize:11,flexShrink:0}}>{icon}</span>
        <span style={{color:TEXT2}}>{name}</span>
      </div>
      {open&&Object.entries(node).sort(([,a],[,b])=>(typeof a==="object"&&a!==null?-1:0)-(typeof b==="object"&&b!==null?-1:0)).map(([k,v])=>(
        <TreeNode key={k} name={k} node={v} path={full} depth={depth+1} selected={selected} onSelect={onSelect}/>
      ))}
    </div>
  );
  return(
    <div className={`tree-node${selected===full?" selected":""}`} style={{"--depth":depth}} onClick={()=>onSelect(full)}>
      <span style={{color:ext==="png"?ACCENT2:ext==="ogg"?"#a78bfa":ext==="json"?WARN:DIM,fontSize:11,flexShrink:0}}>{icon}</span>
      <span>{name}</span>
    </div>
  );
}

// ── Pixel Painter ──────────────────────────────────────────────────────────────
function PixelPainter({dataUrl,onSave}){
  const canvasRef=useRef();const overlayRef=useRef();
  const[scale,setScale]=useState(8);const[color,setColor]=useState("#4ade80");
  const[tool,setTool]=useState("pen");const[painting,setPainting]=useState(false);
  const imgData=useRef(null);

  const load=useCallback((s=scale)=>{
    const img=new Image();
    img.onload=()=>{
      const c=canvasRef.current;if(!c)return;
      c.width=img.width;c.height=img.height;
      const ctx=c.getContext("2d");ctx.imageSmoothingEnabled=false;
      ctx.drawImage(img,0,0);
      imgData.current=ctx.getImageData(0,0,img.width,img.height);
      const ov=overlayRef.current;
      ov.width=img.width*s;ov.height=img.height*s;
    };img.src=dataUrl;
  },[dataUrl]);

  useEffect(()=>{load();},[dataUrl]);

  const drawOverlay=useCallback((s=scale)=>{
    const c=canvasRef.current;const ov=overlayRef.current;if(!c||!ov)return;
    ov.width=c.width*s;ov.height=c.height*s;
    const ctx=ov.getContext("2d");ctx.imageSmoothingEnabled=false;
    ctx.drawImage(c,0,0,c.width*s,c.height*s);
    ctx.strokeStyle="rgba(255,255,255,0.08)";
    for(let x=0;x<=c.width;x++){ctx.beginPath();ctx.moveTo(x*s,0);ctx.lineTo(x*s,ov.height);ctx.stroke();}
    for(let y=0;y<=c.height;y++){ctx.beginPath();ctx.moveTo(0,y*s);ctx.lineTo(ov.width,y*s);ctx.stroke();}
  },[scale]);

  const paint=(e)=>{
    const ov=overlayRef.current;const c=canvasRef.current;if(!ov||!c)return;
    const rect=ov.getBoundingClientRect();
    const px=Math.floor((e.clientX-rect.left)/scale);
    const py=Math.floor((e.clientY-rect.top)/scale);
    if(px<0||py<0||px>=c.width||py>=c.height)return;
    const ctx=c.getContext("2d");
    if(tool==="picker"){
      const d=ctx.getImageData(px,py,1,1).data;
      setColor(`#${[d[0],d[1],d[2]].map(v=>v.toString(16).padStart(2,"0")).join("")}`);
      return;
    }
    const r=parseInt(color.slice(1,3),16),g=parseInt(color.slice(3,5),16),b=parseInt(color.slice(5,7),16);
    if(tool==="eraser"){ctx.clearRect(px,py,1,1);}
    else{ctx.fillStyle=color;ctx.fillRect(px,py,1,1);}
    drawOverlay();
  };

  const changeScale=(s)=>{setScale(s);drawOverlay(s);};

  const save=()=>{
    const c=canvasRef.current;if(!c)return;
    onSave(c.toDataURL("image/png"));
  };

  return(
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
        {["pen","eraser","picker"].map(t=>(
          <button key={t} className={`btn${tool===t?" active":""}`} onClick={()=>setTool(t)}>{t==="pen"?"✏ Pen":t==="eraser"?"◻ Erase":"✦ Pick"}</button>
        ))}
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          <label style={{fontSize:11,color:DIM}}>Color</label>
          <input type="color" value={color} onChange={e=>setColor(e.target.value)} style={{width:32,height:28,padding:2,background:BG3,border:`1px solid ${BORDER}`,cursor:"pointer"}}/>
          <span style={{fontSize:11,color:DIM,fontFamily:"monospace"}}>{color}</span>
        </div>
        <div style={{marginLeft:"auto",display:"flex",gap:4}}>
          {[4,8,12,16].map(s=><button key={s} className={`btn${scale===s?" active":""}`} onClick={()=>changeScale(s)}>{s}x</button>)}
        </div>
      </div>
      <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
        <div style={{position:"relative",display:"inline-block"}}>
          <canvas ref={canvasRef} style={{display:"none"}}/>
          <canvas ref={overlayRef} style={{imageRendering:"pixelated",cursor:tool==="picker"?"crosshair":tool==="eraser"?"cell":"crosshair",border:`1px solid ${BORDER}`,maxWidth:"100%"}}
            onMouseDown={e=>{setPainting(true);paint(e);}}
            onMouseMove={e=>{if(painting)paint(e);}}
            onMouseUp={()=>setPainting(false)}
            onMouseLeave={()=>setPainting(false)}
          />
        </div>
      </div>
      <button className="btn active" onClick={save} style={{alignSelf:"flex-start"}}>Save changes to pack</button>
    </div>
  );
}

// ── Audio Player ───────────────────────────────────────────────────────────────
function AudioPlayer({dataUrl,name}){
  const[playing,setPlaying]=useState(false);const[time,setTime]=useState(0);const[dur,setDur]=useState(0);
  const audRef=useRef();
  useEffect(()=>{
    if(audRef.current){audRef.current.pause();audRef.current.src=dataUrl;setTime(0);setPlaying(false);}
  },[dataUrl]);
  const toggle=()=>{
    const a=audRef.current;if(!a)return;
    if(playing){a.pause();setPlaying(false);}else{a.play();setPlaying(true);}
  };
  const fmt=s=>`${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,"0")}`;
  return(
    <div style={{display:"flex",flexDirection:"column",gap:16,maxWidth:420}}>
      <audio ref={audRef} onTimeUpdate={e=>setTime(e.target.currentTime)} onLoadedMetadata={e=>setDur(e.target.duration)} onEnded={()=>setPlaying(false)}/>
      <div style={{background:BG2,border:`1px solid ${BORDER}`,padding:20,display:"flex",flexDirection:"column",gap:12}}>
        <div style={{fontSize:13,color:ACCENT2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>♪ {name}</div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <button className={`btn${playing?" active":""}`} onClick={toggle} style={{width:70}}>{playing?"■ Stop":"▶ Play"}</button>
          <div style={{flex:1,height:4,background:BORDER,cursor:"pointer",position:"relative"}} onClick={e=>{
            const r=e.currentTarget.getBoundingClientRect();
            const ratio=(e.clientX-r.left)/r.width;
            if(audRef.current){audRef.current.currentTime=ratio*dur;setTime(ratio*dur);}
          }}>
            <div style={{position:"absolute",left:0,top:0,height:"100%",width:`${dur?time/dur*100:0}%`,background:ACCENT2,transition:"width 0.1s"}}/>
          </div>
          <span style={{fontSize:11,color:DIM,minWidth:72,textAlign:"right"}}>{fmt(time)} / {fmt(dur||0)}</span>
        </div>
      </div>
      <div style={{fontSize:11,color:DIM}}>Minecraft uses OGG Vorbis. Playback quality depends on browser support.</div>
    </div>
  );
}

// ── JSON Editor with validation ────────────────────────────────────────────────
function JsonEditor({content,onChange}){
  const[errors,setErrors]=useState([]);
  const taRef=useRef();

  const validate=(val)=>{
    try{JSON.parse(val);setErrors([]);}
    catch(e){
      const msg=e.message;
      const lineMatch=msg.match(/line (\d+)/i);
      const colMatch=msg.match(/column (\d+)/i);
      setErrors([{line:lineMatch?parseInt(lineMatch[1]):null,col:colMatch?parseInt(colMatch[1]):null,msg}]);
    }
  };

  const handle=(e)=>{const v=e.target.value;onChange(v);validate(v);};
  useEffect(()=>{validate(content||"");},[]);

  const lines=((content||"").match(/\n/g)||[]).length+1;
  const lineNums=Array.from({length:lines},(_,i)=>i+1).join("\n");

  return(
    <div style={{maxWidth:700}}>
      {errors.length>0&&(
        <div style={{marginBottom:8}}>
          {errors.map((e,i)=>(
            <div key={i} className="err-line">
              ✕ {e.line?`Line ${e.line}${e.col?`, col ${e.col}`:""}:`:""} {e.msg}
            </div>
          ))}
        </div>
      )}
      <div className="json-editor-wrap">
        <div className="line-nums">{lineNums}</div>
        <textarea ref={taRef} className={`code${errors.length>0?" has-errors":""}`} value={content||""} onChange={handle} spellCheck={false}/>
      </div>
      {errors.length===0&&content?.trim()&&<div style={{marginTop:6,fontSize:11,color:ACCENT}}>✓ Valid JSON</div>}
    </div>
  );
}

// ── Pack Meta ──────────────────────────────────────────────────────────────────
function PackMetaEditor({content,onChange}){
  let parsed={};try{parsed=JSON.parse(content);}catch{}
  const desc=parsed?.pack?.description??"";const fmt=parsed?.pack?.pack_format??34;
  const upd=(field,val)=>{const u={...parsed,pack:{...parsed.pack,[field]:val}};onChange(JSON.stringify(u,null,2));};
  return(
    <div style={{maxWidth:480}}>
      <div className="field"><label>Pack format</label><input type="number" value={fmt} onChange={e=>upd("pack_format",parseInt(e.target.value)||34)}/></div>
      <div className="field"><label>Description</label><textarea value={desc} onChange={e=>upd("description",e.target.value)}/></div>
      <div style={{fontSize:11,color:DIM}}>Format 34 = 1.20.3–1.20.4 · 46 = 1.21+</div>
    </div>
  );
}

// ── Dependency Drawer ──────────────────────────────────────────────────────────
function DependencyDrawer({open,onClose,files,textureRefs}){
  const textures=Object.keys(files).filter(f=>f.endsWith(".png"));
  const jsonFiles=Object.keys(files).filter(f=>f.endsWith(".json")&&!f.includes("pack.mcmeta"));
  return(
    <div className={`drawer${open?" open":""}`}>
      <div className="drawer-title"><span>Dependency graph</span><button className="btn" onClick={onClose}>✕</button></div>
      <div style={{flex:1,overflowY:"auto"}}>
        <div className="section-head">Textures ({textures.length})</div>
        {textures.length===0&&<div style={{padding:"12px 10px",color:DIM,fontSize:11}}>No textures loaded</div>}
        {textures.map(t=>{
          const linkedBy=jsonFiles.filter(j=>(textureRefs[j]||[]).some(r=>t.includes(r)||r.includes(t.replace(/^.*textures\//,"").replace(".png",""))));
          const vanilla=isLikelyVanilla(t);
          const status=linkedBy.length>0?"linked":vanilla?"vanilla":"unverified";
          return(
            <div key={t} className="node-item">
              <div style={{display:"flex",gap:6,alignItems:"center"}}><span className={`badge ${status}`}>{status}</span></div>
              <div className="node-path">{t.split("/").slice(-3).join("/")}</div>
              {linkedBy.length>0&&<div className="node-refs">← {linkedBy.map(j=>j.split("/").pop()).join(", ")}</div>}
              {status==="vanilla"&&<div className="node-refs" style={{color:ACCENT2}}>Matches vanilla naming — implicitly valid</div>}
              {status==="unverified"&&<div className="node-refs" style={{color:WARN}}>No local JSON ref · non-standard name</div>}
            </div>
          );
        })}
        {jsonFiles.length>0&&<>
          <div className="section-head">JSON models ({jsonFiles.length})</div>
          {jsonFiles.map(j=>(
            <div key={j} className="node-item">
              <div className="node-path">{j.split("/").slice(-3).join("/")}</div>
              <div className="node-refs">refs: {(textureRefs[j]||[]).length>0?(textureRefs[j]||[]).join(", "):"none detected"}</div>
            </div>
          ))}
        </>}
      </div>
    </div>
  );
}

// ── Main App ───────────────────────────────────────────────────────────────────
function parseTextureRefs(fs){
  const refs={};
  for(const[path,content]of Object.entries(fs)){
    if(!path.endsWith(".json")||path.includes("pack.mcmeta"))continue;
    try{
      const p=JSON.parse(content);const found=[];
      const tx=p?.textures;
      if(tx&&typeof tx==="object")for(const v of Object.values(tx))if(typeof v==="string")found.push(v);
      refs[path]=found;
    }catch{refs[path]=[];}
  }
  return refs;
}

export default function App(){
  const[files,setFiles]=useState({});
  const[selected,setSelected]=useState(null);
  const[tab,setTab]=useState("preview");
  const[drawerOpen,setDrawerOpen]=useState(false);
  const[dragging,setDragging]=useState(false);
  const[status,setStatus]=useState("No pack loaded");
  const[textureRefs,setTextureRefs]=useState({});
  const fileInputRef=useRef();

  const loadZip=async(file)=>{
    try{
      const zip=await JSZip.loadAsync(file);
      const loaded={};const promises=[];
      zip.forEach((relPath,zipEntry)=>{
        if(zipEntry.dir)return;
        const ext=relPath.split(".").pop().toLowerCase();
        if(["png","jpg","jpeg"].includes(ext)){
          promises.push(zipEntry.async("base64").then(b64=>{loaded[relPath]=`data:image/${ext};base64,${b64}`;}));
        }else if(ext==="ogg"||ext==="mp3"||ext==="wav"){
          promises.push(zipEntry.async("base64").then(b64=>{loaded[relPath]=`data:audio/${ext};base64,${b64}`;}));
        }else if(["json","mcmeta","txt","md"].includes(ext)||relPath.includes("pack")){
          promises.push(zipEntry.async("string").then(s=>{loaded[relPath]=s;}));
        }
      });
      await Promise.all(promises);
      setFiles(loaded);setTextureRefs(parseTextureRefs(loaded));
      setStatus(`Loaded ${Object.keys(loaded).length} files from ${file.name}`);
      setSelected(null);
    }catch(e){setStatus("Error loading zip: "+e.message);}
  };

  const handleDrop=useCallback(e=>{e.preventDefault();setDragging(false);const f=e.dataTransfer.files[0];if(f&&f.name.endsWith(".zip"))loadZip(f);},[]);
  const handleFileChange=e=>{const f=e.target.files[0];if(f)loadZip(f);};

  const handleSelect=(path)=>{
    setSelected(path);
    const ext=path.split(".").pop().toLowerCase();
    if(["png","jpg","jpeg"].includes(ext))setTab("preview");
    else if(["ogg","mp3","wav"].includes(ext))setTab("audio");
    else if(path.includes("pack.mcmeta"))setTab("meta");
    else setTab("editor");
  };

  const updateContent=(val)=>{
    const updated={...files,[selected]:val};
    setFiles(updated);
    if(selected?.endsWith(".json")||selected?.includes("pack.mcmeta"))setTextureRefs(parseTextureRefs(updated));
  };

  const saveTexture=(dataUrl)=>{
    setFiles(f=>({...f,[selected]:dataUrl}));
    setStatus(`Saved edits to ${selected?.split("/").pop()}`);
  };

  const exportZip=async()=>{
    try{
      const zip=new JSZip();
      for(const[path,content]of Object.entries(files)){
        if(typeof content==="string"&&content.startsWith("data:")){
          zip.file(path,content.split(",")[1],{base64:true});
        }else{zip.file(path,content);}
      }
      const blob=await zip.generateAsync({type:"blob"});
      const url=URL.createObjectURL(blob);
      const a=document.createElement("a");a.href=url;a.download="resource_pack.zip";a.click();
      URL.revokeObjectURL(url);setStatus("Exported resource_pack.zip");
    }catch(e){setStatus("Export error: "+e.message);}
  };

  const ext=selected?selected.split(".").pop().toLowerCase():"";
  const isImage=["png","jpg","jpeg"].includes(ext);
  const isAudio=["ogg","mp3","wav"].includes(ext);
  const isMeta=selected?.includes("pack.mcmeta");
  const isJson=ext==="json"&&!isMeta;
  const fileCount=Object.keys(files).length;
  const textureCount=Object.keys(files).filter(f=>f.endsWith(".png")).length;
  const audioCount=Object.keys(files).filter(f=>f.endsWith(".ogg")||f.endsWith(".mp3")).length;
  const tree=buildTree(files);

  return(
    <>
      <style>{css}</style>
      <div className="root">
        <div className="topbar">
          <Link href="/" style={{ textDecoration: "none" }}><button className="btn">← HOME</button></Link>
          <div className="logo">JOD<span>craft</span> · Pack Editor</div>
          <div style={{flex:1}}/>
          {fileCount>0&&<>
            <button className="btn" onClick={()=>setDrawerOpen(o=>!o)}>{drawerOpen?"Close graph":"Dep. Graph"}</button>
            <button className="btn" onClick={exportZip}>Export .zip</button>
            <button className="btn danger" onClick={()=>{setFiles({});setSelected(null);setStatus("No pack loaded");}}>Clear</button>
          </>}
          <button className="btn" onClick={()=>fileInputRef.current.click()}>{fileCount>0?"Load new":"Open .zip"}</button>
          <input ref={fileInputRef} type="file" accept=".zip" style={{display:"none"}} onChange={handleFileChange}/>
        </div>

        <div className="main" onDrop={handleDrop} onDragOver={e=>{e.preventDefault();setDragging(true);}} onDragLeave={()=>setDragging(false)}>
          {fileCount===0?(
            <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",padding:32}}>
              <div className={`drop-zone${dragging?" drag":""}`} style={{width:"100%",maxWidth:480}} onClick={()=>fileInputRef.current.click()}>
                <div style={{fontSize:32,marginBottom:16}}>▦</div>
                <div style={{fontSize:14,marginBottom:8,color:TEXT}}>Drop your resource pack .zip here</div>
                <div style={{fontSize:11,marginBottom:20}}>or click to browse</div>
                <button className="btn">Browse file</button>
              </div>
            </div>
          ):(
            <>
              <div className="sidebar">
                <div className="sidebar-title">Pack files</div>
                <div className="tree">
                  {Object.entries(tree).sort(([,a],[,b])=>(typeof a==="object"&&a!==null?-1:0)-(typeof b==="object"&&b!==null?-1:0)).map(([k,v])=>(
                    <TreeNode key={k} name={k} node={v} path="" depth={0} selected={selected} onSelect={handleSelect}/>
                  ))}
                </div>
              </div>

              <div className="center">
                {!selected?(
                  <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",color:DIM,flexDirection:"column",gap:8}}>
                    <div style={{fontSize:28}}>▦</div>
                    <div>Select a file from the tree</div>
                  </div>
                ):(
                  <>
                    <div className="tab-bar">
                      {isImage&&<div className={`tab${tab==="preview"?" active":""}`} onClick={()=>setTab("preview")}>Preview</div>}
                      {isImage&&<div className={`tab${tab==="paint"?" active":""}`} onClick={()=>setTab("paint")}>✏ Paint</div>}
                      {isAudio&&<div className={`tab${tab==="audio"?" active":""}`} onClick={()=>setTab("audio")}>♪ Audio</div>}
                      {isMeta&&<div className={`tab${tab==="meta"?" active":""}`} onClick={()=>setTab("meta")}>Form</div>}
                      {(isJson||isMeta)&&<div className={`tab${tab==="editor"?" active":""}`} onClick={()=>setTab("editor")}>JSON</div>}
                      {!isImage&&!isAudio&&!isJson&&!isMeta&&<div className={`tab${tab==="editor"?" active":""}`} onClick={()=>setTab("editor")}>Raw</div>}
                      <div style={{padding:"6px 10px",fontSize:11,color:DIM,marginLeft:"auto",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{selected.split("/").slice(-2).join("/")}</div>
                    </div>
                    <div className="editor-area">
                      {tab==="preview"&&isImage&&(
                        <div>
                          <img src={files[selected]} style={{imageRendering:"pixelated",border:`1px solid ${BORDER}`,maxWidth:"100%"}} alt={selected}/>
                          <div style={{marginTop:8,fontSize:11,color:DIM}}>Switch to ✏ Paint tab to edit pixels</div>
                        </div>
                      )}
                      {tab==="paint"&&isImage&&<PixelPainter dataUrl={files[selected]} onSave={saveTexture}/>}
                      {tab==="audio"&&isAudio&&<AudioPlayer dataUrl={files[selected]} name={selected.split("/").pop()}/>}
                      {tab==="meta"&&isMeta&&<PackMetaEditor content={files[selected]} onChange={updateContent}/>}
                      {tab==="editor"&&(isJson||isMeta)&&<JsonEditor content={files[selected]} onChange={updateContent}/>}
                      {tab==="editor"&&!isJson&&!isMeta&&!isImage&&!isAudio&&(
                        <textarea className="code" value={files[selected]||""} onChange={e=>updateContent(e.target.value)} spellCheck={false}/>
                      )}
                    </div>
                  </>
                )}
              </div>

              <DependencyDrawer open={drawerOpen} onClose={()=>setDrawerOpen(false)} files={files} textureRefs={textureRefs}/>
            </>
          )}
        </div>

        <div className="status-bar">
          <span>{status}</span>
          {fileCount>0&&<>
            <span><b>{fileCount}</b> files</span>
            <span><b>{textureCount}</b> textures</span>
            {audioCount>0&&<span><b>{audioCount}</b> sounds</span>}
            <span style={{marginLeft:"auto"}}>
              <span className="badge vanilla">vanilla</span> implicit &nbsp;
              <span className="badge linked">linked</span> local ref &nbsp;
              <span className="badge unverified">unverified</span> check name
            </span>
          </>}
        </div>
      </div>
    </>
  );
}

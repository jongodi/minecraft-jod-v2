'use client';

import { useState, useMemo } from 'react';
import { ACCENT, BORDER, BG3, ERR, WARN } from '../rp-constants';
import type { Analysis } from '../rp-analysis';

interface TextureGridProps {
  analysis: Analysis;
  fileData: Record<string, string>;
  onOpenInEditor: (path: string) => void;
  onDeleteTextures?: (paths: string[]) => void;
}

export default function TextureGrid({analysis,fileData,onOpenInEditor,onDeleteTextures}:TextureGridProps){
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

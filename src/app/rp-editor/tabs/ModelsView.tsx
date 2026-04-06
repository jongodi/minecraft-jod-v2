'use client';

import { useState, useMemo, useCallback } from 'react';
import { ACCENT, BORDER, BG3, DIM, ERR, TEXT2, WARN } from '../rp-constants';
import { getTopMatches, findBestMatch } from '../rp-analysis';
import type { Analysis } from '../rp-analysis';

interface ModelRefRowProps {
  refData: {key:string;value:string;status:string;resolvedPath:string|null};
  fileData: Record<string,string>;
  textures: string[];
  onApplyFix: (key:string, value:string) => void;
}

function ModelRefRow({refData,fileData,textures,onApplyFix}:ModelRefRowProps){
  const{key,value,status,resolvedPath}=refData;
  const[fixing,setFixing]=useState(false);
  const[fixVal,setFixVal]=useState('');
  // Only compute top matches when the fix UI is opened
  const topMatches=useMemo(()=>fixing?getTopMatches(value,textures):[],[fixing,value,textures]);
  const dlId=useMemo(()=>'dl-'+key.replace(/\W/g,''),[key]);
  const hintMap:{[k:string]:string}={found:'✓ found in pack',vanilla:'✓ vanilla — uses MC default',broken:'✕ not found anywhere'};
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

interface ModelsViewProps {
  analysis: Analysis;
  fileData: Record<string,string>;
  onApplyFix: (modelPath:string, key:string, value:string) => void;
  onOpenInEditor: (path:string) => void;
}

export default function ModelsView({analysis,fileData,onApplyFix,onOpenInEditor}:ModelsViewProps){
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

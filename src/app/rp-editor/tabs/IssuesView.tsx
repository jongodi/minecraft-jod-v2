'use client';

import { useState, useEffect } from 'react';
import { ACCENT, ACCENT2, BORDER, DIM, ERR, TEXT, TEXT2, WARN } from '../rp-constants';
import { getTopMatches, findBestMatch, yieldToMain } from '../rp-analysis';
import type { Analysis } from '../rp-analysis';

interface IssuesViewProps {
  analysis: Analysis;
  fileData: Record<string,string>;
  onApplyFix: (modelPath:string, key:string, value:string) => void;
  onApplyAllFixes: (fixMap:Record<string,string>) => void;
  onOpenInEditor: (path:string) => void;
}

export default function IssuesView({analysis,fileData,onApplyFix,onApplyAllFixes,onOpenInEditor}:IssuesViewProps){
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

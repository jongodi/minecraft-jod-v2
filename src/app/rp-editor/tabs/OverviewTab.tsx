'use client';

import { ACCENT, ACCENT2, DIM, ERR, TEXT2, WARN } from '../rp-constants';
import type { Analysis } from '../rp-analysis';

interface OverviewTabProps {
  analysis: Analysis;
  fileCount: number;
  setMainTab: (tab: string) => void;
}

export default function OverviewTab({analysis,fileCount,setMainTab}:OverviewTabProps){
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
            {modelsWithIssues} model{modelsWithIssues!==1?'s':''} reference textures that do not exist in this pack and do not match vanilla naming. These will appear as missing (magenta) textures in-game.
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
            These textures exist in the pack but are not referenced by any model and do not follow vanilla naming — they may be unused.
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

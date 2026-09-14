'use client';

import { useState, useRef } from 'react';
import { ACCENT, ACCENT2, BG3, BORDER, DIM, ERR, TEXT, TEXT2, WARN } from '../rp-constants';

interface PackDiffViewProps {
  fileDataA: Record<string,string>;
  filePathsA: string[];
}

export default function PackDiffView({fileDataA,filePathsA}:PackDiffViewProps){
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
            <div style={{fontSize:9,color:DIM,letterSpacing:'3px',textTransform:'uppercase'}}>Pakki A: {filePathsA.length} skrár opnar</div>
            <div style={{fontSize:14,color:TEXT,marginBottom:4}}>Opna pakka til samanburðar (pakki B)</div>
            <div style={{fontSize:11,color:DIM,marginBottom:12}}>Berðu opna pakkann saman við aðra útgáfu til að sjá hvað breyttist.</div>
            <input ref={fileInputRef2} type="file" accept=".zip" style={{display:'none'}} onChange={e=>{const f=e.target.files?.[0];if(f)loadZipB(f);}}/>
            <button className="btn" onClick={()=>fileInputRef2.current?.click()}>{loadingB?'Hleð…':'Velja pakka B (.zip)'}</button>
          </div>
        </div>
      ):(
        <div className="scroll-area">
          <div style={{display:'flex',gap:24,marginBottom:20,flexWrap:'wrap'}}>
            <div style={{fontSize:9,color:DIM,letterSpacing:'2px'}}>PAKKI A: {filePathsA.length} skrár</div>
            <div style={{fontSize:9,color:DIM,letterSpacing:'2px'}}>PAKKI B: {nameB} — {filePathsB.length} skrár</div>
            <button className="btn sm" style={{marginLeft:'auto'}} onClick={()=>{setFileDataB({});setFilePathsB([]);setNameB('');}}>✕ Hreinsa B</button>
          </div>

          {/* Summary */}
          <div style={{display:'flex',gap:8,marginBottom:20,flexWrap:'wrap'}}>
            <div style={{background:ACCENT+'18',border:`1px solid ${ACCENT}44`,padding:'6px 12px',fontSize:10,color:ACCENT}}>{added.length} BÆTT VIÐ</div>
            <div style={{background:ERR+'18',border:`1px solid ${ERR}44`,padding:'6px 12px',fontSize:10,color:ERR}}>{removed.length} FJARLÆGT</div>
            <div style={{background:WARN+'18',border:`1px solid ${WARN}44`,padding:'6px 12px',fontSize:10,color:WARN}}>{modified.length} BREYTT</div>
            <div style={{background:BG3,border:`1px solid ${BORDER}`,padding:'6px 12px',fontSize:10,color:DIM}}>{common.length-modified.length} ÓBREYTT</div>
          </div>

          {added.length>0&&(<>
            <div className="sh" style={{color:ACCENT}}>BÆTT VIÐ Í PAKKA B <span className="cnt">{added.length}</span></div>
            {added.map((p:string)=>(
              <div key={p} style={{display:'flex',alignItems:'center',gap:8,padding:'3px 0',borderBottom:`1px solid ${BORDER}22`}}>
                <span style={{fontSize:10,color:ACCENT}}>+</span>
                <span style={{fontSize:11,color:TEXT2,flex:1}}>{p}</span>
                {/\.(png|jpg|jpeg)$/i.test(p)&&<img src={fileDataB[p]} style={{width:24,height:24,imageRendering:'pixelated',background:'#070910',border:`1px solid ${BORDER}`}} alt=""/>}
              </div>
            ))}
          </>)}

          {removed.length>0&&(<>
            <div className="sh" style={{color:ERR,marginTop:16}}>FJARLÆGT ÚR PAKKA A <span className="cnt">{removed.length}</span></div>
            {removed.map((p:string)=>(
              <div key={p} style={{display:'flex',alignItems:'center',gap:8,padding:'3px 0',borderBottom:`1px solid ${BORDER}22`}}>
                <span style={{fontSize:10,color:ERR}}>−</span>
                <span style={{fontSize:11,color:TEXT2,flex:1}}>{p}</span>
                {/\.(png|jpg|jpeg)$/i.test(p)&&<img src={fileDataA[p]} style={{width:24,height:24,imageRendering:'pixelated',background:'#070910',border:`1px solid ${BORDER}`,opacity:0.5}} alt=""/>}
              </div>
            ))}
          </>)}

          {modified.length>0&&(<>
            <div className="sh" style={{color:WARN,marginTop:16}}>BREYTT <span className="cnt">{modified.length}</span></div>
            {modified.map((p:string)=>{
              const isImg=/\.(png|jpg|jpeg)$/i.test(p);
              return(
                <div key={p} style={{marginBottom:8,borderBottom:`1px solid ${BORDER}22`,paddingBottom:8}}>
                  <div style={{fontSize:11,color:WARN,marginBottom:4}}>{p}</div>
                  {isImg?(
                    <div style={{display:'flex',gap:8,alignItems:'center'}}>
                      <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:2}}>
                        <span style={{fontSize:8,color:DIM,letterSpacing:'1px'}}>PAKKI A</span>
                        <img src={fileDataA[p]} style={{width:48,height:48,imageRendering:'pixelated',background:'#070910',border:`1px solid ${BORDER}`}} alt=""/>
                      </div>
                      <span style={{color:DIM,fontSize:16}}>→</span>
                      <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:2}}>
                        <span style={{fontSize:8,color:DIM,letterSpacing:'1px'}}>PAKKI B</span>
                        <img src={fileDataB[p]} style={{width:48,height:48,imageRendering:'pixelated',background:'#070910',border:`1px solid ${BORDER}`}} alt=""/>
                      </div>
                    </div>
                  ):(
                    <div style={{fontSize:10,color:DIM,fontFamily:'monospace'}}>Efni breytt (JSON/texti)</div>
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

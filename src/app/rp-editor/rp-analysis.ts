'use client';

import { isLikelyVanilla } from './rp-constants';

export function normTexPath(p:string):string{
  return p.replace(/^minecraft:/,'').replace(/^assets\/[^/]+\/textures\//,'').replace(/\.(png|jpg|jpeg)$/i,'').toLowerCase();
}

// Fast O(n) similarity — no Set allocation, used for bulk Fix All suggestions
export function quickSim(a:string,b:string):number{
  if(!a||!b)return 0; if(a===b)return 1;
  const la=a.toLowerCase(),lb=b.toLowerCase();
  if(la===lb)return 1;
  if(la.includes(lb)||lb.includes(la))return 0.8;
  return 0;
}

// Precise bigram similarity — only used for single-item lookups (findBestMatch)
export function strSim(a:string,b:string):number{
  if(a===b)return 1; if(!a.length||!b.length)return 0;
  const la=a.toLowerCase(),lb=b.toLowerCase();
  if(la.includes(lb)||lb.includes(la))return 0.8;
  const bg=(s:string)=>{const r=new Set<string>();for(let i=0;i<s.length-1;i++)r.add(s.slice(i,i+2));return r;};
  const ba=bg(la),bb=bg(lb);let inter=0;ba.forEach(g=>{if(bb.has(g))inter++;});
  const un=ba.size+bb.size-inter;return un===0?0:inter/un;
}

// Uses quickSim — safe to call in bulk (no Set allocations)
export function getTopMatches(brokenRef:string,textures:string[],limit=24):string[]{
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
export function findBestMatch(brokenRef:string,textures:string[]):string|null{
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
export const yieldToMain=()=>new Promise<void>(r=>setTimeout(r,0));

export async function analyzepackAsync(filePaths:string[],fileData:Record<string,string>){
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

export type Analysis = Awaited<ReturnType<typeof analyzepackAsync>>;

// Mechanical source anchoring only. Never invents a quote, changes a semantic
// claim, retries a model, or treats co-occurrence as literary proof.
import {validateCompositionContract} from './composition-contract.mjs';
export function expandSourceContext(raw,poem){
 const rawValidation=validateCompositionContract(raw,poem);
 const result={applied:false,rawValidation,validation:rawValidation,changes:[],reviewRequired:true};
 if(rawValidation.valid||!rawValidation.errors.length||rawValidation.errors.some(e=>!/依据未关联|数量依据未关联/.test(e)))return result;
 const clauses=[...poem.matchAll(/[^，。；！？,;!?]+[，。；！？,;!?]?/g)].map((m,i)=>({id:'c'+(i+1),start:m.index,end:m.index+m[0].length,text:m[0]}));
 const value=structuredClone(raw),entities=new Map(value.entities.map(e=>[e.id,e]));
 const jobs=[];
 for(const [i,r] of value.spatial.entries())jobs.push({path:'spatial['+i+'].evidence',item:r,ids:[r.source,r.target]});
 for(const [i,e] of value.entities.entries())jobs.push({path:'entities['+i+'].quantity.evidence',item:e.quantity,ids:[e.id]});
 for(const [i,g] of value.scene.groups.entries())jobs.push({path:'scene.groups['+i+'].evidence',item:g,ids:g.members});
 for(const [i,s] of value.scene.supports.entries())jobs.push({path:'scene.supports['+i+'].evidence',item:s,ids:[s.entity,...(s.target?[s.target]:[])]});
 for(const [i,a] of value.scene.actions.entries())jobs.push({path:'scene.actions['+i+'].evidence',item:a,ids:[a.entity]});
 for(const job of jobs){
  const q=job.item.evidence;if(!Array.isArray(q)||!q.length||q.some(s=>!poem.includes(s)))continue;
  const needed=job.ids.map(id=>entities.get(id));if(needed.some(e=>!e||e.presence!=='present'||e.role!=='scene'))continue;
  if(needed.every(e=>q.some(s=>e.mentions.some(m=>s.includes(m)))))continue;
  const anchors=clauses.map((c,i)=>q.some(s=>c.text.includes(s))?i:-1).filter(i=>i>=0);
  let match=null;
  for(const i of anchors)for(const [lo,hi] of [[i,i],[i-1,i],[i,i+1]]){
   if(lo<0||hi>=clauses.length)continue;const quote=poem.slice(clauses[lo].start,clauses[hi].end);
   if(!q.every(s=>quote.includes(s))||!needed.every(e=>e.mentions.some(m=>quote.includes(m))))continue;
   if(!match||quote.length<match.quote.length)match={quote,clauses:clauses.slice(lo,hi+1).map(c=>c.id)};
  }
  if(match){result.changes.push({path:job.path,original:[...q],expanded:[match.quote],clauses:match.clauses});job.item.evidence=[match.quote];}
 }
 const validation=validateCompositionContract(value,poem);
 if(result.changes.length&&validation.valid){
  validation.warnings.push('引用范围由程序按同句或相邻原句展开；未改写语义，关联是否合理仍需复核');validation.review_required=true;
  return {...result,applied:true,effectiveAnalysis:value,validation,scope:'source-range-only',note:'仅机械展开原文引用，不证明文学解读正确；原始回答与原始失败保留'};
 }
 return {...result,changes:[]};
}
